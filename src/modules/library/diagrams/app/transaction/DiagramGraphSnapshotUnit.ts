import type {
  ITransactionUnit,
  OperationResult,
  TransactionContext,
  UnitMeta,
  UnitRecord
} from '@app/transaction'
import type { LogicFlowDiagramAdapter } from '@modules/library/diagrams/services/LogicFlowDiagramAdapter'
import type { DiagramSelectionIds } from '@modules/library/diagrams/services/diagramGraphLoadCoordinator'
import {
  guardGraphRevert,
  isValidGraphSnapshot
} from '@modules/library/diagrams/app/transaction/diagramGraphSnapshotGuard'
import { cloneForIpc } from '@shared/lib/cloneForIpc'

export class DiagramGraphSnapshotUnit implements ITransactionUnit {
  readonly meta: UnitMeta
  private beforeGraph: unknown = null
  private afterGraph: unknown = null
  private beforeSelection: DiagramSelectionIds = { nodeIds: [], edgeIds: [] }
  private afterSelection: DiagramSelectionIds = { nodeIds: [], edgeIds: [] }

  constructor(
    label: string,
    private readonly getPort: () => LogicFlowDiagramAdapter | null,
    private readonly mutate: () => void | Promise<void>
  ) {
    this.meta = {
      label,
      unitType: 'diagram.graphSnapshot',
      createdAt: new Date().toISOString()
    }
  }

  async apply(_ctx: TransactionContext): Promise<OperationResult> {
    const port = this.getPort()
    if (!port) return { ok: false, code: 'TX_APPLY_FAILED', message: '画布未就绪' }

    this.beforeGraph = cloneForIpc(port.getGraph())
    this.beforeSelection = port.captureSelectionIds()
    if (!isValidGraphSnapshot(this.beforeGraph)) {
      return { ok: false, code: 'TX_APPLY_FAILED', message: '无法捕获画布快照' }
    }

    await this.mutate()

    this.afterGraph = cloneForIpc(port.getGraph())
    this.afterSelection = port.captureSelectionIds()
    if (!isValidGraphSnapshot(this.afterGraph)) {
      return { ok: false, code: 'TX_APPLY_FAILED', message: '变更后画布快照无效' }
    }

    return { ok: true }
  }

  revert(_ctx: TransactionContext): OperationResult {
    return this.loadSnapshot(this.beforeGraph, this.beforeSelection, 'revert')
  }

  reapply(_ctx: TransactionContext): OperationResult {
    return this.loadSnapshot(this.afterGraph, this.afterSelection, 'reapply')
  }

  toRecord(): UnitRecord {
    const err = new Error('DiagramGraphSnapshotUnit cannot be serialized') as Error & { code: string }
    err.code = 'TX_NOT_SERIALIZABLE'
    throw err
  }

  private loadSnapshot(
    graph: unknown,
    selection: DiagramSelectionIds,
    phase: 'revert' | 'reapply'
  ): OperationResult {
    const port = this.getPort()
    if (!port || graph == null) {
      return { ok: false, code: 'TX_REVERT_FAILED', message: '无法恢复画布快照' }
    }
    if (!isValidGraphSnapshot(graph)) {
      return {
        ok: false,
        code: 'TX_REVERT_FAILED',
        message: phase === 'revert' ? '无效快照，撤销已取消' : '无效快照，重做已取消'
      }
    }
    const guard = guardGraphRevert(port.getGraph(), graph, phase)
    if (guard) return guard
    port.loadGraphForUndoRedo(cloneForIpc(graph), selection)
    return { ok: true }
  }
}

export function createGraphSnapshotUnit(
  label: string,
  getPort: () => LogicFlowDiagramAdapter | null,
  mutate: () => void | Promise<void>
): DiagramGraphSnapshotUnit {
  return new DiagramGraphSnapshotUnit(label, getPort, mutate)
}
