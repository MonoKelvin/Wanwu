export interface CanvasGraphPatch {
  addNodes?: unknown[]
  updateNodes?: Array<{ id: string; patch: Record<string, unknown> }>
  deleteNodeIds?: string[]
  addEdges?: unknown[]
  updateEdges?: Array<{ id: string; patch: Record<string, unknown> }>
  deleteEdgeIds?: string[]
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
  setGrid(visible: boolean, snap?: boolean): void
  selectAll(): void
  clearSelection(): void
  select(nodeIds: string[], edgeIds?: string[], append?: boolean): void
  deleteSelection(nodeIds?: string[], edgeIds?: string[]): void
  copy(): void
  paste(x?: number, y?: number): void
  addNode(shape: string, x: number, y: number, text?: string, style?: Record<string, unknown>): string
  connect(sourceNodeId: string, targetNodeId: string, style?: Record<string, unknown>): string
  updateNode(nodeId: string, patch: Record<string, unknown>): void
  updateEdge(edgeId: string, patch: Record<string, unknown>): void
  onSelectionChange?(handler: (nodeId: string | null, text: string) => void): void
  onGraphChange?(handler: () => void): void
}
