export const CANVAS_COMMAND_TYPES = [
  'canvas.addNode',
  'canvas.updateNode',
  'canvas.updateEdge',
  'canvas.updateSettings',
  'canvas.batchUpdateNodes',
  'canvas.batchUpdateEdges',
  'canvas.alignNodes',
  'canvas.distributeNodes',
  'canvas.deleteSelection',
  'canvas.connect',
  'canvas.select',
  'canvas.selectAll',
  'canvas.clearSelection',
  'canvas.copy',
  'canvas.paste',
  'canvas.undo',
  'canvas.redo',
  'canvas.zoom',
  'canvas.zoomToFit',
  'canvas.zoomReset',
  'canvas.centerOrigin',
  'canvas.setGrid'
] as const

export type CanvasCommandType = (typeof CANVAS_COMMAND_TYPES)[number]

/** 图元目录 id，见 diagramShapeRegistry */
export type DiagramShape = string

export interface CanvasAddNodePayload {
  shape: DiagramShape
  x: number
  y: number
  text?: string
  style?: Record<string, unknown>
}

export interface CanvasUpdateNodePayload {
  nodeId: string
  patch?: Record<string, unknown>
  nodeProps?: Partial<import('@modules/library/diagrams/lib/diagramSelectionTypes').DiagramNodeProperties>
}

export interface CanvasDeleteSelectionPayload {
  nodeIds?: string[]
  edgeIds?: string[]
}

export interface CanvasConnectPayload {
  sourceNodeId: string
  targetNodeId: string
  style?: Record<string, unknown>
}

export interface CanvasUpdateEdgePayload {
  edgeId: string
  patch?: Record<string, unknown>
  edgeProps?: Partial<import('@modules/library/diagrams/lib/diagramSelectionTypes').DiagramEdgeProperties>
}

export interface CanvasSelectPayload {
  nodeIds: string[]
  edgeIds?: string[]
  append?: boolean
}

export interface CanvasPastePayload {
  x?: number
  y?: number
}

export interface CanvasZoomPayload {
  delta?: number
  scale?: number
}

export interface CanvasSetGridPayload {
  visible: boolean
  snap?: boolean
}

export interface CanvasUpdateSettingsPayload {
  settings: Partial<import('@modules/library/diagrams/lib/diagramSelectionTypes').DiagramCanvasSettings>
}

export interface CanvasBatchUpdateNodesPayload {
  nodeIds?: string[]
  nodeProps: Partial<import('@modules/library/diagrams/lib/diagramSelectionTypes').DiagramNodeProperties>
}

export interface CanvasBatchUpdateEdgesPayload {
  edgeIds?: string[]
  edgeProps: Partial<import('@modules/library/diagrams/lib/diagramSelectionTypes').DiagramEdgeProperties>
}

export interface CanvasAlignNodesPayload {
  mode: import('@modules/library/diagrams/lib/diagramNodeLayout').DiagramAlignMode
  nodeIds?: string[]
}

export interface CanvasDistributeNodesPayload {
  mode: import('@modules/library/diagrams/lib/diagramNodeLayout').DiagramDistributeMode
  nodeIds?: string[]
}
