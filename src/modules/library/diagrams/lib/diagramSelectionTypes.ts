import type {
  DiagramArrowType,
  DiagramEdgeType,
  DiagramShadowPreset,
  DiagramThemePreset
} from '@modules/library/diagrams/lib/diagramEditorConstants'

/** 结构化图形扩展载荷视图（由扩展框架投影到选择集） */
export interface DiagramNodeShapeExtensionView {
  kind: string
  data: unknown
}

export type DiagramSelectionKind = 'node' | 'edge' | 'canvas'

export interface DiagramDefaultEdgeStyle {
  type: DiagramEdgeType
  stroke: string
  strokeWidth: number
  strokeDasharray: string
  startArrowType: DiagramArrowType
  endArrowType: DiagramArrowType
}

export interface DiagramCanvasSettings {
  gridVisible: boolean
  snapGrid: boolean
  backgroundColor: string
  miniMapVisible: boolean
  themePreset: DiagramThemePreset
  defaultEdge: DiagramDefaultEdgeStyle
}

export interface DiagramNodeTextStyle {
  fontSize: number
  color: string
  fontFamily: string
  textAlign: 'left' | 'center' | 'right'
  fontWeight: 'normal' | 'bold'
  fontStyle: 'normal' | 'italic'
  underline: boolean
  strikethrough: boolean
}

export interface DiagramNodeImageAsset {
  assetId: string
  ext: string
  url: string
}

export interface DiagramNodeProperties {
  id: string
  type: string
  text: string
  textStyle: DiagramNodeTextStyle
  x: number
  y: number
  width: number
  height: number
  fill: string
  stroke: string
  strokeWidth: number
  shadow: DiagramShadowPreset
  imageAsset: DiagramNodeImageAsset | null
  strokeDasharray?: string
  /** 所属组合框 id（已组合图元） */
  groupId?: string
  /** 组合框内图元/连线数量（仅组合框） */
  groupMemberCount?: number
  groupEdgeCount?: number
  /** 组合框是否始终显示边框（仅组合框） */
  groupAlwaysVisible?: boolean
  /** 结构化图形扩展载荷（由扩展框架投影） */
  shapeExtension?: DiagramNodeShapeExtensionView | null
}

export interface DiagramEdgeProperties {
  id: string
  type: DiagramEdgeType
  stroke: string
  strokeWidth: number
  strokeDasharray: string
  startArrowType: DiagramArrowType
  endArrowType: DiagramArrowType
  text: string
}

export interface DiagramEditorSelection {
  kind: DiagramSelectionKind
  node: DiagramNodeProperties | null
  edge: DiagramEdgeProperties | null
  canvas: DiagramCanvasSettings
  selectedNodeCount: number
  selectedEdgeCount: number
  selectedNodeIds: string[]
  selectedEdgeIds: string[]
  /** 多选图元时值不一致的字段路径，如 fill、textStyle.fontSize */
  mixedNodeFields: string[]
  /** 格式刷是否处于激活状态 */
  formatPainterActive?: boolean
}

export function defaultDefaultEdgeStyle(resolved: 'light' | 'dark'): DiagramDefaultEdgeStyle {
  return {
    type: 'polyline',
    stroke: resolved === 'dark' ? '#8a8a92' : '#5a5a62',
    strokeWidth: 1.5,
    strokeDasharray: '',
    startArrowType: 'none',
    endArrowType: 'solid'
  }
}

export function defaultCanvasSettings(resolved: 'light' | 'dark'): DiagramCanvasSettings {
  return {
    gridVisible: true,
    snapGrid: true,
    backgroundColor: resolved === 'dark' ? '#161618' : '#ffffff',
    miniMapVisible: false,
    themePreset: resolved === 'dark' ? 'classic-dark' : 'classic-light',
    defaultEdge: defaultDefaultEdgeStyle(resolved)
  }
}
