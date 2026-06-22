export type ToolId =
  | 'pencil'
  | 'eraser'
  | 'fill'
  | 'line'
  | 'rect'
  | 'ellipse'
  | 'gradient'
  | 'marquee'
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

export const TOOL_LABELS: Record<ToolId, string> = {
  pencil: '画笔',
  eraser: '橡皮',
  fill: '填充',
  line: '直线',
  rect: '矩形',
  ellipse: '椭圆',
  gradient: '渐变',
  marquee: '框选',
  eyedropper: '吸管',
  hand: '平移',
  zoom: '缩放'
}
