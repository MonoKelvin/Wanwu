import type LogicFlow from '@logicflow/core'
import { updateEdgePointByAnchors } from '@logicflow/core/lib/util/resize'
import { softSnapCoordinate } from '@modules/library/diagrams/lib/diagramCanvasTheme'
import { isGroupFrameModel } from '@modules/library/diagrams/lib/diagramGroupFrame'
import {
  computeAlignmentGuideInfo,
  computeAlignmentSnapDelta,
  RESIZE_HANDLE_AXIS_KIND,
  type AlignmentGrabRatios,
  type AlignmentPointerContext,
  type AlignmentSnapOptions
} from '@modules/library/diagrams/lib/diagramSnapAlign'
import {
  applyNodeBBoxPreservingResizeAnchor,
  selectionRectFromBBox
} from '@modules/library/diagrams/lib/diagramResizeBounds'
import type { DiagramSelectionRect } from '@modules/library/diagrams/lib/diagramNodeLayout'
import { syncNodeSizeProperties } from '@modules/library/diagrams/lib/diagramShapeResize'
import { syncNodeTextLayout } from '@modules/library/diagrams/lib/diagramStyleBridge'
import { isDiagramResizeSessionActive } from '@modules/library/diagrams/lib/diagramResizeSession'

function moveNodesDelta(lf: LogicFlow, nodeIds: string[], dx: number, dy: number): void {
  if ((dx === 0 && dy === 0) || !nodeIds.length) return
  const ids = [...new Set(nodeIds)].filter((id) => lf.getNodeModelById(id))
  if (!ids.length) return
  lf.graphModel.moveNodes(ids, dx, dy, true)
}

export function collectSnapMoveIds(lf: LogicFlow, nodeIds: string[]): string[] {
  const ids: string[] = []
  const seen = new Set<string>()
  const add = (id: string) => {
    if (seen.has(id) || !lf.getNodeModelById(id)) return
    seen.add(id)
    ids.push(id)
  }

  for (const id of nodeIds) {
    const model = lf.getNodeModelById(id)
    if (!model) continue

    if (isGroupFrameModel(model)) {
      add(id)
      for (const memberId of (model.properties?.dgGroupMembers as string[] | undefined) ?? []) {
        add(memberId)
      }
      continue
    }

    const inSelectedGroup = nodeIds.some((groupId) => {
      const group = lf.getNodeModelById(groupId)
      if (!group || !isGroupFrameModel(group)) return false
      return ((group.properties?.dgGroupMembers as string[] | undefined) ?? []).includes(id)
    })
    if (!inSelectedGroup) add(id)
  }

  return ids
}

function applyGridSoftSnapToAnchor(
  lf: LogicFlow,
  nodeIds: string[],
  anchorId: string
): void {
  const anchor = lf.getNodeModelById(anchorId)
  if (!anchor) return

  if (isGroupFrameModel(anchor)) {
    const nx = softSnapCoordinate(anchor.x)
    const ny = softSnapCoordinate(anchor.y)
    const dx = nx - anchor.x
    const dy = ny - anchor.y
    if (dx === 0 && dy === 0) return
    const members = (anchor.properties?.dgGroupMembers as string[] | undefined) ?? []
    moveNodesDelta(lf, [anchorId, ...members], dx, dy)
    return
  }

  const nx = softSnapCoordinate(anchor.x)
  const ny = softSnapCoordinate(anchor.y)
  const dx = nx - anchor.x
  const dy = ny - anchor.y
  if (dx === 0 && dy === 0) return
  moveNodesDelta(lf, collectSnapMoveIds(lf, nodeIds), dx, dy)
}

function buildAlignOptions(
  pointer?: AlignmentPointerContext,
  grabRatios?: AlignmentGrabRatios,
  extra?: Partial<AlignmentSnapOptions>
): AlignmentSnapOptions {
  return {
    pointer,
    grabRatios,
    ...extra
  }
}

