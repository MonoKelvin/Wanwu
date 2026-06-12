import type LogicFlow from '@logicflow/core'
import {
  buildSplitEdgeConfigs,
  findNearestEdgeIdAtPoint,
  isPointInsideNode,
  type DiagramEdgeInsertNode
} from '@modules/library/diagrams/lib/diagramEdgeInsert'
import { isGroupFrameType } from '@modules/library/diagrams/lib/diagramGroupFrame'
import { setEdgeInsertHighlightId } from '@modules/library/diagrams/lib/diagramShapeRegs'

export interface DiagramEdgeInsertCoordinatorPorts {
  getLf(): LogicFlow | null
  select(nodeIds: string[]): void
  scheduleGraphChange(): void
}

/**
 * 拖拽节点插入连线：高亮候选边、松手时拆分连线。
 */
export class DiagramEdgeInsertCoordinator {
  private highlightId: string | null = null
  private dragNodeIds: string[] = []
  private dragRaf: number | null = null

  constructor(private readonly ports: DiagramEdgeInsertCoordinatorPorts) {}

  dispose(): void {
    this.cancelDragRaf()
    this.setHighlight(null)
    this.dragNodeIds = []
  }

  beginDragForNode(nodeId: string, liveNodeIds: string[]): void {
    this.dragNodeIds = liveNodeIds.includes(nodeId)
      ? liveNodeIds.filter((id) => {
          const lf = this.ports.getLf()
          const node = lf?.getNodeModelById(id)
          return node && !isGroupFrameType(node.type)
        })
      : [nodeId]
  }

  scheduleHighlightAtNodeCenter(nodeId: string): void {
    if (this.dragRaf != null) return
    const dragIds = [...this.dragNodeIds]
    this.dragRaf = requestAnimationFrame(() => {
      this.dragRaf = null
      const lf = this.ports.getLf()
      if (!lf) return
      const dragged = lf.getNodeModelById(nodeId)
      if (!dragged) return
      const edgeId = this.findEdgeAtCanvasPoint(dragged.x, dragged.y, 16, {
        excludeNodeIds: dragIds
      })
      this.setHighlight(edgeId)
    })
  }

  finishDrop(nodeId: string): void {
    const highlightEdgeId = this.highlightId
    const dragNodeIds = [...this.dragNodeIds]
    this.dragNodeIds = []
    if (highlightEdgeId && dragNodeIds.length === 1) {
      this.insertExistingNodeOnEdge(dragNodeIds[0], highlightEdgeId)
    } else {
      this.setHighlight(null)
    }
  }

  clearDragState(nodeId: string): void {
    this.dragNodeIds = []
    this.cancelDragRaf()
  }

  findEdgeAtCanvasPoint(
    x: number,
    y: number,
    threshold = 14,
    options?: { excludeNodeIds?: string[] }
  ): string | null {
    const lf = this.ports.getLf()
    if (!lf) return null
    const exclude = new Set(options?.excludeNodeIds ?? [])
    const edgeId = findNearestEdgeIdAtPoint([...lf.graphModel.edges], x, y, threshold)
    if (!edgeId) return null
    const edge = lf.getEdgeModelById(edgeId)
    if (!edge) return null
    for (const model of lf.graphModel.nodes) {
      if (exclude.has(model.id)) continue
      if (model.id === edge.sourceNodeId || model.id === edge.targetNodeId) continue
      if (isPointInsideNode(model, x, y)) return null
    }
    return edgeId
  }

  setHighlight(edgeId: string | null): void {
    if (this.highlightId === edgeId) return
    const lf = this.ports.getLf()
    const prev = this.highlightId
    this.highlightId = edgeId
    setEdgeInsertHighlightId(edgeId)
    const refresh = (id: string | null) => {
      if (!id || !lf) return
      const model = lf.getEdgeModelById(id)
      if (model && 'setAttributes' in model && typeof model.setAttributes === 'function') {
        model.setAttributes()
      }
    }
    refresh(prev)
    refresh(edgeId)
  }

  insertExistingNodeOnEdge(nodeId: string, edgeId: string): boolean {
    const lf = this.ports.getLf()
    if (!lf) return false
    const edge = lf.getEdgeModelById(edgeId)
    if (!edge) {
      this.setHighlight(null)
      return false
    }
    const sourceNodeId = edge.sourceNodeId
    const targetNodeId = edge.targetNodeId
    if (!sourceNodeId || !targetNodeId || sourceNodeId === targetNodeId) {
      this.setHighlight(null)
      return false
    }
    if (nodeId === sourceNodeId || nodeId === targetNodeId) {
      this.setHighlight(null)
      return false
    }
    const insertModel = lf.getNodeModelById(nodeId)
    const sourceModel = lf.getNodeModelById(sourceNodeId)
    const targetModel = lf.getNodeModelById(targetNodeId)
    if (!insertModel || !sourceModel || !targetModel) {
      this.setHighlight(null)
      return false
    }

    const [firstEdge, secondEdge] = buildSplitEdgeConfigs(
      {
        type: edge.type,
        sourceNodeId,
        targetNodeId,
        properties: structuredClone(edge.properties ?? {}) as Record<string, unknown>,
        text: edge.text
      },
      insertModel as DiagramEdgeInsertNode,
      sourceModel as DiagramEdgeInsertNode,
      targetModel as DiagramEdgeInsertNode
    )

    lf.deleteEdge(edgeId)
    lf.addEdge(firstEdge as never)
    lf.addEdge(secondEdge as never)
    this.setHighlight(null)
    this.ports.select([nodeId])
    this.ports.scheduleGraphChange()
    return true
  }

  private cancelDragRaf(): void {
    if (this.dragRaf != null) {
      cancelAnimationFrame(this.dragRaf)
      this.dragRaf = null
    }
  }
}
