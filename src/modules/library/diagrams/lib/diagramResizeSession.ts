/** 单图元缩放拖拽会话：用于跳过重操作、在结束时统一吸附 */
let active = false
let activeNodeId: string | null = null
let activeHandleIndex: number | null = null
let activeFixedAnchor: { x: number; y: number } | null = null

export type DiagramResizeSessionEndHandler = (ctx: {
  nodeId: string
  handleIndex: number
}) => void

export type DiagramResizeSessionStartHandler = (ctx: {
  nodeId: string
  handleIndex: number
}) => void

const endHandlers = new Set<DiagramResizeSessionEndHandler>()
const startHandlers = new Set<DiagramResizeSessionStartHandler>()

export function isDiagramResizeSessionActive(): boolean {
  return active
}

export function getDiagramResizeSession(): { nodeId: string; handleIndex: number } | null {
  if (!active || activeNodeId == null || activeHandleIndex == null) return null
  return { nodeId: activeNodeId, handleIndex: activeHandleIndex }
}

export function getDiagramResizeFixedAnchor(): { x: number; y: number } | null {
  return activeFixedAnchor
}

export function beginDiagramResizeSession(
  nodeId: string,
  handleIndex: number,
  fixedAnchor?: { x: number; y: number }
): void {
  active = true
  activeNodeId = nodeId
  activeHandleIndex = handleIndex
  activeFixedAnchor = fixedAnchor ?? null
  const ctx = { nodeId, handleIndex }
  for (const handler of startHandlers) handler(ctx)
}

export function endDiagramResizeSession(): void {
  if (!active || activeNodeId == null || activeHandleIndex == null) {
    active = false
    activeNodeId = null
    activeHandleIndex = null
    activeFixedAnchor = null
    return
  }
  const ctx = { nodeId: activeNodeId, handleIndex: activeHandleIndex }
  active = false
  activeNodeId = null
  activeHandleIndex = null
  activeFixedAnchor = null
  for (const handler of endHandlers) handler(ctx)
}

export function onDiagramResizeSessionEnd(handler: DiagramResizeSessionEndHandler): () => void {
  endHandlers.add(handler)
  return () => {
    endHandlers.delete(handler)
  }
}

export function onDiagramResizeSessionStart(handler: DiagramResizeSessionStartHandler): () => void {
  startHandlers.add(handler)
  return () => {
    startHandlers.delete(handler)
  }
}