function applyAlignSnapToAnchor(
  lf: LogicFlow,
  nodeIds: string[],
  anchorId: string,
  pointer?: AlignmentPointerContext,
  grabRatios?: AlignmentGrabRatios,
  extra?: Partial<AlignmentSnapOptions>
): void {
  const moveIds = collectSnapMoveIds(lf, nodeIds)
  const { dx, dy } = computeAlignmentSnapDelta(
    lf,
    anchorId,
    moveIds,
    buildAlignOptions(pointer, grabRatios, extra)
  )
  if (dx === 0 && dy === 0) return
  moveNodesDelta(lf, moveIds, dx, dy)
}

function syncNodeAfterResizeBBox(
  lf: LogicFlow,
  model: NonNullable<ReturnType<LogicFlow['getNodeModelById']>>
): void {
  syncNodeSizeProperties(
    model as Parameters<typeof syncNodeSizeProperties>[0]
  )
  syncNodeTextLayout(model)
  updateEdgePointByAnchors(model, lf.graphModel)
}

function shiftResizeBoundsBySnap(
  handleIndex: number,
  bounds: DiagramSelectionRect,
  dx: number,
  dy: number,
  snapGrid: boolean
): DiagramSelectionRect {
  const kinds = RESIZE_HANDLE_AXIS_KIND[handleIndex]
  if (!kinds) return bounds

  let minX = bounds.minX
  let maxX = bounds.maxX
  let minY = bounds.minY
  let maxY = bounds.maxY

  if (dx !== 0) {
    if (kinds.x === 'min') minX += dx
    else if (kinds.x === 'max') maxX += dx
    else {
      minX += dx
      maxX += dx
    }
  }

  if (dy !== 0) {
    if (kinds.y === 'min') minY += dy
    else if (kinds.y === 'max') maxY += dy
    else {
      minY += dy
      maxY += dy
    }
  }

  if (snapGrid) {
    const movingX =
      kinds.x === 'min' ? minX : kinds.x === 'max' ? maxX : (minX + maxX) / 2
    const movingY =
      kinds.y === 'min' ? minY : kinds.y === 'max' ? maxY : (minY + maxY) / 2
    const gridDx = softSnapCoordinate(movingX) - movingX
    const gridDy = softSnapCoordinate(movingY) - movingY
    if (gridDx !== 0) {
      if (kinds.x === 'min') minX += gridDx
      else if (kinds.x === 'max') maxX += gridDx
      else {
        minX += gridDx
        maxX += gridDx
      }
    }
    if (gridDy !== 0) {
      if (kinds.y === 'min') minY += gridDy
      else if (kinds.y === 'max') maxY += gridDy
      else {
        minY += gridDy
        maxY += gridDy
      }
    }
  }

  const width = maxX - minX
  const height = maxY - minY
  return {
    minX,
    minY,
    maxX,
    maxY,
    width,
    height,
    cx: (minX + maxX) / 2,
    cy: (minY + maxY) / 2
  }
}

/** 对指针推算的目标包围盒做对齐/网格吸附（缩放前先 snap，避免下一帧被 pointer 拉回） */
export function snapResizeTargetBounds(
  lf: LogicFlow,
  nodeId: string,
  handleIndex: number,
  target: DiagramSelectionRect,
  snapGrid: boolean
): DiagramSelectionRect {
  const kinds = RESIZE_HANDLE_AXIS_KIND[handleIndex]
  if (!kinds) return target

  const movingBBox = {
    minX: target.minX,
    minY: target.minY,
    maxX: target.maxX,
    maxY: target.maxY,
    cx: target.cx,
    cy: target.cy
  }

  const { dx, dy } = computeAlignmentSnapDelta(lf, nodeId, [nodeId], {
    preferredX: kinds.x,
    preferredY: kinds.y,
    movingBBoxOverride: movingBBox
  })

  if (dx === 0 && dy === 0 && !snapGrid) return target
  return shiftResizeBoundsBySnap(handleIndex, target, dx, dy, snapGrid)
}

