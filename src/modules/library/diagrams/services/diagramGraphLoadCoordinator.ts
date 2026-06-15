import type LogicFlow from '@logicflow/core'
import { ensureDiagramShapeExtensions } from '@modules/library/diagrams/app/diagramShapeExtensions'
import { ensureAllGroupFramesAtBottom } from '@modules/library/diagrams/lib/diagramGroupBounds'
import {
  syncDiagramGroupMembershipFromFrames
} from '@modules/library/diagrams/lib/diagramGroupFrame'
import {
  normalizeDiagramGraph,
  reapplyLoadedDiagramGraphStyles,
  syncDiagramShapeExtensionsAfterLoad
} from '@modules/library/diagrams/lib/diagramGraphLoad'
import type { DiagramEditorSelectionBridge } from '@modules/library/diagrams/services/diagramEditorSelectionBridge'

export interface DiagramSelectionIds {
  nodeIds: string[]
  edgeIds: string[]
}

export interface DiagramGraphLoadCoordinatorPorts {
  getLf(): LogicFlow | null
  selectionBridge: DiagramEditorSelectionBridge
  refreshAxisOverlay(): void
  refreshMultiSelectOverlay(): void
  scheduleResize(): void
}

/** 图数据加载：迁移、渲染、样式恢复与组合框层级 */
export class DiagramGraphLoadCoordinator {
  constructor(private readonly ports: DiagramGraphLoadCoordinatorPorts) {}

  loadGraph(data: unknown, options?: { restoreSelection?: DiagramSelectionIds }): void {
    const lf = this.ports.getLf()
    if (!lf) return
    const graph = normalizeDiagramGraph(data)
    const registry = ensureDiagramShapeExtensions()
    const rawNodes = graph.nodes as Array<Record<string, unknown>>
    if (rawNodes.length) {
      graph.nodes = registry.migrateLegacyNodes(rawNodes as never)
    }
    lf.render(graph as never)
    reapplyLoadedDiagramGraphStyles(lf, graph)
    syncDiagramShapeExtensionsAfterLoad(lf, graph)
    this.ports.refreshAxisOverlay()
    this.ports.refreshMultiSelectOverlay()
    const restoreSelection = options?.restoreSelection
    if (restoreSelection) {
      lf.clearSelectElements()
      let append = false
      for (const id of restoreSelection.nodeIds) {
        if (!lf.getNodeModelById(id)) continue
        lf.selectElementById(id, append)
        append = true
      }
      for (const id of restoreSelection.edgeIds) {
        if (!lf.getEdgeModelById(id)) continue
        lf.selectElementById(id, true)
      }
      this.ports.selectionBridge.syncFromGraph(true)
    } else {
      this.ports.selectionBridge.setPrimarySelection(null, null)
      this.ports.selectionBridge.publishSelection()
    }
    requestAnimationFrame(() => this.ports.scheduleResize())
    syncDiagramGroupMembershipFromFrames(lf)
    ensureAllGroupFramesAtBottom(lf)
  }
}
