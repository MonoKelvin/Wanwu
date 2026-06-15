import type LogicFlow from '@logicflow/core'
import type { BaseNodeModel } from '@logicflow/core'
import { updateEdgePointByAnchors } from '@logicflow/core/lib/util/resize'
import { syncDiagramEdgeTextsForNodeIds } from '@modules/library/diagrams/lib/diagramEdgeTextSync'
import { syncGroupFramesForNodes } from '@modules/library/diagrams/lib/diagramGroupBounds'
import { applyNodeDimensions } from '@modules/library/diagrams/lib/diagramShapeResize'
import { syncNodeTextLayout } from '@modules/library/diagrams/lib/diagramStyleBridge'

export type DiagramNodeLayoutPatch = {
  /** 画布中心 X（LogicFlow 坐标） */
  x?: number
  /** 画布中心 Y（LogicFlow 坐标） */
  y?: number
  /** 属性面板左上角 X（整数） */
  left?: number
  /** 属性面板左上角 Y（整数） */
  top?: number
  width?: number
  height?: number
}

/** 属性面板 X/Y 为左上角；LogicFlow model 使用中心坐标 */
export function nodeTopLeftFromCenter(
  x: number,
  y: number,
  width: number,
  height: number
): { left: number; top: number } {
  return {
    left: x - width / 2,
    top: y - height / 2
  }
}

export function nodeCenterFromTopLeft(
  left: number,
  top: number,
  width: number,
  height: number
): { x: number; y: number } {
  return {
    x: left + width / 2,
    y: top + height / 2
  }
}

/** 与属性面板显示一致的整数左上角（readNodeProperties 四舍五入后） */
export function roundNodeTopLeft(
  x: number,
  y: number,
  width: number,
  height: number
): { left: number; top: number } {
  return {
    left: Math.round(x - width / 2),
    top: Math.round(y - height / 2)
  }
}

/**
 * 求整数中心 X，使 Math.round(x - width/2) === left。
 * 避免单独 round(x)/round(width) 导致改宽时 X 在 ±1 间抖动。
 */
export function snapCenterXForTopLeft(left: number, width: number): number {
  const l = Math.round(left)
  const w = Math.round(width)
  const ideal = l + w / 2
  const candidates = [Math.floor(ideal), Math.round(ideal), Math.ceil(ideal)]
  for (const x of candidates) {
    if (Math.round(x - w / 2) === l) return x
  }
  return Math.round(ideal)
}

/** 求整数中心 Y，使 Math.round(y - height/2) === top */
export function snapCenterYForTopLeft(top: number, height: number): number {
  const t = Math.round(top)
  const h = Math.round(height)
  const ideal = t + h / 2
  const candidates = [Math.floor(ideal), Math.round(ideal), Math.ceil(ideal)]
  for (const y of candidates) {
    if (Math.round(y - h / 2) === t) return y
  }
  return Math.round(ideal)
}

function readLayoutSize(model: BaseNodeModel): { width: number; height: number } {
  const props = (model.properties ?? {}) as Record<string, unknown>
  const width = Number.isFinite(model.width) && model.width > 0 ? model.width : Number(props.width) || 0
  const height =
    Number.isFinite(model.height) && model.height > 0 ? model.height : Number(props.height) || 0
  return { width, height }
}

function layoutChanged(a: number, b: number): boolean {
  return Math.abs(a - b) > 1e-6
}

function roundPatchValue(value: number | undefined): number | undefined {
  if (value == null || !Number.isFinite(value)) return undefined
  return Math.round(value)
}

/** 按节点锚点重算连线端点（缩放后锚点位置变化，不能仅靠 moveEdge 平移） */
export function syncDiagramEdgePointsForNodeIds(lf: LogicFlow, nodeIds: readonly string[]): void {
  for (const nodeId of nodeIds) {
    const model = lf.getNodeModelById(nodeId)
    if (model) updateEdgePointByAnchors(model, lf.graphModel)
  }
}

