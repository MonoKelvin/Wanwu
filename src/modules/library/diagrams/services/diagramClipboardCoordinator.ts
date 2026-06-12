import type LogicFlow from '@logicflow/core'
import {
  buildDiagramClipboardPayload,
  pasteDiagramClipboardPayload
} from '@modules/library/diagrams/lib/diagramClipboardEngine'
import {
  isDiagramClipboardPayloadEmpty,
  type DiagramClipboardPayload
} from '@modules/library/diagrams/lib/diagramClipboardPayload'
import { resolveDiagramClipboardTargets } from '@modules/library/diagrams/lib/diagramClipboard'

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
  private snapshot: DiagramClipboardPayload | null = null

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
    const live = this.ports.collectLiveSelection()
    const nodes = nodeIds?.length ? nodeIds : live.nodeIds
    const edges = edgeIds?.length ? edgeIds : live.edgeIds
    this.snapshot = buildDiagramClipboardPayload(lf, nodes, edges)
  }

  paste(clientX?: number, clientY?: number, fixedOffsetX?: number, fixedOffsetY?: number): void {
    const lf = this.ports.getLf()
    if (!lf || !this.snapshot) return
    pasteDiagramClipboardPayload(lf, this.snapshot, {
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
    if (isDiagramClipboardPayloadEmpty(this.snapshot)) return
    this.paste(undefined, undefined, offsetX, offsetY)
  }

  hasClipboard(): boolean {
    return !isDiagramClipboardPayloadEmpty(this.snapshot)
  }

  clear(): void {
    this.snapshot = null
  }
}
