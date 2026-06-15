import { UnitCodecRegistry } from '../codec/UnitCodecRegistry'
import type {
  ImportOptions,
  ITransactionUnit,
  OperationResult,
  StepRecord,
  TransactionChangeEvent,
  TransactionContext,
  TransactionSnapshot,
  TransactionStackSnapshot,
  TransactionStep
} from '../domain/types'
import { txFail, txOk } from '../domain/types'
import { AsyncMutex } from '../AsyncMutex'
import { createId, nowIso } from '../utils'
import type { TransactionManagerOptions } from './TransactionManagerOptions'
import { ActiveTransaction } from './ActiveTransaction'
import type { TransactionScope } from './ActiveTransaction'
import { MutableTransactionStack } from './MutableTransactionStack'
import { UnitRegistry } from '../codec/UnitRegistry'
import { JsonSnapshotCodec } from '../codec/JsonSnapshotCodec'

type NavState = 'idle' | 'undoing' | 'redoing' | 'jumping'

export class TransactionManager {
  private readonly stack = new MutableTransactionStack()
  private readonly mutex = new AsyncMutex()
  private readonly options: Required<TransactionManagerOptions>
  private readonly snapshotCodec = new JsonSnapshotCodec()
  private active: ActiveTransaction | null = null
  private navState: NavState = 'idle'
  private transparentBuffer: ITransactionUnit[] = []
  private readonly listeners = new Set<(e: TransactionChangeEvent) => void>()
  private disposed = false

  constructor(
    private readonly ctx: TransactionContext,
    private readonly unitRegistry: UnitRegistry,
    private readonly unitCodecRegistry: UnitCodecRegistry,
    options?: TransactionManagerOptions
  ) {
    this.options = {
      maxSteps: options?.maxSteps ?? 500,
      evictionPolicy: options?.evictionPolicy ?? 'drop-oldest',
      enableMerge: options?.enableMerge ?? true,
      nestMode: options?.nestMode ?? 'flat',
      allowSetIndex: options?.allowSetIndex ?? true
    }
  }

  begin(label: string, groupId?: string | number): TransactionScope {
    this.assertNotDisposed()
    if (this.active) {
      const parentScopeId = this.active.currentScopeId
      const parent = this.active.getScope(parentScopeId)
      const depth = (parent?.scope.depth ?? 0) + 1
      const scope: TransactionScope = {
        id: createId(),
        sessionId: this.active.sessionId,
        label,
        groupId,
        startUnitIndex: this.active.allUnits().length,
        depth,
        parentScopeId,
        isRoot: false
      }
      this.active.scopes.set(scope.id, { scope, units: [] })
      this.active.currentScopeId = scope.id
      return scope
    }

    const scopeId = createId()
    const scope: TransactionScope = {
      id: scopeId,
      sessionId: scopeId,
      label,
      groupId,
      startUnitIndex: 0,
      depth: 0,
      parentScopeId: null,
      isRoot: true
    }
    this.active = new ActiveTransaction(scopeId, scope, scopeId)
    return scope
  }

  hasActiveSession(): boolean {
    return this.active !== null
  }

  getRootScope(): TransactionScope | null {
    return this.active?.getRootScope() ?? null
  }

  async runInTransaction<T>(
    label: string,
    fn: (scope: TransactionScope) => Promise<OperationResult<T>>
  ): Promise<OperationResult<T>> {
    const ownsSession = !this.hasActiveSession()
    const scope = ownsSession ? this.begin(label) : this.getRootScope()!
    if (!scope) return txFail('TX_ACTIVE_SESSION', 'No active session') as OperationResult<T>

    try {
      const result = await fn(scope)
      if (!result.ok) {
        if (ownsSession) await this.rollback(scope)
        return result
      }
      if (ownsSession) {
        const committed = await this.commit(scope)
        if (!committed.ok) return committed as OperationResult<T>
      }
      return result
    } catch (err) {
      if (ownsSession) await this.rollback(scope)
      return txFail('TX_COMMIT_FAILED', err instanceof Error ? err.message : String(err)) as OperationResult<T>
    }
  }

  apply(scope: TransactionScope, unit: ITransactionUnit): Promise<OperationResult> {
    return this.mutex.run(() => this.applyInternal(scope, unit))
  }