/** 单图元缩放锚点：按拖动的角/边对齐邻近图元，并保持固定对角锚点 */
export function applyResizeAlignSnap(
  lf: LogicFlow,
  nodeId: string,
  handleIndex: number,
  snapGrid: boolean
): void {
  const kinds = RESIZE_HANDLE_AXIS_KIND[handleIndex]
  const model = lf.getNodeModelById(nodeId)
  if (!kinds || !model || isGroupFrameModel(model)) return

  const beforeW = model.width
  const beforeH = model.height
  const beforeX = model.x
  const beforeY = model.y

  const curRect = selectionRectFromBBox({
    minX: model.x - model.width / 2,
    minY: model.y - model.height / 2,
    maxX: model.x + model.width / 2,
    maxY: model.y + model.height / 2
  })

  const movingBBox = {
    minX: curRect.minX,
    minY: curRect.minY,
    maxX: curRect.maxX,
    maxY: curRect.maxY,
    cx: curRect.cx,
    cy: curRect.cy
  }

  const { dx, dy } = computeAlignmentSnapDelta(lf, nodeId, [nodeId], {
    preferredX: kinds.x,
    preferredY: kinds.y,
    movingBBoxOverride: movingBBox
  })

  if (dx === 0 && dy === 0 && !snapGrid) return

  const snapped = shiftResizeBoundsBySnap(handleIndex, curRect, dx, dy, snapGrid)
  applyNodeBBoxPreservingResizeAnchor(
    model,
    handleIndex,
    snapped.minX,
    snapped.minY,
    snapped.maxX,
    snapped.maxY
  )

  if (
    model.width === beforeW &&
    model.height === beforeH &&
    model.x === beforeX &&
    model.y === beforeY
  ) {
    return
  }

  syncNodeAfterResizeBBox(lf, model)
}

export interface ApplyDragSnapOnDropOptions {
  snapGrid: boolean
  anchorId?: string
  alignThreshold?: number
  pointer?: AlignmentPointerContext
  grabRatios?: AlignmentGrabRatios
}

export function applyDragSnapOnDrop(
  lf: LogicFlow,
  nodeIds: string[],
  options: ApplyDragSnapOnDropOptions
): void {
  const uniqueIds = [...new Set(nodeIds)].filter((id) => lf.getNodeModelById(id))
  if (!uniqueIds.length) return

  const anchorId = options.anchorId ?? uniqueIds[0]!
  applyAlignSnapToAnchor(
    lf,
    uniqueIds,
    anchorId,
    options.pointer,
    options.grabRatios,
    { threshold: options.alignThreshold }
  )

  if (options.snapGrid) {
    applyGridSoftSnapToAnchor(lf, uniqueIds, anchorId)
  }
}

export function refreshSnapAlignGuide(
  lf: LogicFlow,
  anchorId: string,
  enabled = true,
  movingNodeIds?: string[],
  pointer?: AlignmentPointerContext,
  grabRatios?: AlignmentGrabRatios,
  extra?: Partial<AlignmentSnapOptions>
): void {
  if (!enabled) {
    lf.removeNodeSnapLine()
    return
  }
  const moveIds = movingNodeIds?.length
    ? movingNodeIds
    : collectSnapMoveIds(lf, [anchorId])
  const guide = computeAlignmentGuideInfo(
    lf,
    anchorId,
    moveIds,
    buildAlignOptions(pointer, grabRatios, extra)
  )
  if (!guide.isShowHorizontal && !guide.isShowVertical) {
    lf.removeNodeSnapLine()
    return
  }

  const snaplineModel = lf.snaplineModel as
    | { setSnaplineInfo?: (info: typeof guide) => void }
    | undefined
  if (snaplineModel?.setSnaplineInfo) {
    snaplineModel.setSnaplineInfo(guide)
    return
  }

  const model = lf.getNodeModelById(anchorId)
  if (model) lf.setNodeSnapLine(model.getData())
}

