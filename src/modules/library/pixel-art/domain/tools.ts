export type ToolId =
  | 'pencil'
  | 'eraser'
  | 'fill'
  | 'line'
  | 'rect'
  | 'polygon'
  | 'ellipse'
  | 'spline'
  | 'gradient'
  | 'marquee'
  | 'move'
  | 'eyedropper'
  | 'hand'
  | 'zoom'

export type BrushShape = 'square' | 'circle'

export interface ToolOptions {
  brushSize: number
  brushShape: BrushShape
  fillTolerance: number
  shapeFilled: boolean
  gradientEndColor: string
  gradientDither: boolean
}

export const DEFAULT_TOOL_OPTIONS: ToolOptions = {
  brushSize: 1,
  brushShape: 'square',
  fillTolerance: 0,
  shapeFilled: false,
  gradientEndColor: '#4ECDC4',
  gradientDither: false
}

/** 尚未实现交互的工具（工具栏可选中并提示） */
export const PLACEHOLDER_TOOLS: ReadonlySet<ToolId> = new Set(['polygon', 'spline'])

export const TOOL_LABELS: Record<ToolId, string> = {
  pencil: '画笔',
  eraser: '橡皮',
  fill: '填充',
  line: '直线',
  rect: '矩形',
  polygon: '多边形',
  ellipse: '椭圆',
  spline: '样条线',
  gradient: '渐变',
  marquee: '框选',
  move: '偏移',
  eyedropper: '吸管',
  hand: '平移',
  zoom: '缩放'
}

/** 工具栏 tooltip / 快捷键说明用（与 usePixelShortcuts 一致） */
export const TOOL_SHORTCUT_KEYS: Partial<Record<ToolId, string>> = {
  pencil: 'B',
  eraser: 'E',
  fill: 'G',
  line: 'L',
  rect: 'U',
  ellipse: 'O',
  eyedropper: 'I',
  marquee: 'M',
  move: 'V',
  hand: 'H'
}

export function toolTooltipLabel(toolId: ToolId, options?: { disabled?: boolean; placeholder?: boolean }): string {
  const label = TOOL_LABELS[toolId]
  if (options?.disabled || options?.placeholder) return `${label}（即将推出）`
  const key = TOOL_SHORTCUT_KEYS[toolId]
  return key ? `${label} (${key})` : label
}
