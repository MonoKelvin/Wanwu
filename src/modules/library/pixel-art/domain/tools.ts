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
