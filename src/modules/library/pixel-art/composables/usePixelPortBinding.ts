import type { PixelViewport } from '@modules/library/pixel-art/domain/types'

/** 屏幕坐标 → 像素坐标（整数） */
export function screenToPixelCoords(
  clientX: number,
  clientY: number,
  canvasRect: DOMRect,
  viewport: PixelViewport,
  docWidth: number,
  docHeight: number
): { x: number; y: number } | null {
  const x = Math.floor((clientX - canvasRect.left - viewport.panX) / viewport.zoom)
  const y = Math.floor((clientY - canvasRect.top - viewport.panY) / viewport.zoom)
  if (x < 0 || y < 0 || x >= docWidth || y >= docHeight) return null
  return { x, y }
}

export function pixelToScreenCoords(
  px: number,
  py: number,
  canvasRect: DOMRect,
  viewport: PixelViewport
): { x: number; y: number } {
  return {
    x: canvasRect.left + viewport.panX + px * viewport.zoom,
    y: canvasRect.top + viewport.panY + py * viewport.zoom
  }
}