  private async applyInternal(scope: TransactionScope, unit: ITransactionUnit): Promise<OperationResult> {
    this.assertNotDisposed()
    if (this.navState !== 'idle') return txFail('TX_REENTRANT', 'Navigation in progress')
    if (!this.active) return txFail('TX_ACTIVE_SESSION', 'No active session')
    if (!this.active.validateScope(scope)) {
      return txFail('TX_ACTIVE_SESSION', 'Scope does not belong to active session')
    }

    const state = this.active.getScope(scope.id)
    if (!state) return txFail('TX_ACTIVE_SESSION', 'Invalid scope')

    const result = await unit.apply(this.ctx)
    if (!result.ok) return result

    if (unit.recordable === false) return txOk()

    const root = this.active.getScope(this.active.rootScopeId)
    if (!root) return txFail('TX_ACTIVE_SESSION', 'No root scope')
    root.units.push(unit)
    return txOk()
  }

  commit(scope: TransactionScope): Promise<OperationResult> {
    return this.mutex.run(async () => {
      this.assertNotDisposed()
      if (this.navState !== 'idle') return txFail('TX_REENTRANT', 'Navigation in progress')
      if (!this.active) return txFail('TX_ACTIVE_SESSION', 'No active session')

      const root = this.active.getScope(this.active.rootScopeId)
      if (!root) return txFail('TX_ACTIVE_SESSION', 'No root scope')

      const isRoot = scope.isRoot && scope.id === this.active.rootScopeId
      if (!isRoot) {
        this.active.scopes.delete(scope.id)
        if (this.active.currentScopeId === scope.id) {
          this.active.currentScopeId = scope.parentScopeId ?? this.active.rootScopeId
        }
        return txOk()
      }

      const units = [...root.units]
      if (units.length === 0) {
        this.active = null
        return txOk()
      }

      const step = this.buildStep(scope.label, units, scope.groupId)
      const pushResult = await this.pushStepInternal(step)
      if (!pushResult.ok) {
        await this.revertUnits(units)
        this.active = null
        return txFail('TX_COMMIT_FAILED', pushResult.message)
      }

      this.active = null
      this.emitChange()
      return txOk()
    })
  }

  rollback(scope: TransactionScope): Promise<OperationResult> {
    return this.mutex.run(async () => {
      this.assertNotDisposed()
      if (this.navState !== 'idle') return txFail('TX_REENTRANT', 'Navigation in progress')
      if (!this.active) return txFail('TX_ACTIVE_SESSION', 'No active session')
      if (!this.active.validateScope(scope)) {
        return txFail('TX_ACTIVE_SESSION', 'Scope does not belong to active session')
      }

      const state = this.active.getScope(scope.id)
      if (!state) return txFail('TX_ACTIVE_SESSION', 'Invalid scope')

      const root = this.active.getScope(this.active.rootScopeId)
      if (!root) return txFail('TX_ACTIVE_SESSION', 'No root scope')

      const start = state.scope.startUnitIndex
      const unitsToRevert = root.units.slice(start).reverse()
      for (const unit of unitsToRevert) {
        const result = await unit.revert(this.ctx)
        if (!result.ok) return txFail('TX_ROLLBACK_FAILED', result.message)
      }
      root.units.length = start

      this.active.scopes.delete(scope.id)
      if (this.active.currentScopeId === scope.id) {
        this.active.currentScopeId = scope.parentScopeId ?? this.active.rootScopeId
      }

      if (scope.isRoot && scope.id === this.active.rootScopeId) {
        this.active = null
      }

      this.emitChange()
      return txOk()
    })
  }

  record(unit: ITransactionUnit): Promise<OperationResult> {
    return this.mutex.run(async () => {
      this.assertNotDisposed()
      if (this.navState !== 'idle') return txFail('TX_REENTRANT', 'Navigation in progress')

      if (this.active) {
        const rootScope = this.active.getRootScope()
        if (!rootScope) return txFail('TX_ACTIVE_SESSION', 'No root scope')
        return this.applyInternal(rootScope, unit)
      }

      const result = await unit.apply(this.ctx)
      if (!result.ok) return result
      if (unit.recordable === false) return txOk()

      if (unit.transparent) {
        this.transparentBuffer.push(unit)
        this.emitChange()
        return txOk()
      }

      const units = [...this.transparentBuffer, unit]
      this.transparentBuffer = []

      const step = this.buildStep(unit.meta.label, units)
      const pushResult = await this.pushStepInternal(step)
      if (!pushResult.ok) {
        await this.revertUnits(units)
        return pushResult
      }

      this.emitChange()
      return txOk()
    })
  }

  undo(): Promise<OperationResult> {
    return this.mutex.run(async () => this.navigateUndo())
  }

  redo(): Promise<OperationResult> {
    return this.mutex.run(async () => this.navigateRedo())
  }

  canUndo(): boolean {
    return this.stack.canUndo()
  }

  canRedo(): boolean {
    return this.stack.canRedo()
  }

