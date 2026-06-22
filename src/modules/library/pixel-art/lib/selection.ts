export interface PixelSelection {
  x: number
  y: number
  width: number
  height: number
}

export function normalizeSelection(x0: number, y0: number, x1: number, y1: number): PixelSelection {
  const x = Math.min(x0, x1)
  const y = Math.min(y0, y1)
  return {
    x,
    y,
    width: Math.abs(x1 - x0) + 1,
    height: Math.abs(y1 - y0) + 1
  }
}

export function selectionContains(sel: PixelSelection | null, x: number, y: number): boolean {
  if (!sel) return false
  return x >= sel.x && y >= sel.y && x < sel.x + sel.width && y < sel.y + sel.height
}
