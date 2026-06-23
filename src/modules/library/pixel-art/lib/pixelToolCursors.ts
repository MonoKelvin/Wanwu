import type { ToolId } from '@modules/library/pixel-art/domain/tools'

/** 使用十字准星（框选、基本图形等） */
export const PIXEL_CROSSHAIR_TOOLS: ReadonlySet<ToolId> = new Set([
  'line',
  'rect',
  'ellipse',
  'marquee',
  'polygon',
  'spline'
])

/** 画布区 CSS 光标 class（不含 ready / grab 状态） */
export function pixelCanvasCursorClass(
  tool: ToolId,
  options?: { spacePan?: boolean; panning?: boolean }
): string {
  if (options?.spacePan || tool === 'hand') {
    return options?.panning ? 'pa-canvas-wrap--cursor-grabbing' : 'pa-canvas-wrap--cursor-grab'
  }
  if (tool === 'zoom') return 'pa-canvas-wrap--cursor-zoom'
  if (PIXEL_CROSSHAIR_TOOLS.has(tool)) return 'pa-canvas-wrap--cursor-crosshair'
  return `pa-canvas-wrap--cursor-${tool}`
}
