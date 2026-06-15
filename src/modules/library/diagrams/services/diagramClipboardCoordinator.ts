import type LogicFlow from '@logicflow/core'
import {
  runDiagramClipboardCopy,
  runDiagramClipboardPaste,
  type DiagramClipboardRuntime,
  type DiagramClipboardSession
} from '@modules/library/diagrams/lib/diagramClipboardActions'
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
  getLastCanvasPointerClient(): { x: number; y: number } | null
  prepareSelectionForCopy(): void
  collectLiveSelection(): { nodeIds: string[]; edgeIds: string[] }
  select(nodeIds: string[], edgeIds?: string[]): void
  scheduleGraphChange(): void
}

/**
 * 剪贴板协调器：仅持有 snapshot，复制/粘贴逻辑委托 diagramClipboardActions。
 */
export class DiagramClipboardCoordinator {
  private snapshot: DiagramClipboardPayload | null = null
  private pasteInProgress = false

  constructor(private readonly ports: DiagramClipboardCoordinatorPorts) {}

  private runtime(): DiagramClipboardRuntime {
    return {
      getLf: () => this.ports.getLf(),
      getContainer: () => this.ports.getContainer(),
      clientToCanvas: (x, y) => this.ports.clientToCanvas(x, y),
      getSnapGrid: () => this.ports.getSnapGrid(),
      getLastCanvasPointerClient: () => this.ports.getLastCanvasPointerClient(),
      prepareSelectionForCopy: () => this.ports.prepareSelectionForCopy(),
      select: (nodes, edges) => this.ports.select(nodes, edges)
    }
  }

  private session(): DiagramClipboardSession {
    return {
      getSnapshot: () => this.snapshot,
      setSnapshot: (value) => {
        this.snapshot = value
      }
    }
  }

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

  copy(): void {
    runDiagramClipboardCopy(this.runtime(), this.session())
  }

  paste(clientX?: number, clientY?: number): void {
    if (this.pasteInProgress) return
    this.pasteInProgress = true
    try {
      if (!runDiagramClipboardPaste(this.runtime(), this.session(), clientX, clientY)) return
      this.ports.scheduleGraphChange()
    } finally {
      queueMicrotask(() => {
        this.pasteInProgress = false
      })
    }
  }

  hasClipboard(): boolean {
    return !isDiagramClipboardPayloadEmpty(this.snapshot)
  }

  clear(): void {
    this.snapshot = null
  }
}
