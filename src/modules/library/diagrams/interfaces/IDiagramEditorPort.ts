import type {
  DiagramCanvasSettings,
  DiagramEdgeProperties,
  DiagramEditorSelection,
  DiagramNodeProperties
} from '@modules/library/diagrams/lib/diagramSelectionTypes'

export interface CanvasGraphPatch {
  addNodes?: unknown[]
  updateNodes?: Array<{ id: string; patch: Record<string, unknown> }>
  deleteNodeIds?: string[]
  addEdges?: unknown[]
  updateEdges?: Array<{ id: string; patch: Record<string, unknown> }>
  deleteEdgeIds?: string[]
}

export interface DiagramViewport {
  x: number
  y: number
  zoom: number
}

export interface CanvasPoint {
  x: number
  y: number
}

export interface IDiagramEditorPort {
  mount(el: HTMLElement): void
  destroy(): void
  loadGraph(data: unknown): void
  getGraph(): unknown
  applyPatch(patch: CanvasGraphPatch): void
  setTheme(resolved: 'light' | 'dark'): void
  exportPng(): Promise<Blob>
  exportSvg(): Promise<string>
  undo(): void
  redo(): void
  zoom(delta?: number, scale?: number): void
  zoomToFit(): void
  zoomReset(): void
  resize(): void
  centerOrigin(): void
  getViewport(): DiagramViewport
  applyViewport(viewport: DiagramViewport): void
  setGrid(visible: boolean, snap?: boolean): void
  selectAll(): void
  clearSelection(): void
  select(nodeIds: string[], edgeIds?: string[], append?: boolean): void
  deleteSelection(nodeIds?: string[], edgeIds?: string[]): void
  copy(): void
  paste(x?: number, y?: number): void
  duplicate(
    offsetX?: number,
    offsetY?: number,
    nodeIds?: string[],
    edgeIds?: string[]
  ): void
  groupSelection(nodeIds?: string[], edgeIds?: string[]): void
  ungroupSelection(): void
  canUngroupSelection(): boolean
  canGroupSelection(): boolean
  addNode(shape: string, x: number, y: number, text?: string, style?: Record<string, unknown>): string
  addNodeOnEdge(
    shape: string,
    x: number,
    y: number,
    edgeId: string,
    text?: string,
    style?: Record<string, unknown>
  ): string
  findEdgeAtCanvasPoint(
    x: number,
    y: number,
    threshold?: number,
    options?: { excludeNodeIds?: string[] }
  ): string | null
  insertExistingNodeOnEdge(nodeId: string, edgeId: string): boolean
  setEdgeInsertHighlight(edgeId: string | null): void
  connect(sourceNodeId: string, targetNodeId: string, style?: Record<string, unknown>): string
  updateNode(nodeId: string, patch: Record<string, unknown>): void
  updateEdge(edgeId: string, patch: Record<string, unknown>): void
  clientToCanvas(clientX: number, clientY: number): CanvasPoint
  getMultiSelectOverlayRect(): {
    left: number
    top: number
    width: number
    height: number
  } | null
  getSelection(): DiagramEditorSelection
  getSelectedNodeIds(): string[]
  getSelectedEdgeIds(): string[]
  hasClipboard(): boolean
  alignNodes(mode: import('@modules/library/diagrams/lib/diagramNodeLayout').DiagramAlignMode, nodeIds?: string[]): void
  distributeNodes(
    mode: import('@modules/library/diagrams/lib/diagramNodeLayout').DiagramDistributeMode,
    nodeIds?: string[]
  ): void
  nudgeSelection(dx: number, dy: number, nodeIds?: string[]): void
  bringNodesToFront(nodeIds?: string[]): void
  sendNodesToBack(nodeIds?: string[]): void
  batchUpdateNodeProperties(
    nodeProps: Partial<DiagramNodeProperties>,
    nodeIds?: string[]
  ): void
  batchUpdateEdgeProperties(
    edgeProps: Partial<DiagramEdgeProperties>,
    edgeIds?: string[]
  ): void
  updateNodeProperties(props: Partial<DiagramNodeProperties> & { id: string }): void
  updateEdgeProperties(props: Partial<DiagramEdgeProperties> & { id: string }): void
  getCanvasSettings(): DiagramCanvasSettings
  applyCanvasSettings(settings: Partial<DiagramCanvasSettings>): void
  loadCanvasSettings(settings: DiagramCanvasSettings | undefined): void
  onEditorSelectionChange?(handler: (selection: DiagramEditorSelection) => void): void
  onGraphChange?(handler: () => void): void
  onViewportChange?(handler: () => void): void
  onOverlayLayoutChange?(handler: () => void): void
  onContextMenu?(
    handler: (detail: {
      event: MouseEvent
      kind: 'node' | 'edge' | 'blank'
      targetId?: string
      nodeIds: string[]
      edgeIds: string[]
    }) => void
  ): void
  focusCanvas?(): void
}
