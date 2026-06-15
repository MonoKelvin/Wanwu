import type { DiagramCommandExecutionContext } from '@modules/library/diagrams/app/command/DiagramAppCommand'
import type { DiagramCommandResult } from '@modules/library/diagrams/app/command/domain/types'
import { diagramError } from '@modules/library/diagrams/app/diagramCommandErrors'
import type { DiagramCanvasTransactionContext } from '@modules/library/diagrams/app/transaction/canvasTransaction'
import {
  applyCanvasMutation,
  runCanvasCommandTransaction
} from '@modules/library/diagrams/app/transaction/canvasTransaction'
import type { DiagramNodeLayoutPatch } from '@modules/library/diagrams/lib/diagramNodeLayoutPatch'
import type { LogicFlowDiagramAdapter } from '@modules/library/diagrams/services/LogicFlowDiagramAdapter'

export function isCanvasContext(
  value: DiagramCanvasTransactionContext | DiagramCommandResult
): value is DiagramCanvasTransactionContext {
  return 'port' in value
}

export function requireCanvas(
  ctx: DiagramCommandExecutionContext
): DiagramCanvasTransactionContext | DiagramCommandResult {
  if (!ctx.session) return diagramError('NO_SESSION', '无活跃编辑器会话')
  if (!ctx.port) return diagramError('NO_SESSION', '画布未就绪')
  return {
    session: ctx.session,
    port: ctx.port as LogicFlowDiagramAdapter,
    tx: ctx.tx
  }
}

/** 文档画布变更：开启事务 → mutate → 提交（供 Document.* 变更命令直接调用） */
export async function runDocumentMutation(
  ctx: DiagramCommandExecutionContext,
  label: string,
  mutate: (canvas: DiagramCanvasTransactionContext) => void | Promise<void>,
  options?: {
    nodeId?: string
    nodeProps?: Record<string, unknown>
    layoutBefore?: DiagramNodeLayoutPatch | null
  }): Promise<DiagramCommandResult> {
  const canvas = requireCanvas(ctx)
  if (!isCanvasContext(canvas)) return canvas
  return runCanvasCommandTransaction(canvas, label, async (applyUnit) =>
    applyCanvasMutation(canvas, label, applyUnit, () => mutate(canvas), options)
  )
}
