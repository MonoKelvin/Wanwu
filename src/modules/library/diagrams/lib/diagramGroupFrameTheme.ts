import type { DiagramCanvasTheme } from '@modules/library/diagrams/lib/diagramCanvasTheme'

export type DiagramGroupStyle = {
  stroke: string
  strokeWidth: number
  strokeDasharray: string
  fill: string
}

/** 跟随画布主题的默认边框（存于属性中，渲染时解析为 CSS 变量） */
export const GROUP_FRAME_STROKE_THEME = 'theme'

const LEGACY_GROUP_FRAME_STROKES = new Set([
  '#3b82f6',
  '#6ea8ff',
  '#2563eb',
  GROUP_FRAME_STROKE_THEME,
  'auto'
])

export const DEFAULT_GROUP_STYLE: DiagramGroupStyle = {
  stroke: GROUP_FRAME_STROKE_THEME,
  strokeWidth: 1.5,
  strokeDasharray: '6 4',
  fill: 'transparent'
}

export function isThemeGroupFrameStroke(stroke: string | undefined): boolean {
  if (!stroke) return true
  return LEGACY_GROUP_FRAME_STROKES.has(stroke.toLowerCase())
}

export function defaultGroupFrameStroke(resolved: DiagramCanvasTheme): string {
  return resolved === 'dark' ? '#5a5a62' : '#d0d0d4'
}

/** 画布 SVG 渲染：主题色使用 CSS 变量以随深浅模式切换 */
export function resolveGroupFrameStrokeForRender(stroke: string | undefined): string {
  return isThemeGroupFrameStroke(stroke) ? 'var(--ww-border)' : stroke!
}

/** 属性面板色块：展示当前主题下的实际灰色 */
export function resolveGroupFrameStrokeForUi(
  stroke: string | undefined,
  resolved: DiagramCanvasTheme
): string {
  return isThemeGroupFrameStroke(stroke) ? defaultGroupFrameStroke(resolved) : stroke!
}

export function readGroupStyle(properties: Record<string, unknown>): DiagramGroupStyle {
  const raw = (properties.dgGroupStyle ?? {}) as Partial<DiagramGroupStyle>
  return {
    stroke: raw.stroke ?? DEFAULT_GROUP_STYLE.stroke,
    strokeWidth: raw.strokeWidth ?? DEFAULT_GROUP_STYLE.strokeWidth,
    strokeDasharray: raw.strokeDasharray ?? DEFAULT_GROUP_STYLE.strokeDasharray,
    fill: raw.fill ?? DEFAULT_GROUP_STYLE.fill
  }
}
