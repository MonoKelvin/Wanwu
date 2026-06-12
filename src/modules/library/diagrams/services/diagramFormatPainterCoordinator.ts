import type LogicFlow from '@logicflow/core'
import { DIAGRAM_CANVAS_FRAME_CLASS } from '@modules/library/diagrams/lib/diagramEditorConstants'
import { pickDiagramElementAtClient } from '@modules/library/diagrams/lib/diagramCanvasHitTest'
import {
  readEdgeStyleSnapshot,
  readNodeStyleSnapshot,
  type DiagramEdgeStyleSnapshot,
  type DiagramFormatPainterKind,
  type DiagramNodeStyleSnapshot
} from '@modules/library/diagrams/lib/diagramStyleClipboard'

export interface DiagramFormatPainterState {
  active: boolean
  kind: DiagramFormatPainterKind
  sourceId: string
  nodeSnapshot?: DiagramNodeStyleSnapshot
  edgeSnapshot?: DiagramEdgeStyleSnapshot
}

export interface DiagramFormatPainterCoordinatorPorts {
  getLf(): LogicFlow | null
  getCanvasFrameEl(): HTMLElement | null
  clientToCanvas(clientX: number, clientY: number): { x: number; y: number }
  getSelectedNodeIds(): string[]
  getSelectedEdgeIds(): string[]
  countSelectedNodes(): number
  getPrimaryNodeId(): string | null
  onSelectionChanged(): void
}

/**
 * 格式刷：快照捕获、光标样式、选区变更时自动关闭。
 * 应用样式仍由画布事件 bindDiagramCanvasEvents 处理。
 */
export class DiagramFormatPainterCoordinator {
  private state: DiagramFormatPainterState | null = null

  constructor(private readonly ports: DiagramFormatPainterCoordinatorPorts) {}

  getState(): DiagramFormatPainterState | null {
    return this.state?.active ? this.state : null
  }

  isActive(): boolean {
    return Boolean(this.state?.active)
  }

  start(): boolean {
    const lf = this.ports.getLf()
    if (!lf) return false

    const nodeIds = this.ports.getSelectedNodeIds()
    const edgeIds = this.ports.getSelectedEdgeIds()
    const nodeCount = this.ports.countSelectedNodes()
    const edgeCount = edgeIds.length

    if (nodeCount === 1 && edgeCount === 0) {
      const nodeId = this.ports.getPrimaryNodeId() ?? nodeIds[0]
      if (!nodeId) return false
      const snapshot = readNodeStyleSnapshot(lf, nodeId)
      if (!snapshot) return false
      this.state = {
        active: true,
        kind: 'node',
        sourceId: nodeId,
        nodeSnapshot: snapshot
      }
      this.syncCursorClasses()
      this.ports.onSelectionChanged()
      return true
    }

    if (edgeCount === 1 && nodeCount === 0) {
      const edgeId = edgeIds[0]
      if (!edgeId) return false
      const snapshot = readEdgeStyleSnapshot(lf, edgeId)
      if (!snapshot) return false
      this.state = {
        active: true,
        kind: 'edge',
        sourceId: edgeId,
        edgeSnapshot: snapshot
      }
      this.syncCursorClasses()
      this.ports.onSelectionChanged()
      return true
    }

    return false
  }

  cancel(): void {
    if (!this.state?.active) return
    this.state = null
    this.syncCursorClasses()
    this.ports.onSelectionChanged()
  }

  dispose(): void {
    this.state = null
    this.clearCursorClasses()
  }

  onPointerMove(clientX: number, clientY: number): void {
    this.updateCursorAt(clientX, clientY)
  }

  onPointerLeave(): void {
    this.updateCursorAt(0, 0)
  }

  /** 格式刷仅支持单图元或单连线；多选时自动关闭 */
  maybeCancelOnSelectionChange(): void {
    if (!this.state?.active) return
    const nodeCount = this.ports.countSelectedNodes()
    const edgeCount = this.ports.getSelectedEdgeIds().length
    const singleNode = nodeCount === 1 && edgeCount === 0
    const singleEdge = nodeCount === 0 && edgeCount === 1
    if (!singleNode && !singleEdge) {
      this.state = null
      this.syncCursorClasses()
    }
  }

  private syncCursorClasses(): void {
    const frame = this.ports.getCanvasFrameEl()
    if (!frame) return
    frame.classList.toggle(DIAGRAM_CANVAS_FRAME_CLASS.formatPainter, this.isActive())
    frame.classList.remove(DIAGRAM_CANVAS_FRAME_CLASS.formatPainterBlocked)
  }

  private clearCursorClasses(): void {
    const frame = this.ports.getCanvasFrameEl()
    if (!frame) return
    frame.classList.remove(
      DIAGRAM_CANVAS_FRAME_CLASS.formatPainter,
      DIAGRAM_CANVAS_FRAME_CLASS.formatPainterBlocked
    )
  }

  private updateCursorAt(clientX: number, clientY: number): void {
    const frame = this.ports.getCanvasFrameEl()
    if (!frame) return

    if (!this.state?.active) {
      this.clearCursorClasses()
      return
    }

    frame.classList.add(DIAGRAM_CANVAS_FRAME_CLASS.formatPainter)
    if (clientX === 0 && clientY === 0) {
      frame.classList.remove(DIAGRAM_CANVAS_FRAME_CLASS.formatPainterBlocked)
      return
    }

    const lf = this.ports.getLf()
    if (!lf) return

    const picked = pickDiagramElementAtClient(lf, clientX, clientY, (x, y) =>
      this.ports.clientToCanvas(x, y)
    )
    const blocked =
      (this.state.kind === 'node' && picked.kind === 'edge') ||
      (this.state.kind === 'edge' && picked.kind === 'node')
    frame.classList.toggle(DIAGRAM_CANVAS_FRAME_CLASS.formatPainterBlocked, blocked)
  }
}
