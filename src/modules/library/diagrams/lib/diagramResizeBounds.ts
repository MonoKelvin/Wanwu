import type { DiagramSelectionRect } from '@modules/library/diagrams/lib/diagramNodeLayout'

export type DiagramResizeHandleDir = 'nw' | 'ne' | 'se' | 'sw'

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
