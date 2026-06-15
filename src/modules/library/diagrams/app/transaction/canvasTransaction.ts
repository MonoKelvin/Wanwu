/**
 * 画布事务辅助：属性改布局用 DiagramNodeLayoutUnit，结构性变更用 DiagramGraphSnapshotUnit。
 * runDocumentMutation 按 patch 类型自动选择单元，命令层通过 runDiagramCommandTransaction 提交。
 */
import type { ITransactionUnit, OperationResult, TransactionContext, TransactionManager } from '@app/transaction'
import type { DiagramEditorSession } from '@modules/library/diagrams/app/DiagramEditorSession'
import { diagramError } from '@modules/library/diagrams/app/diagramCommandErrors'
import type { DiagramCommandResult } from '@modules/library/diagrams/app/command/domain/types'
import type { LogicFlowDiagramAdapter } from '@modules/library/diagrams/services/LogicFlowDiagramAdapter'
import type { DiagramNodeLayoutPatch } from '@modules/library/diagrams/lib/diagramNodeLayoutPatch'
import {
  createNodeLayoutUnit,
  isLayoutNodeProps
} from '@modules/library/diagrams/app/transaction/DiagramNodeLayoutUnit'
import { createGraphSnapshotUnit } from '@modules/library/diagrams/app/transaction/DiagramGraphSnapshotUnit'

export interface DiagramCanvasTransactionContext {
  session: DiagramEditorSession
  port: LogicFlowDiagramAdapter
  tx: TransactionManager | null | undefined
}

export type DiagramApplyUnit = (unit: ITransactionUnit) => Promise<OperationResult>

const EPHEMERAL_TX_CTX: TransactionContext = { resourceId: 'diagram:ephemeral', services: {} }

export async function runDiagramCommandTransaction(
  tx: TransactionManager | null | undefined,
  label: string,
  run: (applyUnit: DiagramApplyUnit) => Promise<DiagramCommandResult>
): Promise<DiagramCommandResult> {
  if (!tx) {
    const directApply: DiagramApplyUnit = async (unit) => unit.apply(EPHEMERAL_TX_CTX)
    return run(directApply)
  }

  const result = await tx.runInTransaction(label, async (scope) => {
    const applyUnit: DiagramApplyUnit = (unit) => tx.apply(scope, unit)
    const cmdResult = await run(applyUnit)
    if (!cmdResult.ok) {
      return { ok: false as const, code: cmdResult.code, message: cmdResult.message }
    }
    return { ok: true as const, data: cmdResult.data }
  })

  if (!result.ok) {
    return diagramError('INTERNAL', result.message)
  }
  return { ok: true, data: result.data }
}

export async function runCanvasCommandTransaction(
  ctx: DiagramCanvasTransactionContext,
  label: string,
  run: (applyUnit: DiagramApplyUnit) => Promise<DiagramCommandResult>
): Promise<DiagramCommandResult> {
  const result = await runDiagramCommandTransaction(ctx.tx, label, run)
  if (result.ok) ctx.session.markActivePageDirty()
  return result
}

/** 优先布局单元（可 merge）；否则整图快照单元 */
export async function applyCanvasMutation(
  ctx: DiagramCanvasTransactionContext,
  label: string,
  applyUnit: DiagramApplyUnit,
  mutate: () => void | Promise<void>,
  options?: {
    nodeId?: string
    nodeProps?: Record<string, unknown>
    layoutBefore?: DiagramNodeLayoutPatch | null
  }): Promise<DiagramCommandResult> {
  const { port } = ctx

  if (
    options?.nodeId &&
    options.nodeProps &&
    options.layoutBefore &&
    isLayoutNodeProps(options.nodeProps)
  ) {
    const unit = createNodeLayoutUnit(port, options.nodeId, options.layoutBefore, options.nodeProps)
    const applied = await applyUnit(unit)
    if (!applied.ok) return { ok: false, code: 'INTERNAL', message: applied.message }
    return { ok: true }
  }

  const unit = createGraphSnapshotUnit(label, () => port, mutate)
  const applied = await applyUnit(unit)
  if (!applied.ok) return { ok: false, code: 'INTERNAL', message: applied.message }
  return { ok: true }
}
