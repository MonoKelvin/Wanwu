import type { DiagramSelectionRect } from '@modules/library/diagrams/lib/diagramNodeLayout'
import { getDiagramResizeFixedAnchor } from '@modules/library/diagrams/lib/diagramResizeSession'

export type DiagramResizeHandleDir = 'nw' | 'ne' | 'se' | 'sw'

export const RESIZE_HANDLE_INDEX_TO_DIR: DiagramResizeHandleDir[] = ['nw', 'ne', 'se', 'sw']

export function resizeHandleDirFromIndex(index: number): DiagramResizeHandleDir | null {
  return RESIZE_HANDLE_INDEX_TO_DIR[index] ?? null
}

export type DiagramResizeLimits = {
  minWidth?: number
  minHeight?: number
  maxWidth?: number
  maxHeight?: number
}

const DEFAULT_MIN_BBOX = 32

export function selectionRectFromBBox(box: {
  minX: number
  minY: number
  maxX: number
  maxY: number
}): DiagramSelectionRect {
  const width = box.maxX - box.minX
  const height = box.maxY - box.minY
  return {
    minX: box.minX,
    minY: box.minY,
    maxX: box.maxX,
    maxY: box.maxY,
    width,
    height,
    cx: (box.minX + box.maxX) / 2,
    cy: (box.minY + box.maxY) / 2
  }
}

export function cornerOfSelectionRect(
  dir: DiagramResizeHandleDir,
  bounds: DiagramSelectionRect
): { x: number; y: number } {
  switch (dir) {
    case 'nw':
      return { x: bounds.minX, y: bounds.minY }
    case 'ne':
      return { x: bounds.maxX, y: bounds.minY }
    case 'se':
      return { x: bounds.maxX, y: bounds.maxY }
    case 'sw':
      return { x: bounds.minX, y: bounds.maxY }
  }
}

/** 拖拽角的对边为缩放锚点（整体等比缩放） */
export function fixedAnchorForResizeHandle(
  dir: DiagramResizeHandleDir,
  bounds: DiagramSelectionRect
): { x: number; y: number } {
  switch (dir) {
    case 'se':
      return { x: bounds.minX, y: bounds.minY }
    case 'nw':
      return { x: bounds.maxX, y: bounds.maxY }
    case 'ne':
      return { x: bounds.minX, y: bounds.maxY }
    case 'sw':
      return { x: bounds.maxX, y: bounds.minY }
  }
}

/**
 * 由拖拽起点包围盒 + 累积位移推算下一包围盒；越界（小于最小/大于最大）时返回 null。
 * 用于在触及最小尺寸后继续拖鼠标时，不累积无效位移，反向放大可立即跟手。
 */
