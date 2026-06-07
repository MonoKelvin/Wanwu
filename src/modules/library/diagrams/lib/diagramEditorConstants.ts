/** 素材面板 → 画布拖放 MIME */
export const DIAGRAM_SHAPE_DRAG_MIME = 'application/x-wanwu-diagram-shape'

export interface DiagramShapeDragPayload {
  shapeId: string
  defaultText: string
}

export const DIAGRAM_EDGE_TYPES = [
  { value: 'polyline', label: '折线' },
  { value: 'line', label: '直线' },
  { value: 'bezier', label: '曲线' }
] as const

export type DiagramEdgeType = (typeof DIAGRAM_EDGE_TYPES)[number]['value']

export const DIAGRAM_ARROW_TYPES = [
  { value: 'none', label: '无' },
  { value: 'solid', label: '实心箭头' },
  { value: 'hollow', label: '空心箭头' },
  { value: 'circle', label: '圆圈' },
  { value: 'diamond', label: '菱形' }
] as const

export type DiagramArrowType = (typeof DIAGRAM_ARROW_TYPES)[number]['value']

export const DIAGRAM_DASH_PRESETS = [
  { value: '', label: '实线' },
  { value: '6,4', label: '虚线' },
  { value: '2,4', label: '点线' },
  { value: '12,4,4,4', label: '点划线' }
] as const

export const DIAGRAM_SHADOW_PRESETS = [
  { value: 'none', label: '无阴影' },
  { value: 'soft', label: '柔和' },
  { value: 'medium', label: '中等' },
  { value: 'strong', label: '明显' }
] as const

export type DiagramShadowPreset = (typeof DIAGRAM_SHADOW_PRESETS)[number]['value']

export const DIAGRAM_THEME_PRESETS = [
  { value: 'classic-light', label: '经典浅色' },
  { value: 'classic-dark', label: '经典深色' },
  { value: 'blueprint', label: '蓝图' },
  { value: 'paper', label: '纸张' },
  { value: 'slate', label: '石板灰' }
] as const

export type DiagramThemePreset = (typeof DIAGRAM_THEME_PRESETS)[number]['value']

export const DIAGRAM_TEXT_ALIGN_OPTIONS = [
  { value: 'center', label: '居中' },
  { value: 'left', label: '左对齐' },
  { value: 'right', label: '右对齐' }
] as const

export const DIAGRAM_TEXT_ALIGN_ACTIONS = [
  { value: 'left' as const, icon: 'align-left' as const, label: '左对齐' },
  { value: 'center' as const, icon: 'align-center-h' as const, label: '居中' },
  { value: 'right' as const, icon: 'align-right' as const, label: '右对齐' }
]
