import { screen, type Point, type Rectangle } from 'electron'

const DEFAULT_WIDTH = 320
const DEFAULT_HEIGHT = 360
/** 窗口左缘相对光标的水平间距 */
const CURSOR_GAP_X = 16
/** 窗口顶缘相对光标的垂直间距（略低于热点） */
const CURSOR_GAP_Y = 8

export interface PopoutPlacementOptions {
  width?: number
  height?: number
  /** 同批次连续打开时的轻微错位，避免完全重叠 */
  staggerIndex?: number
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function applyStagger(bounds: Rectangle, staggerIndex: number): Rectangle {
  if (staggerIndex <= 0) return bounds
  const step = 28
  const ring = staggerIndex % 8
  return {
    ...bounds,
    x: bounds.x + ring * step,
    y: bounds.y + ring * step
  }
}

function clampRectToWorkArea(rect: Rectangle, workArea: Rectangle): Rectangle {
  const maxX = workArea.x + workArea.width - rect.width
  const maxY = workArea.y + workArea.height - rect.height
  return {
    ...rect,
    x: Math.round(clamp(rect.x, workArea.x, Math.max(workArea.x, maxX))),
    y: Math.round(clamp(rect.y, workArea.y, Math.max(workArea.y, maxY)))
  }
}

/**
 * 以光标为锚点放置便笺独立窗口：
 * - 默认出现在光标右下方
 * - 右侧空间不足时改到光标左方
 * - 最终 clamp 到当前显示器工作区
 */
export function resolvePopoutBoundsNearCursor(
  cursor: Point = screen.getCursorScreenPoint(),
  options: PopoutPlacementOptions = {}
): Rectangle {
  const width = options.width ?? DEFAULT_WIDTH
  const height = options.height ?? DEFAULT_HEIGHT
  const display = screen.getDisplayNearestPoint(cursor)
  const { workArea } = display

  const rightX = cursor.x + CURSOR_GAP_X
  const leftX = cursor.x - width - CURSOR_GAP_X
  const workRight = workArea.x + workArea.width
  const workBottom = workArea.y + workArea.height

  const rightFits = rightX + width <= workRight
  const leftFits = leftX >= workArea.x

  let x: number
  if (rightFits) {
    x = rightX
  } else if (leftFits) {
    x = leftX
  } else {
    x = clamp(rightX, workArea.x, workRight - width)
  }

  let y = cursor.y + CURSOR_GAP_Y
  y = clamp(y, workArea.y, workBottom - height)

  const base: Rectangle = { x: Math.round(x), y: Math.round(y), width, height }
  const staggered = applyStagger(base, options.staggerIndex ?? 0)
  return clampRectToWorkArea(staggered, workArea)
}

/** 历史占位坐标（ensure 时未给 bounds 写入的默认值） */
export function isPlaceholderPopoutBounds(bounds: Rectangle): boolean {
  return bounds.x === 0 && bounds.y === 0
}
