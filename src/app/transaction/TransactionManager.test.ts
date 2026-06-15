import { describe, expect, it, vi } from 'vitest'
import {
  CallableUnit,
  TransactionManager,
  UnitCodecRegistry,
  UnitRegistry,
  type ITransactionUnit,
  type OperationResult,
  type TransactionContext,
  type UnitMeta,
  type UnitRecord
} from './index'
import { createId, nowIso } from './utils'

function ctx(): TransactionContext {
  return { resourceId: 'test-doc', services: {} }
}

function meta(label: string, unitType = 'test.counter'): UnitMeta {
  return { label, unitType, createdAt: nowIso() }
}

class CounterUnit implements ITransactionUnit {
  readonly meta: UnitMeta
  constructor(
    label: string,
    private store: { value: number },
    private delta: number,
    private readonly failApply = false
  ) {
    this.meta = meta(label)
  }

  apply(): OperationResult {
    if (this.failApply) return { ok: false, code: 'TX_APPLY_FAILED', message: 'fail' }
    this.store.value += this.delta
    return { ok: true }
  }

  revert(): OperationResult {
    this.store.value -= this.delta
    return { ok: true }
  }

  toRecord(): UnitRecord {
    return {
      unitType: 'test.counter',
      codecId: 'json',
      schemaVersion: 1,
      body: JSON.stringify({ delta: this.delta }),
      meta: this.meta
    }
  }

  tryMerge(previous: ITransactionUnit): ITransactionUnit | null {
    if (!(previous instanceof CounterUnit)) return null
    return new CounterUnit(this.meta.label, this.store, previous.delta + this.delta)
  }
}

function createManager(store: { value: number }) {
  const registry = new UnitRegistry()
  registry.register({
    unitType: 'test.counter',
    create(decoded: unknown) {
      const { delta } = decoded as { delta: number }
      return new CounterUnit('restored', store, delta)
    }
  })
  return new TransactionManager(ctx(), registry, new UnitCodecRegistry())
}

