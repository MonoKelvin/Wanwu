import type LogicFlow from '@logicflow/core'
import { collectOrderedSelectionIds } from '@modules/library/diagrams/lib/diagramGroupSelection'
import {
  isGroupFrameType,
  clearGroupFramePointerInside,
  resolveGroupFrameIdForElement,
  setGroupFramePointerInside,
  syncGroupFramePointerHover
} from '@modules/library/diagrams/lib/diagramGroupFrame'
import {
  ensureAllGroupFramesAtBottom,
  syncGroupFrameBounds,
  syncGroupFramesForNodes
} from '@modules/library/diagrams/lib/diagramGroupBounds'
import { filterAlignableNodeIds } from '@modules/library/diagrams/lib/diagramSelectionSnapshot'

export interface DiagramGroupFrameCoordinatorPorts {
  getLf(): LogicFlow | null
  clientToCanvas(clientX: number, clientY: number): { x: number; y: number }
  onPointerMove(clientX: number, clientY: number): void
  onPointerLeave(): void
}

/**
 * 组合框：拖拽联动、悬停显隐、z-index 置底、边界同步。
 */
export class DiagramGroupFrameCoordinator {
  private dragLastPos = new Map<string, { x: number; y: number }>()
  private bottomRaf: number | null = null
  private syncDragRaf: number | null = null
  private hoverRaf = 0
  private lastPointerClient = { x: 0, y: 0 }
  private teardownHover: (() => void) | null = null

  constructor(private readonly ports: DiagramGroupFrameCoordinatorPorts) {}

  dispose(): void {
    this.teardownHover?.()
    this.teardownHover = null
    if (this.bottomRaf != null) {
      cancelAnimationFrame(this.bottomRaf)
      this.bottomRaf = null
    }
    if (this.syncDragRaf != null) {
      cancelAnimationFrame(this.syncDragRaf)
      this.syncDragRaf = null
    }
    if (this.hoverRaf) cancelAnimationFrame(this.hoverRaf)
    this.dragLastPos.clear()
    clearGroupFramePointerInside()
  }

  bindPointerHover(el: HTMLElement): () => void {
    const lf = this.ports.getLf()
    const onMove = (event: PointerEvent) => {
      this.scheduleHoverUpdate(event.clientX, event.clientY)
    }
    const onEnter = (event: PointerEvent) => {
      this.scheduleHoverUpdate(event.clientX, event.clientY)
    }
    const onLeave = () => {
      clearGroupFramePointerInside()
      this.refreshDisplay()
      this.ports.onPointerLeave()
    }
    const onNodeEnter = ({ data }: { data: { id: string } }) => {
      this.markHoverFromElement(data.id, 'node')
    }
    const onNodeLeave = () => {
      this.scheduleHoverUpdate(this.lastPointerClient.x, this.lastPointerClient.y)
    }
    const onEdgeEnter = ({ data }: { data: { id: string } }) => {
      this.markHoverFromElement(data.id, 'edge')
    }
    const onEdgeLeave = () => {
      this.scheduleHoverUpdate(this.lastPointerClient.x, this.lastPointerClient.y)
    }

    el.addEventListener('pointermove', onMove, { passive: true })
    el.addEventListener('pointerenter', onEnter)
    el.addEventListener('pointerleave', onLeave)
    lf?.on('node:mouseenter', onNodeEnter)
    lf?.on('node:mouseleave', onNodeLeave)
    lf?.on('edge:mouseenter', onEdgeEnter)
    lf?.on('edge:mouseleave', onEdgeLeave)

    this.teardownHover = () => {
      if (this.hoverRaf) cancelAnimationFrame(this.hoverRaf)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerenter', onEnter)
      el.removeEventListener('pointerleave', onLeave)
      lf?.off('node:mouseenter', onNodeEnter)
      lf?.off('node:mouseleave', onNodeLeave)
      lf?.off('edge:mouseenter', onEdgeEnter)
      lf?.off('edge:mouseleave', onEdgeLeave)
      clearGroupFramePointerInside()
    }
    return this.teardownHover
  }

  scheduleToBottom(): void {
    const lf = this.ports.getLf()
    if (!lf || this.bottomRaf != null) return
    this.bottomRaf = requestAnimationFrame(() => {
      this.bottomRaf = requestAnimationFrame(() => {
        this.bottomRaf = null
        const current = this.ports.getLf()
        if (current) ensureAllGroupFramesAtBottom(current)
      })
    })
  }