export function snapNodesAfterDrag(
  lf: LogicFlow,
  nodeIds: string[],
  enabled: boolean,
  anchorId?: string
): void {
  applyDragSnapOnDrop(lf, nodeIds, { snapGrid: enabled, anchorId })
}

export function softAlignNodesDuringDrag(
  lf: LogicFlow,
  nodeIds: string[],
  anchorId: string,
  pointer?: AlignmentPointerContext,
  grabRatios?: AlignmentGrabRatios
): void {
  if (!nodeIds.length) return
  applyAlignSnapToAnchor(lf, nodeIds, anchorId, pointer, grabRatios)
}

export function softSnapNodesDuringDrag(
  lf: LogicFlow,
  nodeIds: string[],
  enabled: boolean,
  anchorId?: string
): void {
  if (!enabled || !nodeIds.length) return
  applyGridSoftSnapToAnchor(lf, nodeIds, anchorId ?? nodeIds[0]!)
}

export function refreshResizeAlignGuide(
  lf: LogicFlow,
  nodeId: string,
  handleIndex: number
): void {
  const kinds = RESIZE_HANDLE_AXIS_KIND[handleIndex]
  if (!kinds) {
    lf.removeNodeSnapLine()
    return
  }
  refreshSnapAlignGuide(lf, nodeId, true, [nodeId], undefined, undefined, {
    preferredX: kinds.x,
    preferredY: kinds.y
  })
}

let resizeGuideRaf: number | null = null
let pendingResizeGuide: {
  lf: LogicFlow
  nodeId: string
  handleIndex: number
} | null = null

function scheduleResizeAlignGuideOnly(
  lf: LogicFlow,
  nodeId: string,
  handleIndex: number
): void {
  pendingResizeGuide = { lf, nodeId, handleIndex }
  if (resizeGuideRaf != null) return
  resizeGuideRaf = requestAnimationFrame(() => {
    resizeGuideRaf = null
    const pending = pendingResizeGuide
    pendingResizeGuide = null
    if (!pending || !isDiagramResizeSessionActive()) return
    refreshResizeAlignGuide(pending.lf, pending.nodeId, pending.handleIndex)
  })
}

/**
 * 缩放过程中：对齐线（rAF 节流）；磁吸在 handleResize 前由 snapResizeTargetBounds 完成
 */
export function scheduleResizeSnapFeedback(
  lf: LogicFlow,
  nodeId: string,
  handleIndex: number,
  _snapGrid: boolean
): void {
  if (!isDiagramResizeSessionActive()) return
  scheduleResizeAlignGuideOnly(lf, nodeId, handleIndex)
}

export function cancelResizeSnapFeedback(): void {
  if (resizeGuideRaf != null) {
    cancelAnimationFrame(resizeGuideRaf)
    resizeGuideRaf = null
  }
  pendingResizeGuide = null
}

/** @deprecated 使用 scheduleResizeSnapFeedback */
export function scheduleResizeAlignGuide(lf: LogicFlow, nodeId: string, handleIndex: number): void {
  scheduleResizeSnapFeedback(lf, nodeId, handleIndex, false)
}

export function cancelResizeAlignGuide(): void {
  cancelResizeSnapFeedback()
}

/** 缩放结束：一次性吸附对齐与网格 */
export function finishResizeAlignSnap(
  lf: LogicFlow,
  nodeId: string,
  handleIndex: number,
  snapGrid: boolean
): void {
  cancelResizeSnapFeedback()
  applyResizeAlignSnap(lf, nodeId, handleIndex, snapGrid)
  lf.removeNodeSnapLine()
}

export type { AlignmentGrabRatios, AlignmentPointerContext }
