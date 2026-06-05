import LogicFlow from '@logicflow/core'
import { Snapshot } from '@logicflow/extension'
import type { CanvasGraphPatch, IDiagramEditorPort } from '@modules/library/diagrams/interfaces/IDiagramEditorPort'
import {
  diagramAxisStyle,
  diagramCanvasBackground,
  diagramLogicFlowTheme,
  type DiagramCanvasTheme
} from '@modules/library/diagrams/lib/diagramCanvasTheme'
import { mountDiagramAxisOverlay } from '@modules/library/diagrams/lib/diagramAxisOverlay'
import {
  buildDiagramNodeConfig,
  getDiagramShapeById,
  registerAllDiagramShapes
} from '@modules/library/diagrams/lib/diagramShapeRegistry'

LogicFlow.use(Snapshot)

export class LogicFlowDiagramAdapter implements IDiagramEditorPort {
  private lf: LogicFlow | null = null
  private container: HTMLElement | null = null
  private selectionHandler: ((nodeId: string | null, text: string) => void) | null = null
  private graphChangeHandler: (() => void) | null = null
  private resolvedTheme: DiagramCanvasTheme = 'light'
  private teardownAxis: (() => void) | null = null

  mount(el: HTMLElement): void {
    this.container = el
    this.lf = new LogicFlow({
      container: el,
      grid: diagramLogicFlowTheme('light').grid as never,
      snapGrid: true,
      keyboard: { enabled: true },
      plugins: [Snapshot],
      disabledPlugins: ['control', 'miniMap']
    })
    registerAllDiagramShapes(this.lf)
    this.applyTheme()
    this.lf.render({ nodes: [], edges: [] })
    this.refreshAxisOverlay()
    this.lf.on('node:click', (args) => {
      const data = args.data
      this.selectionHandler?.(data.id, nodeTextValue(data.text))
    })
    this.lf.on('blank:click', () => {
      this.selectionHandler?.(null, '')
    })
    for (const evt of ['node:add', 'node:delete', 'edge:add', 'edge:delete', 'node:dragend', 'history:change'] as const) {
      this.lf.on(evt, () => this.graphChangeHandler?.())
    }
  }

  onSelectionChange(handler: (nodeId: string | null, text: string) => void): void {
    this.selectionHandler = handler
  }

  onGraphChange(handler: () => void): void {
    this.graphChangeHandler = handler
  }

  destroy(): void {
    this.teardownAxis?.()
    this.teardownAxis = null
    this.lf?.destroy()
    this.lf = null
    this.container = null
    this.selectionHandler = null
    this.graphChangeHandler = null
  }

  loadGraph(data: unknown): void {
    const graph = normalizeGraph(data)
    this.lf?.render(graph as never)
  }

  getGraph(): unknown {
    return this.lf?.getGraphData() ?? { nodes: [], edges: [] }
  }

  applyPatch(patch: CanvasGraphPatch): void {
    if (!this.lf) return
    for (const node of patch.addNodes ?? []) {
      this.lf.addNode(node as never)
    }
    for (const item of patch.updateNodes ?? []) {
      this.lf.setProperties(item.id, item.patch)
    }
    for (const id of patch.deleteNodeIds ?? []) {
      this.lf.deleteNode(id)
    }
    for (const edge of patch.addEdges ?? []) {
      this.lf.addEdge(edge as never)
    }
    for (const item of patch.updateEdges ?? []) {
      const edge = this.lf.getEdgeModelById(item.id)
      if (edge) Object.assign(edge, item.patch)
    }
    for (const id of patch.deleteEdgeIds ?? []) {
      this.lf.deleteEdge(id)
    }
  }

  setTheme(resolved: 'light' | 'dark'): void {
    this.resolvedTheme = resolved
    this.applyTheme()
    this.refreshAxisOverlay()
  }

  private applyTheme(): void {
    if (!this.lf) return
    const theme = diagramLogicFlowTheme(this.resolvedTheme)
    this.lf.setTheme(theme as never, this.resolvedTheme === 'dark' ? 'dark' : 'default')
    const graph = this.lf.getGraphData()
    if (graph.nodes?.length || graph.edges?.length) {
      this.lf.render(graph as never)
    }
  }

  private refreshAxisOverlay(): void {
    if (!this.lf) return
    this.teardownAxis?.()
    this.teardownAxis = mountDiagramAxisOverlay(this.lf, () => diagramAxisStyle(this.resolvedTheme))
  }

  async exportPng(): Promise<Blob> {
    const lf = this.lf
    if (!lf) throw new Error('画布未挂载')
    const ext = lf.extension.snapshot as unknown as {
      getSnapshot: (name?: string, opts?: { fileType?: string; backgroundColor?: string }) => Promise<string>
    }
    const dataUrl = await ext.getSnapshot('diagram', {
      fileType: 'png',
      backgroundColor: diagramCanvasBackground(this.resolvedTheme)
    })
    const res = await fetch(dataUrl)
    return res.blob()
  }

  async exportSvg(): Promise<string> {
    const lf = this.lf
    if (!lf) throw new Error('画布未挂载')
    const ext = lf.extension.snapshot as unknown as {
      getSnapshot: (name?: string, opts?: { fileType?: string }) => Promise<string>
    }
    return ext.getSnapshot('diagram', { fileType: 'svg' })
  }

