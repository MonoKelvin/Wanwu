export const CANVAS_COMMAND_TYPES = [
  'canvas.addNode',
  'canvas.updateNode',
  'canvas.deleteSelection',
  'canvas.connect',
  'canvas.updateEdge',
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
  patch: Record<string, unknown>
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
  patch: Record<string, unknown>
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