export function boundsForResizeHandleDrag(
  dir: DiagramResizeHandleDir,
  anchor: DiagramSelectionRect,
  dx: number,
  dy: number,
  lockAspect = false,
  limits?: DiagramResizeLimits
): DiagramSelectionRect | null {
  let { minX, minY, maxX, maxY } = anchor
  if (dir === 'nw') {
    minX += dx
    minY += dy
  } else if (dir === 'ne') {
    maxX += dx
    minY += dy
  } else if (dir === 'se') {
    maxX += dx
    maxY += dy
  } else {
    minX += dx
    maxY += dy
  }

  if (lockAspect && anchor.width > 1 && anchor.height > 1) {
    const scaleX = (maxX - minX) / anchor.width
    const scaleY = (maxY - minY) / anchor.height
    const scale = Math.abs(scaleX - 1) < Math.abs(scaleY - 1) ? scaleX : scaleY
    const fixed = fixedAnchorForResizeHandle(dir, anchor)
    const newW = anchor.width * scale
    const newH = anchor.height * scale
    const minW = limits?.minWidth ?? DEFAULT_MIN_BBOX
    const minH = limits?.minHeight ?? DEFAULT_MIN_BBOX
    if (newW < minW || newH < minH) return null
    if (dir === 'se') {
      maxX = fixed.x + newW
      maxY = fixed.y + newH
      minX = fixed.x
      minY = fixed.y
    } else if (dir === 'nw') {
      minX = fixed.x - newW
      minY = fixed.y - newH
      maxX = fixed.x
      maxY = fixed.y
    } else if (dir === 'ne') {
      maxX = fixed.x + newW
      minY = fixed.y - newH
      minX = fixed.x
      maxY = fixed.y
    } else {
      minX = fixed.x - newW
      maxY = fixed.y + newH
      maxX = fixed.x
      minY = fixed.y
    }
  }

  const width = maxX - minX
  const height = maxY - minY
  const minW = limits?.minWidth ?? DEFAULT_MIN_BBOX
  const minH = limits?.minHeight ?? DEFAULT_MIN_BBOX
  const maxW = limits?.maxWidth ?? Infinity
  const maxH = limits?.maxHeight ?? Infinity
  if (width < minW || height < minH || width > maxW || height > maxH) return null

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

/** 由固定对角 + 指针画布坐标推算目标包围盒（缩放安全，跟手） */
export function targetBoundsFromResizePointer(
  dir: DiagramResizeHandleDir,
  fixed: { x: number; y: number },
  pointerX: number,
  pointerY: number,
  limits?: DiagramResizeLimits
): DiagramSelectionRect {
  const minW = limits?.minWidth ?? DEFAULT_MIN_BBOX
  const minH = limits?.minHeight ?? DEFAULT_MIN_BBOX
  const maxW = limits?.maxWidth ?? Infinity
  const maxH = limits?.maxHeight ?? Infinity

  let minX = fixed.x
  let minY = fixed.y
  let maxX = fixed.x
  let maxY = fixed.y

  switch (dir) {
    case 'se':
      maxX = pointerX
      maxY = pointerY
      break
    case 'nw':
      minX = pointerX
      minY = pointerY
      break
    case 'ne':
      maxX = pointerX
      minY = pointerY
      break
    case 'sw':
      minX = pointerX
      maxY = pointerY
      break
  }

  if (minX > maxX) [minX, maxX] = [maxX, minX]
  if (minY > maxY) [minY, maxY] = [maxY, minY]

  let width = maxX - minX
  let height = maxY - minY
  width = Math.min(maxW, Math.max(minW, width))
  height = Math.min(maxH, Math.max(minH, height))

  switch (dir) {
    case 'se':
      minX = fixed.x
      minY = fixed.y
      maxX = minX + width
      maxY = minY + height
      break
    case 'nw':
      maxX = fixed.x
      maxY = fixed.y
      minX = maxX - width
      minY = maxY - height
      break
    case 'ne':
      minX = fixed.x
      maxY = fixed.y
      maxX = minX + width
      minY = maxY - height
      break
    case 'sw':
      maxX = fixed.x
      minY = fixed.y
      minX = maxX - width
      maxY = minY + height
      break
  }

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

type ResizeBBoxModel = {
  x: number
  y: number
  width: number
  height: number
  minWidth?: number
  minHeight?: number
  maxWidth?: number
  maxHeight?: number
}

/**
 * 按缩放锚点写入包围盒：固定对角不动，只调整拖拽边；最小/最大尺寸只扩展活动边。
 */
export function applyNodeBBoxPreservingResizeAnchor(
  model: ResizeBBoxModel,
  handleIndex: number,
  nextMinX: number,
  nextMinY: number,
  nextMaxX: number,
  nextMaxY: number
): void {
  const dir = resizeHandleDirFromIndex(handleIndex)
  if (!dir) return

  const curRect = selectionRectFromBBox({
    minX: model.x - model.width / 2,
    minY: model.y - model.height / 2,
    maxX: model.x + model.width / 2,
    maxY: model.y + model.height / 2
  })
  const fixed = getDiagramResizeFixedAnchor() ?? fixedAnchorForResizeHandle(dir, curRect)

  let minX = nextMinX
  let minY = nextMinY
  let maxX = nextMaxX
  let maxY = nextMaxY

  switch (dir) {
    case 'se':
      minX = fixed.x
      minY = fixed.y
      break
    case 'nw':
      maxX = fixed.x
      maxY = fixed.y
      break
    case 'ne':
      minX = fixed.x
      maxY = fixed.y
      break
    case 'sw':
      maxX = fixed.x
      minY = fixed.y
      break
  }

  const minW = model.minWidth ?? DEFAULT_MIN_BBOX
  const minH = model.minHeight ?? DEFAULT_MIN_BBOX
  const maxW = model.maxWidth ?? Infinity
  const maxH = model.maxHeight ?? Infinity

  let width = maxX - minX
  let height = maxY - minY
  width = Math.min(maxW, Math.max(minW, width))
  height = Math.min(maxH, Math.max(minH, height))

  switch (dir) {
    case 'se':
      maxX = minX + width
      maxY = minY + height
      break
    case 'nw':
      minX = maxX - width
      minY = maxY - height
      break
    case 'ne':
      maxX = minX + width
      minY = maxY - height
      break
    case 'sw':
      minX = maxX - width
      maxY = minY + height
      break
  }

  model.width = width
  model.height = height
  model.x = (minX + maxX) / 2
  model.y = (minY + maxY) / 2
}