/**
 * 图元布局变更后的副作用：连线端点/文本、组合框边界等。
 * 与画布拖拽 node:drop、缩放 node:resize 结束后的同步保持一致。
 */
export function finalizeNodeLayoutChange(lf: LogicFlow, nodeIds: readonly string[]): void {
  if (!nodeIds.length) return
  syncDiagramEdgePointsForNodeIds(lf, nodeIds)
  syncDiagramEdgeTextsForNodeIds(lf, nodeIds)
  syncGroupFramesForNodes(lf, nodeIds, { mode: 'fit' })
}

/**
 * 统一应用节点位置/尺寸（单轴独立变更，整数面板坐标）：
 * - 仅 width：保持面板左上角 X 不变，只调整中心 X
 * - 仅 height：保持面板左上角 Y 不变，只调整中心 Y
 * - 仅 left：只改中心 X，Y 不变
 * - 仅 top：只改中心 Y，X 不变
 */
export function applyNodeLayoutProperties(
  lf: LogicFlow,
  model: BaseNodeModel,
  patch: DiagramNodeLayoutPatch
): void {
  const patchWidth = roundPatchValue(patch.width)
  const patchHeight = roundPatchValue(patch.height)
  const patchLeft = roundPatchValue(patch.left)
  const patchTop = roundPatchValue(patch.top)
  const patchX = patch.x
  const patchY = patch.y

  const hasWidth = patchWidth != null
  const hasHeight = patchHeight != null
  const hasSize = hasWidth || hasHeight
  const hasLeft = patchLeft != null
  const hasTop = patchTop != null
  const hasCenterX = patchX != null
  const hasCenterY = patchY != null
  const hasCenter = hasCenterX || hasCenterY || hasLeft || hasTop
  if (!hasSize && !hasCenter) return

  const { width: curW, height: curH } = readLayoutSize(model)
  const roundedW = Math.round(curW)
  const roundedH = Math.round(curH)
  const anchor = roundNodeTopLeft(model.x, model.y, roundedW, roundedH)
  const nextW = hasWidth ? patchWidth! : roundedW
  const nextH = hasHeight ? patchHeight! : roundedH

  let targetX = model.x
  let targetY = model.y

  if (hasSize) {
    const widthOnly = hasWidth && !hasHeight
    const heightOnly = hasHeight && !hasWidth
    if (widthOnly) {
      targetX = snapCenterXForTopLeft(anchor.left, nextW)
    } else if (heightOnly) {
      targetY = snapCenterYForTopLeft(anchor.top, nextH)
    } else {
      targetX = snapCenterXForTopLeft(anchor.left, nextW)
      targetY = snapCenterYForTopLeft(anchor.top, nextH)
    }
  }

  if (hasLeft && !hasTop) {
    targetX = snapCenterXForTopLeft(patchLeft!, roundedW)
  } else if (hasTop && !hasLeft) {
    targetY = snapCenterYForTopLeft(patchTop!, roundedH)
  } else if (hasLeft && hasTop) {
    targetX = snapCenterXForTopLeft(patchLeft!, nextW)
    targetY = snapCenterYForTopLeft(patchTop!, nextH)
  } else if (hasCenterX || hasCenterY) {
    if (hasCenterX && !hasCenterY) {
      targetX = patchX!
    } else if (hasCenterY && !hasCenterX) {
      targetY = patchY!
    } else {
      if (hasCenterX) targetX = patchX!
      if (hasCenterY) targetY = patchY!
    }
  }

  if (hasSize) {
    applyNodeDimensions(
      model as Parameters<typeof applyNodeDimensions>[0],
      nextW,
      nextH
    )
  }

  if (layoutChanged(targetX, model.x) || layoutChanged(targetY, model.y)) {
    lf.graphModel.moveNode2Coordinate(model.id, targetX, targetY, true)
  }
  if (hasSize || hasCenter) {
    syncNodeTextLayout(model)
  }
}
