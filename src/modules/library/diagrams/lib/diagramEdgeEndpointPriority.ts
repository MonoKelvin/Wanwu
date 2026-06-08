import type LogicFlow from '@logicflow/core'

const CANVAS_ACTIVE_CLASS = 'dg-edge-adjust-active'
const ENDPOINT_HIT_RADIUS = 16

let activeEdgeId: string | null = null
let adjustPointDragging = false
let suppressedNodeIds: string[] = []

function distSq(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx
  const dy = ay - by
  return dx * dx + dy * dy
}

export function findEdgeNearEndpoint(
  lf: LogicFlow,
  x: number,
  y: number,
  threshold = ENDPOINT_HIT_RADIUS
) {
  const scale = lf.getTransform().SCALE_X || 1
  const hit = threshold / Math.max(scale, 0.25)
  const limit = hit * hit
  let best: { id: string; d: number } | null = null
  for (const edge of lf.graphModel.edges) {
    const start = edge.startPoint
    const end = edge.endPoint
    const d = Math.min(distSq(x, y, start.x, start.y), distSq(x, y, end.x, end.y))
    if (d <= limit && (!best || d < best.d)) {
      best = { id: edge.id, d }
    }
  }
  return best ? lf.getEdgeModelById(best.id) : null
}

function restoreNodeAnchors(lf: LogicFlow, nodeIds: string[]) {
  for (const id of nodeIds) {
    const node = lf.getNodeModelById(id)
    if (!node) continue
    node.setIsShowAnchor(node.isHovered || node.isSelected)
  }
}

export function activateEdgeEndpointPriority(
  lf: LogicFlow,
  edgeId: string,
  container: HTMLElement | null
): void {
  if (activeEdgeId === edgeId) return

  if (activeEdgeId) {
    deactivateEdgeEndpointPriority(lf, container)
  }

  const edge = lf.getEdgeModelById(edgeId)
  if (!edge) return

  activeEdgeId = edgeId
  lf.graphModel.toFront(edgeId)
  edge.setHovered(true)

  suppressedNodeIds = [edge.sourceNodeId, edge.targetNodeId].filter(Boolean)
  for (const id of suppressedNodeIds) {
    lf.getNodeModelById(id)?.setIsShowAnchor(false)
  }
  container?.classList.add(CANVAS_ACTIVE_CLASS)
}

export function deactivateEdgeEndpointPriority(
  lf: LogicFlow,
  container: HTMLElement | null
): void {
  if (!activeEdgeId || adjustPointDragging) return

  const edge = lf.getEdgeModelById(activeEdgeId)
  if (edge && !edge.isSelected) {
    edge.setHovered(false)
  }

  restoreNodeAnchors(lf, suppressedNodeIds)
  suppressedNodeIds = []
  activeEdgeId = null
  container?.classList.remove(CANVAS_ACTIVE_CLASS)
}

export function suppressNodeAnchorIfEdgePriority(lf: LogicFlow, nodeId: string): void {
  if (!activeEdgeId || !suppressedNodeIds.includes(nodeId)) return
  lf.getNodeModelById(nodeId)?.setIsShowAnchor(false)
}

export function refreshEdgeEndpointPriorityFromPointer(
  lf: LogicFlow,
  clientX: number,
  clientY: number,
  container: HTMLElement | null
): void {
  const pt = lf.getPointByClient({ x: clientX, y: clientY }).canvasOverlayPosition
  const near = findEdgeNearEndpoint(lf, pt.x, pt.y)
  if (near) {
    activateEdgeEndpointPriority(lf, near.id, container)
    return
  }
  if (!activeEdgeId) return
  const edge = lf.getEdgeModelById(activeEdgeId)
  if (!edge?.isHovered) {
    deactivateEdgeEndpointPriority(lf, container)
  }
}

export function setAdjustPointDragging(dragging: boolean): void {
  adjustPointDragging = dragging
}

/** 端口拖拽结束后：恢复锚点抑制状态，避免误清除 hover */
export function finishAdjustPointDrag(lf: LogicFlow, container: HTMLElement | null): void {
  adjustPointDragging = false
  if (!activeEdgeId) return
  const edge = lf.getEdgeModelById(activeEdgeId)
  if (edge?.isHovered || edge?.isSelected) {
    for (const id of suppressedNodeIds) {
      lf.getNodeModelById(id)?.setIsShowAnchor(false)
    }
    container?.classList.add(CANVAS_ACTIVE_CLASS)
    return
  }
  deactivateEdgeEndpointPriority(lf, container)
}

export function resetEdgeEndpointPriority(
  lf: LogicFlow | null,
  container: HTMLElement | null
): void {
  adjustPointDragging = false
  if (!lf || !activeEdgeId) {
    activeEdgeId = null
    suppressedNodeIds = []
    container?.classList.remove(CANVAS_ACTIVE_CLASS)
    return
  }
  deactivateEdgeEndpointPriority(lf, container)
}