  undoLabel(): string | null {
    return this.stack.undoLabel()
  }

  redoLabel(): string | null {
    return this.stack.redoLabel()
  }

  getStack(): Readonly<TransactionStackSnapshot> {
    return { steps: [...this.stack.steps], index: this.stack.index }
  }

  markClean(): void {
    this.stack.cleanIndex = this.stack.index
    this.emitChange()
  }

  isClean(): boolean {
    return this.stack.isClean()
  }

  clear(): void {
    this.stack.clear()
    this.transparentBuffer = []
    this.active = null
    this.emitChange()
  }

  isUndoInProgress(): boolean {
    return this.navState === 'undoing'
  }

  isRedoInProgress(): boolean {
    return this.navState === 'redoing'
  }

  setIndex(targetIndex: number): Promise<OperationResult> {
    return this.mutex.run(async () => {
      this.assertNotDisposed()
      if (!this.options.allowSetIndex) {
        return txFail('TX_INVALID_INDEX', 'setIndex disabled')
      }
      if (targetIndex < 0 || targetIndex > this.stack.steps.length) {
        return txFail('TX_INVALID_INDEX', `Invalid index: ${targetIndex}`)
      }
      if (this.navState !== 'idle') return txFail('TX_REENTRANT', 'Navigation in progress')

      this.navState = 'jumping'
      const startIndex = this.stack.index
      try {
        if (targetIndex < startIndex) {
          for (let i = startIndex; i > targetIndex; i -= 1) {
            const step = this.stack.steps[i - 1]
            if (!step) break
            const result = await this.revertStep(step)
            if (!result.ok) return txFail('TX_UNDO_FAILED', result.message)
            this.stack.index -= 1
          }
        } else if (targetIndex > startIndex) {
          for (let i = startIndex; i < targetIndex; i += 1) {
            const step = this.stack.steps[i]
            if (!step) break
            const result = await this.reapplyStep(step)
            if (!result.ok) return txFail('TX_REDO_FAILED', result.message)
            this.stack.index += 1
          }
        }
        this.emitChange()
        return txOk()
      } finally {
        this.navState = 'idle'
      }
    })
  }

  exportSnapshot(): TransactionSnapshot {
    const steps: StepRecord[] = this.stack.steps.map((step) => ({
      id: step.id,
      label: step.label,
      committedAt: step.committedAt,
      units: step.units.map((u) => u.toRecord()),
      visibility: step.visibility,
      groupId: step.groupId
    }))

    return {
      format: 'wanwu-transaction',
      formatVersion: 1,
      resourceId: this.ctx.resourceId,
      index: this.stack.index,
      cleanIndex: this.stack.cleanIndex,
      exportedAt: nowIso(),
      steps
    }
  }

  importSnapshot(snapshot: TransactionSnapshot, options?: ImportOptions): Promise<OperationResult> {
    return this.mutex.run(async () => {
      this.assertNotDisposed()
      if (snapshot.resourceId !== this.ctx.resourceId) {
        return txFail('TX_REHYDRATE_FAILED', 'resourceId mismatch')
      }

      const previousStack = { ...this.stack, steps: [...this.stack.steps] }
      const previousIndex = this.stack.index

      try {
        const steps: TransactionStep[] = []
        for (const stepRecord of snapshot.steps) {
          const units: ITransactionUnit[] = []
          for (const unitRecord of stepRecord.units) {
            try {
              const body = this.unitCodecRegistry.decode(unitRecord.codecId, unitRecord.body)
              units.push(this.unitRegistry.createFromRecord(unitRecord, body))
            } catch (err) {
              if (options?.skipUnknown) continue
              throw err
            }
          }
          steps.push({
            id: stepRecord.id,
            label: stepRecord.label,
            committedAt: stepRecord.committedAt,
            units,
            visibility: stepRecord.visibility,
            groupId: stepRecord.groupId
          })
        }

        this.stack.steps = steps
        this.stack.index = 0
        this.stack.cleanIndex = snapshot.cleanIndex

        if (options?.autoReplay) {
          const replayResult = await this.replayTo(snapshot.index)
          if (!replayResult.ok) throw new Error(replayResult.message)
        } else {
          this.stack.index = Math.min(snapshot.index, steps.length)
        }

        this.emitChange()
        return txOk()
      } catch (err) {
        this.stack.steps = previousStack.steps
        this.stack.index = previousIndex
        this.stack.clear()
        return txFail('TX_REHYDRATE_FAILED', String(err))
      }
    })
  }

  onChange(listener: (e: TransactionChangeEvent) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    if (this.active) {
      void this.rollbackActiveSession()
    }
    this.listeners.clear()
  }

