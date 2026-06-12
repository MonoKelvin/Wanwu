import { targetNodeInfo } from '@logicflow/core'
import type { GraphModel } from '@logicflow/core'
import { isGroupFrameType } from '@modules/library/diagrams/lib/diagramGroupFrame'

/** 将松手时的 pointer 转为画布坐标（与 LogicFlow getPointByClient 一致） */
export function resolveDiagramAdjustDropCanvasPoint(
  graphModel: GraphModel,
  fallback: { x: number; y: number },
  event?: PointerEvent
): { x: number; y: number } {
  if (event && Number.isFinite(event.clientX) && Number.isFinite(event.clientY)) {
    return graphModel.getPointByClient({ x: event.clientX, y: event.clientY }).canvasOverlayPosition
  }
  return fallback
}

/** 端点拖拽松手时的目标图形；组合框不算有效连接目标 */
export function resolveDiagramAdjustDropTarget(
  graphModel: GraphModel,
  position: { x: number; y: number }
) {
  const info = targetNodeInfo(position, graphModel)
  if (!info?.node || isGroupFrameType(info.node.type)) return undefined
  return info
}
