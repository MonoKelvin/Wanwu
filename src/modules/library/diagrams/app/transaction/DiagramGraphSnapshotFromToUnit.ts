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

/** 已知 before/after 的整图单元（拖拽等）；apply 为 no-op，画布已在 after 状态 */
export class DiagramGraphSnapshotFromToUnit implements ITransactionUnit {
  readonly meta: UnitMeta

  constructor(
    label: string,
    private readonly getPort: () => LogicFlowDiagramAdapter | null,
    private readonly beforeGraph: unknown,
    private readonly afterGraph: unknown,
    private readonly beforeSelection: DiagramSelectionIds,
    private readonly afterSelection: DiagramSelectionIds
  ) {
    this.meta = {
      label,
      unitType: 'diagram.graphSnapshot.fromTo',
      createdAt: new Date().toISOString()
    }
  }

  apply(_ctx: TransactionContext): OperationResult {
    return { ok: true }
  }

  revert(_ctx: TransactionContext): OperationResult {
    return this.loadSnapshot(this.beforeGraph, this.beforeSelection, 'revert')
  }

  reapply(_ctx: TransactionContext): OperationResult {
    return this.loadSnapshot(this.afterGraph, this.afterSelection, 'reapply')
  }

  toRecord(): UnitRecord {
    const err = new Error('DiagramGraphSnapshotFromToUnit cannot be serialized') as Error & {
      code: string
    }
    err.code = 'TX_NOT_SERIALIZABLE'
    throw err
  }

  private loadSnapshot(
    graph: unknown,
    selection: DiagramSelectionIds,
    phase: 'revert' | 'reapply'
  ): OperationResult {
    const port = this.getPort()
    if (!port) return { ok: false, code: 'TX_APPLY_FAILED', message: '画布未就绪' }
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

export function createGraphSnapshotFromToUnit(
  label: string,
  getPort: () => LogicFlowDiagramAdapter | null,
  beforeGraph: unknown,
  afterGraph: unknown,
  beforeSelection: DiagramSelectionIds,
  afterSelection: DiagramSelectionIds
): DiagramGraphSnapshotFromToUnit {
  return new DiagramGraphSnapshotFromToUnit(
    label,
    getPort,
    beforeGraph,
    afterGraph,
    beforeSelection,
    afterSelection
  )
}

export function graphDataEqual(a: unknown, b: unknown): boolean {
  try {
    return JSON.stringify(a) === JSON.stringify(b)
  } catch {
    return false
  }
}
