export type DiagramBoxPoint = [number, number]

export function isForwardBoxSelect(
  startX: number,
  startY: number,
  endX: number,
  endY: number
): boolean {
  return endX >= startX && endY >= startY
}

function rectsIntersect(
  aMinX: number,
  aMinY: number,
  aMaxX: number,
  aMaxY: number,
  bMinX: number,
  bMinY: number,
  bMaxX: number,
  bMaxY: number
): boolean {
  return !(aMaxX < bMinX || aMinX > bMaxX || aMaxY < bMinY || aMinY > bMaxY)
}

function pointInRect(x: number, y: number, minX: number, minY: number, maxX: number, maxY: number): boolean {
  return x >= minX && x <= maxX && y >= minY && y <= maxY
}

export function isNodeInSelectionBox(
  node: { x: number; y: number; width: number; height: number },
  leftTop: DiagramBoxPoint,
  rightBottom: DiagramBoxPoint,
  contain: boolean
): boolean {
  const selMinX = Math.min(leftTop[0], rightBottom[0])
  const selMinY = Math.min(leftTop[1], rightBottom[1])
  const selMaxX = Math.max(leftTop[0], rightBottom[0])
  const selMaxY = Math.max(leftTop[1], rightBottom[1])

  const nodeMinX = node.x - node.width / 2
  const nodeMaxX = node.x + node.width / 2
  const nodeMinY = node.y - node.height / 2
  const nodeMaxY = node.y + node.height / 2

  if (contain) {
    return (
      nodeMinX >= selMinX &&
      nodeMaxX <= selMaxX &&
      nodeMinY >= selMinY &&
      nodeMaxY <= selMaxY
    )
  }

  return rectsIntersect(nodeMinX, nodeMinY, nodeMaxX, nodeMaxY, selMinX, selMinY, selMaxX, selMaxY)
}

export function isEdgeInSelectionBox(
  edge: {
    startPoint?: { x: number; y: number }
    endPoint?: { x: number; y: number }
    pointsList?: Array<{ x: number; y: number }>
  },
  leftTop: DiagramBoxPoint,
  rightBottom: DiagramBoxPoint,
  contain: boolean
): boolean {
  const selMinX = Math.min(leftTop[0], rightBottom[0])
  const selMinY = Math.min(leftTop[1], rightBottom[1])
  const selMaxX = Math.max(leftTop[0], rightBottom[0])
  const selMaxY = Math.max(leftTop[1], rightBottom[1])

  const points = edge.pointsList?.length
    ? edge.pointsList
    : edge.startPoint && edge.endPoint
      ? [edge.startPoint, edge.endPoint]
      : []

  if (!points.length) return false

  if (contain) {
    return points.every((pt) => pointInRect(pt.x, pt.y, selMinX, selMinY, selMaxX, selMaxY))
  }

  for (const pt of points) {
    if (pointInRect(pt.x, pt.y, selMinX, selMinY, selMaxX, selMaxY)) return true
  }

  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]
    const b = points[i + 1]
    if (segmentIntersectsRect(a.x, a.y, b.x, b.y, selMinX, selMinY, selMaxX, selMaxY)) return true
  }

  return false
}

function segmentIntersectsRect(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  minX: number,
  minY: number,
  maxX: number,
  maxY: number
): boolean {
  if (pointInRect(ax, ay, minX, minY, maxX, maxY) || pointInRect(bx, by, minX, minY, maxX, maxY)) {
    return true
  }
  const edges: Array<[number, number, number, number]> = [
    [minX, minY, maxX, minY],
    [maxX, minY, maxX, maxY],
    [maxX, maxY, minX, maxY],
    [minX, maxY, minX, minY]
  ]
  for (const [x1, y1, x2, y2] of edges) {
    if (segmentsIntersect(ax, ay, bx, by, x1, y1, x2, y2)) return true
  }
  return false
}

function segmentsIntersect(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
  dx: number,
  dy: number
): boolean {
  const denom = (bx - ax) * (dy - cy) - (by - ay) * (dx - cx)
  if (denom === 0) return false
  const t = ((cx - ax) * (dy - cy) - (cy - ay) * (dx - cx)) / denom
  const u = ((cx - ax) * (by - ay) - (cy - ay) * (bx - ax)) / denom
  return t >= 0 && t <= 1 && u >= 0 && u <= 1
}