  undo(): void {
    this.lf?.undo()
  }

  redo(): void {
    this.lf?.redo()
  }

  zoom(delta?: number, scale?: number): void {
    if (!this.lf) return
    if (typeof scale === 'number') {
      this.lf.zoom(scale)
      return
    }
    const d = delta ?? 0.1
    const current = this.lf.getTransform().SCALE_X
    this.lf.zoom(current + d)
  }

  zoomToFit(): void {
    this.lf?.fitView()
  }

  zoomReset(): void {
    this.lf?.resetZoom()
  }

  setGrid(visible: boolean, snap?: boolean): void {
    if (!this.lf) return
    this.lf.updateEditConfig({ snapGrid: snap ?? true })
    const theme = this.lf.getTheme()
    this.lf.setTheme({
      ...theme,
      grid: { ...(theme.grid as object), visible }
    })
  }

  selectAll(): void {
    this.lf?.selectAll()
  }

  clearSelection(): void {
    this.lf?.clearSelectElements()
  }

  select(nodeIds: string[], edgeIds?: string[], append?: boolean): void {
    if (!this.lf) return
    if (!append) this.lf.clearSelectElements()
    for (const id of nodeIds) this.lf.selectElementById(id)
    for (const id of edgeIds ?? []) this.lf.selectElementById(id)
  }

  deleteSelection(nodeIds?: string[], edgeIds?: string[]): void {
    if (!this.lf) return
    if (nodeIds?.length || edgeIds?.length) {
      for (const id of nodeIds ?? []) this.lf.deleteNode(id)
      for (const id of edgeIds ?? []) this.lf.deleteEdge(id)
      return
    }
    const selected = this.lf.getSelectElements()
    for (const node of selected.nodes) this.lf.deleteNode(node.id)
    for (const edge of selected.edges) this.lf.deleteEdge(edge.id)
  }

  copy(): void {
    // LogicFlow 内置剪贴板通过快捷键；v1.2 程序化复制用选中元素克隆
    if (!this.lf) return
    const selected = this.lf.getSelectElements()
    ;(this as { _clipboard?: unknown })._clipboard = structuredClone(selected)
  }

  paste(x?: number, y?: number): void {
    const clip = (this as { _clipboard?: { nodes: Array<{ id: string; type: string; x: number; y: number; text?: string; properties?: Record<string, unknown> }> } })._clipboard
    if (!clip || !this.lf) return
    const offsetX = x ?? 20
    const offsetY = y ?? 20
    const idMap = new Map<string, string>()
    for (const node of clip.nodes) {
      const newId = `${node.type}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
      idMap.set(node.id, newId)
      this.lf.addNode({
        id: newId,
        type: node.type,
        x: node.x + offsetX,
        y: node.y + offsetY,
        text: node.text,
        properties: node.properties
      })
    }
  }

  addNode(shape: string, x: number, y: number, text?: string, style?: Record<string, unknown>): string {
    if (!this.lf) throw new Error('画布未挂载')
    const shapeId = resolveDiagramShapeId(shape)
    const meta = getDiagramShapeById(shapeId)
    const lfType = meta?.lfType ?? shapeId
    const id = `${lfType}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    const config = buildDiagramNodeConfig(shapeId, x, y, text, style)
    this.lf.addNode({ ...config, id })
    return id
  }

  connect(sourceNodeId: string, targetNodeId: string, style?: Record<string, unknown>): string {
    if (!this.lf) throw new Error('画布未挂载')
    const edge = this.lf.addEdge({
      type: 'polyline',
      sourceNodeId,
      targetNodeId,
      ...style
    })
    return edge.id
  }

  updateNode(nodeId: string, patch: Record<string, unknown>): void {
    if (!this.lf) return
    const model = this.lf.getNodeModelById(nodeId)
    if (!model) return
    if ('text' in patch && typeof patch.text === 'string') {
      model.updateText(patch.text)
    }
    if ('x' in patch && typeof patch.x === 'number') model.x = patch.x
    if ('y' in patch && typeof patch.y === 'number') model.y = patch.y
    const props = patch.properties ?? patch.style
    if (props && typeof props === 'object') this.lf.setProperties(nodeId, props as Record<string, unknown>)
  }

  updateEdge(edgeId: string, patch: Record<string, unknown>): void {
    const edge = this.lf?.getEdgeModelById(edgeId)
    if (!edge) return
    Object.assign(edge, patch)
  }
}

function nodeTextValue(text: unknown): string {
  if (typeof text === 'string') return text
  if (text && typeof text === 'object' && 'value' in text) {
    return String((text as { value?: string }).value ?? '')
  }
  return ''
}

const LEGACY_SHAPE_IDS: Record<string, string> = {
  rect: 'dg-rect',
  circle: 'dg-circle',
  diamond: 'dg-decision',
  ellipse: 'dg-ellipse'
}

function resolveDiagramShapeId(shape: string): string {
  if (getDiagramShapeById(shape)) return shape
  return LEGACY_SHAPE_IDS[shape] ?? shape
}

function normalizeGraph(data: unknown): { nodes: unknown[]; edges: unknown[] } {
  if (!data || typeof data !== 'object') return { nodes: [], edges: [] }
  const g = data as { nodes?: unknown[]; edges?: unknown[] }
  return { nodes: g.nodes ?? [], edges: g.edges ?? [] }
}

