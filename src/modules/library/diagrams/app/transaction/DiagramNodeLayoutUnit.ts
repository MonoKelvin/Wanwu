import type {
  ITransactionUnit,
  OperationResult,
  TransactionContext,
  UnitMeta,
  UnitRecord
} from '@app/transaction'
import type LogicFlow from '@logicflow/core'
import {
  applyNodeLayoutProperties,
  finalizeNodeLayoutChange,
  roundNodeTopLeft,
  type DiagramNodeLayoutPatch
} from '@modules/library/diagrams/lib/diagramNodeLayoutPatch'
import type { LogicFlowDiagramAdapter } from '@modules/library/diagrams/services/LogicFlowDiagramAdapter'

export interface DiagramNodeLayoutBody {
  nodeId: string
  before: DiagramNodeLayoutPatch
  after?: DiagramNodeLayoutPatch
  nodeProps?: Record<string, unknown>
}

export function captureNodeLayoutPatch(
  lf: LogicFlow,
  nodeId: string
): DiagramNodeLayoutPatch | null {
  const model = lf.getNodeModelById(nodeId)
  if (!model) return null
  const { left, top } = roundNodeTopLeft(model.x, model.y, model.width, model.height)
  return {
    x: model.x,
    y: model.y,
    left,
    top,
    width: Math.round(model.width),
    height: Math.round(model.height)
  }
}

export class DiagramNodeLayoutUnit implements ITransactionUnit {
  readonly meta: UnitMeta
  private afterCache?: DiagramNodeLayoutPatch

  constructor(
    private readonly body: DiagramNodeLayoutBody,
    private readonly getPort: () => LogicFlowDiagramAdapter | null
  ) {
    this.meta = {
      label: '改节点布局',
      unitType: 'diagram.nodeLayout',
      createdAt: new Date().toISOString()
    }
  }

  apply(_ctx: TransactionContext): OperationResult {
    const port = this.getPort()
    if (!port) return { ok: false, code: 'TX_APPLY_FAILED', message: '画布未就绪' }

    if (this.body.after) {
      return this.applyPatch(this.body.after)
    }

    if (this.body.nodeProps) {
      port.updateNodeProperties({
        id: this.body.nodeId,
        ...this.body.nodeProps
      })
      const lf = port.getLogicFlow()
      if (lf) {
        this.afterCache = captureNodeLayoutPatch(lf, this.body.nodeId) ?? undefined
      }
      return { ok: true }
    }

    return { ok: true }
  }

  revert(_ctx: TransactionContext): OperationResult {
    return this.applyPatch(this.body.before)
  }

  reapply(_ctx: TransactionContext): OperationResult {
    const after = this.body.after ?? this.afterCache
    if (!after) return { ok: false, code: 'TX_APPLY_FAILED', message: '缺少布局快照' }
    return this.applyPatch(after)
  }

  tryMerge(previous: ITransactionUnit): ITransactionUnit | null {
    if (!(previous instanceof DiagramNodeLayoutUnit)) return null
    if (previous.body.nodeId !== this.body.nodeId) return null
    const after = this.body.after ?? this.afterCache
    return new DiagramNodeLayoutUnit(
      {
        nodeId: this.body.nodeId,
        before: previous.body.before,
        after: after ?? previous.body.after ?? previous.afterCache
      },
      this.getPort
    )
  }

  toRecord(): UnitRecord {
    return {
      unitType: 'diagram.nodeLayout',
      codecId: 'json',
      schemaVersion: 1,
      body: JSON.stringify({
        ...this.body,
        after: this.body.after ?? this.afterCache
      }),
      meta: this.meta
    }
  }

  private applyPatch(patch: DiagramNodeLayoutPatch): OperationResult {
    const port = this.getPort()
    const lf = port?.getLogicFlow() ?? null
    if (!lf) return { ok: false, code: 'TX_APPLY_FAILED', message: '画布未就绪' }
    const model = lf.getNodeModelById(this.body.nodeId)
    if (!model) return { ok: false, code: 'TX_APPLY_FAILED', message: '节点不存在' }

    const mutate = () => {
      applyNodeLayoutProperties(lf, model, patch)
      finalizeNodeLayoutChange(lf, [this.body.nodeId])
      port?.refreshAfterLayoutChange()
    }

    if (port) {
      if (port.isUndoRedoRestoreActive()) mutate()
      else port.withUndoRedoRestore(mutate)
    } else mutate()
    return { ok: true }
  }
}

export function createDiagramNodeLayoutUnitFactory(getPort: () => LogicFlowDiagramAdapter | null) {
  return {
    unitType: 'diagram.nodeLayout',
    create(decoded: unknown) {
      return new DiagramNodeLayoutUnit(decoded as DiagramNodeLayoutBody, getPort)
    }
  }
}

export function isLayoutNodeProps(props: Record<string, unknown>): boolean {
  return (
    props.left != null ||
    props.top != null ||
    props.width != null ||
    props.height != null ||
    props.x != null ||
    props.y != null
  )
}

export function createNodeLayoutUnit(
  port: LogicFlowDiagramAdapter,
  nodeId: string,
  before: DiagramNodeLayoutPatch,
  nodeProps: Record<string, unknown>
): DiagramNodeLayoutUnit {
  return new DiagramNodeLayoutUnit({ nodeId, before, nodeProps }, () => port)
}
