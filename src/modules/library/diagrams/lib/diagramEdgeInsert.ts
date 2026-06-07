export interface DiagramEdgeAnchor {
  x: number
  y: number
  id: string
}

export function distPointToSegmentSq(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number
): number {
  const dx = bx - ax
  const dy = by - ay
  if (dx === 0 && dy === 0) {
    const ox = px - ax
    const oy = py - ay
    return ox * ox + oy * oy
  }
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
  const cx = ax + t * dx
  const cy = ay + t * dy
  const ox = px - cx
  const oy = py - cy
  return ox * ox + oy * oy
}

export function minDistToEdgePolylineSq(
  points: Array<{ x: number; y: number }> | undefined,
  x: number,
  y: number
): number | null {
  if (!points?.length) return null
  let best = Infinity
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]
    const b = points[i + 1]
    best = Math.min(best, distPointToSegmentSq(x, y, a.x, a.y, b.x, b.y))
  }
  return Number.isFinite(best) ? best : null
}

export function isPointNearEdgePolyline(
  points: Array<{ x: number; y: number }> | undefined,
  x: number,
  y: number,
  threshold = 8
): boolean {
  const dist = minDistToEdgePolylineSq(points, x, y)
  if (dist == null) return false
  return dist <= threshold * threshold
}

export function isPointInsideNode(
  model: { x: number; y: number; width: number; height: number },
  x: number,
  y: number
): boolean {
  const halfW = model.width / 2
  const halfH = model.height / 2
  return x >= model.x - halfW && x <= model.x + halfW && y >= model.y - halfH && y <= model.y + halfH
}

export function findNearestEdgeIdAtPoint(
  edges: Array<{ id: string; pointsList?: Array<{ x: number; y: number }> }>,
  x: number,
  y: number,
  threshold = 14
): string | null {
  const t2 = threshold * threshold
  let bestId: string | null = null
  let bestDist = t2
  for (const edge of edges) {
    const dist = minDistToEdgePolylineSq(edge.pointsList, x, y)
    if (dist == null || dist > bestDist) continue
    bestDist = dist
    bestId = edge.id
  }
  return bestId
}

export function getNodeAnchors(model: {
  x: number
  y: number
  width: number
  height: number
  id: string
  anchors?: DiagramEdgeAnchor[]
}): DiagramEdgeAnchor[] {
  const anchors = model.anchors
  if (anchors?.length) return anchors
  const { x, y, width, height, id } = model
  const halfW = width / 2
  const halfH = height / 2
  return [
    { x, y: y - halfH, id: `${id}_0` },
    { x: x + halfW, y, id: `${id}_1` },
    { x, y: y + halfH, id: `${id}_2` },
    { x: x - halfW, y, id: `${id}_3` }
  ]
}

export function nearestAnchorId(anchors: DiagramEdgeAnchor[], refX: number, refY: number): string {
  let best = anchors[0]
  let bestDist = Infinity
  for (const anchor of anchors) {
    const dx = anchor.x - refX
    const dy = anchor.y - refY
    const dist = dx * dx + dy * dy
    if (dist < bestDist) {
      bestDist = dist
      best = anchor
    }
  }
  return best.id
}

export interface DiagramSplitEdgeInput {
  type: string
  sourceNodeId: string
  targetNodeId: string
  properties?: Record<string, unknown>
  text?: unknown
}

export function buildSplitEdgeConfigs(
  edge: DiagramSplitEdgeInput,
  insertNode: {
    id: string
    x: number
    y: number
    anchors?: DiagramEdgeAnchor[]
  },
  sourceNode: { id: string; x: number; y: number; width: number; height: number; anchors?: DiagramEdgeAnchor[] },
  targetNode: { id: string; x: number; y: number; width: number; height: number; anchors?: DiagramEdgeAnchor[] }
): [
  {
    type: string
    sourceNodeId: string
    targetNodeId: string
    sourceAnchorId: string
    targetAnchorId: string
    text?: unknown
    properties: Record<string, unknown>
  },
  {
    type: string
    sourceNodeId: string
    targetNodeId: string
    sourceAnchorId: string
    targetAnchorId: string
    properties: Record<string, unknown>
  }
] {
  const edgeProperties = structuredClone(edge.properties ?? {}) as Record<string, unknown>
  const sourceAnchorId = nearestAnchorId(getNodeAnchors(sourceNode), insertNode.x, insertNode.y)
  const insertTargetAnchorId = nearestAnchorId(getNodeAnchors(insertNode), sourceNode.x, sourceNode.y)
  const insertSourceAnchorId = nearestAnchorId(getNodeAnchors(insertNode), targetNode.x, targetNode.y)
  const targetAnchorId = nearestAnchorId(getNodeAnchors(targetNode), insertNode.x, insertNode.y)

  return [
    {
      type: edge.type,
      sourceNodeId: edge.sourceNodeId,
      targetNodeId: insertNode.id,
      sourceAnchorId,
      targetAnchorId: insertTargetAnchorId,
      text: edge.text,
      properties: structuredClone(edgeProperties)
    },
    {
      type: edge.type,
      sourceNodeId: insertNode.id,
      targetNodeId: edge.targetNodeId,
      sourceAnchorId: insertSourceAnchorId,
      targetAnchorId,
      properties: structuredClone(edgeProperties)
    }
  ]
}