  refreshDisplay(): void {
    const lf = this.ports.getLf()
    if (!lf) return
    for (const model of lf.graphModel.nodes) {
      if (!isGroupFrameType(model.type)) continue
      const nodeStyle = model.getNodeStyle() as {
        fill?: string
        stroke?: string
        strokeWidth?: number
        strokeDasharray?: string
      }
      model.setStyles({
        fill: nodeStyle.fill,
        stroke: nodeStyle.stroke,
        strokeWidth: nodeStyle.strokeWidth,
        strokeDasharray: nodeStyle.strokeDasharray
      })
      if ('setAttributes' in model && typeof model.setAttributes === 'function') {
        ;(model as { setAttributes: () => void }).setAttributes()
      }
    }
  }

  syncForNodeIds(nodeIds: string[]): void {
    const lf = this.ports.getLf()
    if (!lf || !nodeIds.length) return
    syncGroupFramesForNodes(lf, nodeIds)
    this.refreshDisplay()
  }

  scheduleSyncDuringDrag(triggerNodeId?: string): void {
    if (this.syncDragRaf != null) return
    this.syncDragRaf = requestAnimationFrame(() => {
      this.syncDragRaf = null
      const lf = this.ports.getLf()
      if (!lf) return
      const contentSelected = filterAlignableNodeIds(lf, collectOrderedSelectionIds(lf).nodeIds)
      let syncIds: string[]
      if (triggerNodeId) {
        syncIds =
          contentSelected.length >= 2 && contentSelected.includes(triggerNodeId)
            ? contentSelected
            : [triggerNodeId]
      } else {
        syncIds = contentSelected
      }
      if (!syncIds.length) return
      this.syncForNodeIds(syncIds)
    })
  }

  prepareFrameDragStart(nodeId: string): void {
    const lf = this.ports.getLf()
    if (!lf) return
    const model = lf.getNodeModelById(nodeId)
    if (!model || !isGroupFrameType(model.type)) return
    const liveNodeIds = collectOrderedSelectionIds(lf).nodeIds
    const members = new Set((model.properties?.dgGroupMembers as string[] | undefined) ?? [])
    const stray = liveNodeIds.filter((id) => id !== nodeId && !members.has(id))
    if (stray.length) {
      lf.clearSelectElements()
      lf.selectElementById(nodeId)
    }
    this.dragLastPos.set(nodeId, { x: model.x, y: model.y })
  }

  /** @returns 是否已处理组合框拖拽（调用方应跳过后续节点拖拽逻辑） */
  handleFrameDrag(nodeId: string): boolean {
    const lf = this.ports.getLf()
    if (!lf) return false
    const model = lf.getNodeModelById(nodeId)
    if (!model || !isGroupFrameType(model.type)) return false
    const last = this.dragLastPos.get(nodeId)
    if (!last) return true
    const dx = model.x - last.x
    const dy = model.y - last.y
    if (dx !== 0 || dy !== 0) {
      const members = (model.properties?.dgGroupMembers as string[] | undefined) ?? []
      if (members.length) {
        lf.graphModel.moveNodes(members, dx, dy, true)
      }
      syncGroupFrameBounds(lf, nodeId)
      const synced = lf.getNodeModelById(nodeId)
      if (synced) {
        this.dragLastPos.set(nodeId, { x: synced.x, y: synced.y })
      }
    }
    return true
  }

  clearDragPosition(nodeId: string): void {
    this.dragLastPos.delete(nodeId)
  }

  private scheduleHoverUpdate(clientX: number, clientY: number): void {
    this.lastPointerClient = { x: clientX, y: clientY }
    if (this.hoverRaf) return
    this.hoverRaf = requestAnimationFrame(() => {
      this.hoverRaf = 0
      this.updatePointerHover(this.lastPointerClient.x, this.lastPointerClient.y)
      this.ports.onPointerMove(this.lastPointerClient.x, this.lastPointerClient.y)
    })
  }

  private updatePointerHover(clientX: number, clientY: number): void {
    const lf = this.ports.getLf()
    if (!lf) return
    this.lastPointerClient = { x: clientX, y: clientY }
    const { x, y } = this.ports.clientToCanvas(clientX, clientY)
    syncGroupFramePointerHover(lf, x, y)
    this.refreshDisplay()
  }

  private markHoverFromElement(elementId: string, kind: 'node' | 'edge'): void {
    const lf = this.ports.getLf()
    if (!lf) return
    const groupId = resolveGroupFrameIdForElement(lf, elementId, kind)
    if (groupId) {
      for (const model of lf.graphModel.nodes) {
        if (!isGroupFrameType(model.type)) continue
        setGroupFramePointerInside(model.id, model.id === groupId)
      }
      this.refreshDisplay()
      return
    }
    this.updatePointerHover(this.lastPointerClient.x, this.lastPointerClient.y)
  }
}