  private async rollbackActiveSession(): Promise<void> {
    if (!this.active) return
    const root = this.active.getScope(this.active.rootScopeId)
    if (!root) return
    const units = [...root.units].reverse()
    for (const unit of units) {
      await unit.revert(this.ctx)
    }
    this.active = null
  }

  private buildStep(
    label: string,
    units: ITransactionUnit[],
    groupId?: string | number
  ): TransactionStep {
    return {
      id: createId(),
      label,
      committedAt: nowIso(),
      units,
      visibility: 'normal',
      groupId
    }
  }

  private async pushStepInternal(step: TransactionStep): Promise<OperationResult> {
    if (this.options.enableMerge && this.stack.index > 0) {
      const top = this.stack.steps[this.stack.index - 1]
      const lastUnit = top?.units[top.units.length - 1]
      const newUnit = step.units[step.units.length - 1]
      if (top && lastUnit && newUnit?.tryMerge) {
        const merged = newUnit.tryMerge(lastUnit)
        if (merged) {
          const nextUnits = [...top.units.slice(0, -1), merged]
          this.stack.steps[this.stack.index - 1] = { ...top, units: nextUnits }
          this.evictIfNeeded()
          return txOk()
        }
      }
    }

    this.stack.pushStep(step)
    this.evictIfNeeded()
    return txOk()
  }

  private evictIfNeeded(): void {
    const max = this.options.maxSteps
    if (max <= 0) return
    while (this.stack.steps.length > max) {
      this.stack.steps.shift()
      this.stack.index = Math.max(0, this.stack.index - 1)
      this.stack.cleanIndex = Math.max(0, this.stack.cleanIndex - 1)
    }
  }

  private async navigateUndo(): Promise<OperationResult> {
    if (!this.stack.canUndo()) return txOk()
    if (this.navState !== 'idle') return txFail('TX_REENTRANT', 'Navigation in progress')

    this.navState = 'undoing'
    try {
      const step = this.stack.steps[this.stack.index - 1]
      if (!step) return txOk()
      const result = await this.revertStep(step)
      if (!result.ok) return txFail('TX_UNDO_FAILED', result.message)
      this.stack.index -= 1
      this.emitChange()
      return txOk()
    } finally {
      this.navState = 'idle'
    }
  }

  private async navigateRedo(): Promise<OperationResult> {
    if (!this.stack.canRedo()) return txOk()
    if (this.navState !== 'idle') return txFail('TX_REENTRANT', 'Navigation in progress')

    this.navState = 'redoing'
    try {
      const step = this.stack.steps[this.stack.index]
      if (!step) return txOk()
      const result = await this.reapplyStep(step)
      if (!result.ok) return txFail('TX_REDO_FAILED', result.message)
      this.stack.index += 1
      this.emitChange()
      return txOk()
    } finally {
      this.navState = 'idle'
    }
  }

  private async revertStep(step: TransactionStep): Promise<OperationResult> {
    const reapplied: ITransactionUnit[] = []
    for (let i = step.units.length - 1; i >= 0; i -= 1) {
      const unit = step.units[i]!
      const result = await unit.revert(this.ctx)
      if (!result.ok) {
        for (const u of reapplied) {
          const fn = u.reapply ?? u.apply
          await fn.call(u, this.ctx)
        }
        return result
      }
      reapplied.push(unit)
    }
    return txOk()
  }

  private async reapplyStep(step: TransactionStep): Promise<OperationResult> {
    for (const unit of step.units) {
      const fn = unit.reapply ?? unit.apply
      const result = await fn.call(unit, this.ctx)
      if (!result.ok) return result
    }
    return txOk()
  }

  private async revertUnits(units: readonly ITransactionUnit[]): Promise<void> {
    for (let i = units.length - 1; i >= 0; i -= 1) {
      await units[i]!.revert(this.ctx)
    }
  }

  private async replayTo(targetIndex: number): Promise<OperationResult> {
    for (let i = 0; i < targetIndex; i += 1) {
      const step = this.stack.steps[i]
      if (!step) break
      const result = await this.reapplyStep(step)
      if (!result.ok) return result
      this.stack.index = i + 1
    }
    return txOk()
  }

  private emitChange(): void {
    const event: TransactionChangeEvent = {
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
      undoLabel: this.undoLabel(),
      redoLabel: this.redoLabel(),
      stepCount: this.stack.steps.length,
      index: this.stack.index,
      isClean: this.isClean()
    }
    for (const listener of this.listeners) listener(event)
  }

  private assertNotDisposed(): void {
    if (this.disposed) throw new Error('TransactionManager disposed')
  }
}
