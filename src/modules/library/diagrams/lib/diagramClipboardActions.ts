import type LogicFlow from '@logicflow/core'
import { collectOrderedSelectionIds } from '@modules/library/diagrams/lib/diagramGroupSelection'
import { buildDiagramClipboardPayload, pasteDiagramClipboardPayload } from '@modules/library/diagrams/lib/diagramClipboardEngine'
import type { DiagramClipboardPayload } from '@modules/library/diagrams/lib/diagramClipboardPayload'
import {
  resolveDiagramCopySelectionFromLive
} from '@modules/library/diagrams/lib/diagramCopySelection'
import { resolveDiagramPasteClientPosition } from '@modules/library/diagrams/lib/diagramPastePosition'
import { finalizeStandalonePasteElements } from '@modules/library/diagrams/lib/diagramGroupFrame'
import { sanitizeSelectionIds } from '@modules/library/diagrams/lib/diagramSelectionSnapshot'

/** 剪贴板运行时依赖（快捷键 / 右键菜单 / 命令总线共用） */
export interface DiagramClipboardRuntime {
  getLf(): LogicFlow | null
  getContainer(): HTMLElement | null
  clientToCanvas(clientX: number, clientY: number): { x: number; y: number }
  getSnapGrid(): boolean
  getLastCanvasPointerClient(): { x: number; y: number } | null
  prepareSelectionForCopy(): void
  select(nodeIds: string[], edgeIds?: string[]): void
}

export interface DiagramClipboardSession {
  getSnapshot(): DiagramClipboardPayload | null
  setSnapshot(snapshot: DiagramClipboardPayload | null): void
}

function readLiveSelection(lf: LogicFlow): { nodeIds: string[]; edgeIds: string[] } {
  const raw = collectOrderedSelectionIds(lf)
  return sanitizeSelectionIds(lf, raw.nodeIds, raw.edgeIds)
}

/**
 * 复制唯一实现：不调用 syncFromGraph（避免框选快照把选区扩回整组）。
 */
export function runDiagramClipboardCopy(
  runtime: DiagramClipboardRuntime,
  session: DiagramClipboardSession
): DiagramClipboardPayload | null {
  const lf = runtime.getLf()
  if (!lf) return null

  runtime.prepareSelectionForCopy()

  const live = readLiveSelection(lf)
  const input = resolveDiagramCopySelectionFromLive(lf, live)
  const snapshot = buildDiagramClipboardPayload(lf, input.nodeIds, input.edgeIds)
  session.setSnapshot(snapshot)
  return snapshot
}

export interface DiagramClipboardPasteResult {
  nodeIds: string[]
  edgeIds: string[]
  groupFrameIds: string[]
}

/**
 * 粘贴唯一实现：快捷键 / 右键菜单 / 命令总线共用。
 */
export function runDiagramClipboardPaste(
  runtime: DiagramClipboardRuntime,
  session: DiagramClipboardSession,
  clientX?: number,
  clientY?: number
): DiagramClipboardPasteResult | null {
  const lf = runtime.getLf()
  const snapshot = session.getSnapshot()
  if (!lf || !snapshot?.elements.length) return null

  const anchor = resolveDiagramPasteClientPosition(
    clientX,
    clientY,
    runtime.getLastCanvasPointerClient()
  )
  const isStandaloneSnapshot = snapshot.groups.length === 0

  const result = pasteDiagramClipboardPayload(lf, snapshot, {
    clientX: anchor?.clientX,
    clientY: anchor?.clientY,
    clientToCanvas: (x, y) => runtime.clientToCanvas(x, y),
    getContainer: () => runtime.getContainer(),
    snapGrid: runtime.getSnapGrid(),
    select: (nodes, edges) => runtime.select(nodes, edges)
  })

  const pastedIds = [...result.nodeIds, ...result.edgeIds]
  if (isStandaloneSnapshot && pastedIds.length) {
    finalizeStandalonePasteElements(lf, pastedIds)
    requestAnimationFrame(() => {
      finalizeStandalonePasteElements(lf, pastedIds)
    })
    window.setTimeout(() => {
      finalizeStandalonePasteElements(lf, pastedIds)
    }, 0)
  }

  return result
}
