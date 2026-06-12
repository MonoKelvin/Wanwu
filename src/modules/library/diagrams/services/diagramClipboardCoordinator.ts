import type LogicFlow from '@logicflow/core'
import {
  buildDiagramClipboardSnapshot,
  pasteDiagramClipboardSnapshot,
  resolveDiagramClipboardTargets,
  type DiagramClipboardSnapshot
} from '@modules/library/diagrams/lib/diagramClipboard'

export interface DiagramClipboardCoordinatorPorts {
  getLf(): LogicFlow | null
  getContainer(): HTMLElement | null
  clientToCanvas(clientX: number, clientY: number): { x: number; y: number }
  getSnapGrid(): boolean
  collectLiveSelection(): { nodeIds: string[]; edgeIds: string[] }
  select(nodeIds: string[], edgeIds?: string[]): void
  scheduleGraphChange(): void
}

/**
 * 剪贴板：复制/粘贴/副本；快照构建与目标解析委托 lib/diagramClipboard。
 */
export class DiagramClipboardCoordinator {
  private snapshot: DiagramClipboardSnapshot | null = null

  constructor(private readonly ports: DiagramClipboardCoordinatorPorts) {}

  resolveTargets(
    nodeIds?: string[],
    edgeIds?: string[]
  ): { nodeIds: string[]; edgeIds: string[] } {
    const lf = this.ports.getLf()
    if (!lf) return { nodeIds: [], edgeIds: [] }
    const live = this.ports.collectLiveSelection()
    return resolveDiagramClipboardTargets(lf, {
      nodeIds,
      edgeIds,
      liveNodeIds: live.nodeIds,
      liveEdgeIds: live.edgeIds
    })
  }

  copy(nodeIds?: string[], edgeIds?: string[]): void {
    const lf = this.ports.getLf()
    if (!lf) return
    const targets = this.resolveTargets(nodeIds, edgeIds)
    this.snapshot = buildDiagramClipboardSnapshot(lf, targets)
  }

  paste(clientX?: number, clientY?: number, fixedOffsetX?: number, fixedOffsetY?: number): void {
    const lf = this.ports.getLf()
    if (!lf || !this.snapshot) return
    pasteDiagramClipboardSnapshot(lf, this.snapshot, {
      clientX,
      clientY,
      fixedOffsetX,
      fixedOffsetY,
      clientToCanvas: (x, y) => this.ports.clientToCanvas(x, y),
      getContainer: () => this.ports.getContainer(),
      snapGrid: this.ports.getSnapGrid(),
      select: (nodes, edges) => this.ports.select(nodes, edges)
    })
    this.ports.scheduleGraphChange()
  }

  duplicate(
    offsetX = 20,
    offsetY = 20,
    nodeIds?: string[],
    edgeIds?: string[]
  ): void {
    this.copy(nodeIds, edgeIds)
    if (!this.snapshot?.nodes.length && !this.snapshot?.edges.length) return
    this.paste(undefined, undefined, offsetX, offsetY)
  }

  hasClipboard(): boolean {
    return Boolean(this.snapshot?.nodes.length || this.snapshot?.edges.length)
  }

  clear(): void {
    this.snapshot = null
  }
}