describe('TransactionManager', () => {
  it('T1: record apply failure does not push step', async () => {
    const store = { value: 0 }
    const tx = createManager(store)
    const unit = new CounterUnit('fail', store, 1, true)
    const result = await tx.record(unit)
    expect(result.ok).toBe(false)
    expect(tx.canUndo()).toBe(false)
    expect(store.value).toBe(0)
  })

  it('T5: new record truncates redo branch', async () => {
    const store = { value: 0 }
    const tx = createManager(store)
    await tx.record(new CounterUnit('a', store, 1))
    await tx.record(new CounterUnit('b', store, 1))
    expect(store.value).toBe(2)
    await tx.undo()
    expect(store.value).toBe(0)
    await tx.record(new CounterUnit('c', store, 5))
    expect(store.value).toBe(5)
    expect(tx.canRedo()).toBe(false)
    await tx.undo()
    expect(store.value).toBe(0)
  })

  it('T14: empty stack undo/redo is no-op', async () => {
    const tx = createManager({ value: 0 })
    expect((await tx.undo()).ok).toBe(true)
    expect((await tx.redo()).ok).toBe(true)
  })

  it('T12: merge replaces top unit', async () => {
    const store = { value: 0 }
    const tx = createManager(store)
    await tx.record(new CounterUnit('a', store, 1))
    await tx.record(new CounterUnit('b', store, 2))
    expect(store.value).toBe(3)
    expect(tx.getStack().steps).toHaveLength(1)
    await tx.undo()
    expect(store.value).toBe(0)
  })

  it('T13: markClean and undo dirty state', async () => {
    const store = { value: 0 }
    const tx = createManager(store)
    await tx.record(new CounterUnit('a', store, 1))
    tx.markClean()
    expect(tx.isClean()).toBe(true)
    await tx.undo()
    expect(tx.isClean()).toBe(false)
  })

  it('T2/T3: nested rollback reverts sub-range only', async () => {
    const store = { value: 0 }
    const tx = createManager(store)
    const outer = tx.begin('outer')
    await tx.apply(outer, new CounterUnit('a', store, 1))
    const inner = tx.begin('inner')
    await tx.apply(inner, new CounterUnit('b', store, 10))
    await tx.rollback(inner)
    expect(store.value).toBe(1)
    await tx.commit(outer)
    expect(store.value).toBe(1)
    expect(tx.canUndo()).toBe(true)
  })

  it('T7: setIndex invalid returns TX_INVALID_INDEX', async () => {
    const tx = createManager({ value: 0 })
    const result = await tx.setIndex(99)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('TX_INVALID_INDEX')
  })

  it('T10: dispose rolls back active session', async () => {
    const store = { value: 0 }
    const tx = createManager(store)
    const scope = tx.begin('open')
    await tx.apply(scope, new CounterUnit('a', store, 3))
    tx.dispose()
    expect(store.value).toBe(0)
  })

  it('T11: transparent unit attaches to next step', async () => {
    const store = { value: 0 }
    const tx = createManager(store)
    const transparent = new CallableUnit(
      meta('transparent'),
      () => {
        store.value += 1
        return { ok: true }
      },
      () => {
        store.value -= 1
        return { ok: true }
      },
      { transparent: true }
    )
    await tx.record(transparent)
    expect(tx.canUndo()).toBe(false)
    await tx.record(new CounterUnit('main', store, 5))
    expect(store.value).toBe(6)
    await tx.undo()
    expect(store.value).toBe(0)
  })

  it('T8: importSnapshot skipUnknown', async () => {
    const store = { value: 0 }
    const registry = new UnitRegistry()
    const tx = new TransactionManager(ctx(), registry, new UnitCodecRegistry())
    const snapshot = {
      format: 'wanwu-transaction' as const,
      formatVersion: 1 as const,
      resourceId: 'test-doc',
      index: 0,
      cleanIndex: 0,
      exportedAt: nowIso(),
      steps: [
        {
          id: createId(),
          label: 'x',
          committedAt: nowIso(),
          units: [
            {
              unitType: 'unknown.type',
              codecId: 'json',
              schemaVersion: 1,
              body: '{}',
              meta: meta('u', 'unknown.type')
            }
          ]
        }
      ]
    }
    const result = await tx.importSnapshot(snapshot, { skipUnknown: true })
    expect(result.ok).toBe(true)
    expect(tx.getStack().steps).toHaveLength(1)
    expect(tx.getStack().steps[0]?.units).toHaveLength(0)
  })

  it('export/import roundtrip with autoReplay', async () => {
    const store = { value: 0 }
    const tx = createManager(store)
    await tx.record(new CounterUnit('a', store, 2))
    await tx.record(new CounterUnit('b', store, 3))
    const snap = tx.exportSnapshot()

    const store2 = { value: 0 }
    const tx2 = createManager(store2)
    const imported = await tx2.importSnapshot(snap, { autoReplay: true })
    expect(imported.ok).toBe(true)
    expect(store2.value).toBe(5)
    expect(tx2.canUndo()).toBe(true)
  })

  it('TX_REENTRANT during navigation blocks record', async () => {
    const store = { value: 0 }
    const tx = createManager(store)
    ;(tx as unknown as { navState: string }).navState = 'undoing'
    const result = await tx.record(new CounterUnit('blocked', store, 1))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('TX_REENTRANT')
  })

  it('T15: nested commit only pushes on root commit', async () => {
    const store = { value: 0 }
    const tx = createManager(store)
    const outer = tx.begin('outer')
    await tx.apply(outer, new CounterUnit('a', store, 1))
    const inner = tx.begin('inner')
    await tx.apply(inner, new CounterUnit('b', store, 2))
    await tx.commit(inner)
    expect(tx.canUndo()).toBe(false)
    expect(store.value).toBe(3)
    await tx.commit(outer)
    expect(tx.canUndo()).toBe(true)
    expect(store.value).toBe(3)
    await tx.undo()
    expect(store.value).toBe(0)
  })

  it('T16: runInTransaction commits one step with multiple units', async () => {
    const store = { value: 0 }
    const tx = createManager(store)
    const result = await tx.runInTransaction('combo', async (scope) => {
      await tx.apply(scope, new CounterUnit('a', store, 1))
      await tx.apply(scope, new CounterUnit('b', store, 2))
      return { ok: true as const, data: store.value }
    })
    expect(result.ok).toBe(true)
    expect(store.value).toBe(3)
    expect(tx.getStack().steps).toHaveLength(1)
    await tx.undo()
    expect(store.value).toBe(0)
  })

  it('T17: record during active session defers push until commit', async () => {
    const store = { value: 0 }
    const tx = createManager(store)
    const scope = tx.begin('session')
    await tx.record(new CounterUnit('deferred', store, 5))
    expect(tx.canUndo()).toBe(false)
    expect(store.value).toBe(5)
    await tx.commit(scope)
    expect(tx.canUndo()).toBe(true)
    await tx.undo()
    expect(store.value).toBe(0)
  })

  it('T18: nested runInTransaction shares outer session', async () => {
    const store = { value: 0 }
    const tx = createManager(store)
    const outer = await tx.runInTransaction('outer', async (outerScope) => {
      await tx.apply(outerScope, new CounterUnit('a', store, 1))
      const inner = await tx.runInTransaction('inner', async (innerScope) => {
        await tx.apply(innerScope, new CounterUnit('b', store, 10))
        return { ok: true as const }
      })
      if (!inner.ok) return inner
      return { ok: true as const }
    })
    expect(outer.ok).toBe(true)
    expect(store.value).toBe(11)
    expect(tx.getStack().steps).toHaveLength(1)
    await tx.undo()
    expect(store.value).toBe(0)
  })

  it('onChange emits stack state', async () => {
    const store = { value: 0 }
    const tx = createManager(store)
    const listener = vi.fn()
    tx.onChange(listener)
    await tx.record(new CounterUnit('a', store, 1))
    expect(listener).toHaveBeenCalled()
    const last = listener.mock.calls.at(-1)?.[0]
    expect(last.canUndo).toBe(true)
  })
})
