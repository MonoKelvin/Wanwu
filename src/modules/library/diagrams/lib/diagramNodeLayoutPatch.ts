import type LogicFlow from '@logicflow/core'
import type { BaseNodeModel } from '@logicflow/core'
import { applyNodeDimensions } from '@modules/library/diagrams/lib/diagramShapeResize'
import { syncNodeTextLayout } from '@modules/library/diagrams/lib/diagramStyleBridge'

export type DiagramNodeLayoutPatch = {
  x?: number
  y?: number
  width?: number
  height?: number
}

/**
 * 统一应用节点位置/尺寸：先冻结锚点再改尺寸，避免「先移中心、后改宽高」导致 X/Y 漂移。
 * x/y 为 LogicFlow 中心坐标；仅改宽高时默认保持左上角不变。
 */
export function applyNodeLayoutProperties(
  lf: LogicFlow,
  model: BaseNodeModel,
  patch: DiagramNodeLayoutPatch
): void {
  const hasSize = patch.width != null || patch.height != null
  const hasCenter = patch.x != null || patch.y != null
  if (!hasSize && !hasCenter) return

  const anchorLeft = model.x - model.width / 2
  const anchorTop = model.y - model.height / 2
  const nextW = patch.width ?? model.width
  const nextH = patch.height ?? model.height

  if (hasSize) {
    applyNodeDimensions(
      model as Parameters<typeof applyNodeDimensions>[0],
      nextW,
      nextH
    )
  }

  let targetX = model.x
  let targetY = model.y
  if (hasSize && !hasCenter) {
    targetX = anchorLeft + nextW / 2
    targetY = anchorTop + nextH / 2
  } else {
    if (patch.x != null) targetX = patch.x
    if (patch.y != null) targetY = patch.y
  }

  const dx = targetX - model.x
  const dy = targetY - model.y
  if (dx !== 0 || dy !== 0) {
    lf.graphModel.moveNode(model.id, dx, dy, true)
    syncNodeTextLayout(model)
  } else if (hasSize) {
    syncNodeTextLayout(model)
  }
}
