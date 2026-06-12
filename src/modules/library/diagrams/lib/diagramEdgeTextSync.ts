import type LogicFlow from '@logicflow/core'
import type BaseEdgeModel from '@logicflow/core/es/model/edge/BaseEdgeModel'

type DiagramPoint = { x: number; y: number }
type DiagramRect = { left: number; right: number; top: number; bottom: number }

const BEZIER_SAMPLE_COUNT = 24
const EDGE_LABEL_NODE_PADDING = 8
const EDGE_LABEL_CLEARANCE_OFFSETS = [8, 12, 16, 20, 24] as const

function segmentLength(a: DiagramPoint, b: DiagramPoint): number {
  return Math.hypot(b.x - a.x, b.y - a.y)
}

function lerpPoint(a: DiagramPoint, b: DiagramPoint, t: number): DiagramPoint {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
}

function cubicBezierPoint(p0: DiagramPoint, p1: DiagramPoint, p2: DiagramPoint, p3: DiagramPoint, t: number): DiagramPoint {
  const u = 1 - t
  const uu = u * u
  const tt = t * t
  return {
    x: uu * u * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + tt * t * p3.x,
    y: uu * u * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + tt * t * p3.y
  }
}

function sampleBezierControlPoints(points: DiagramPoint[]): DiagramPoint[] {
  if (points.length < 4) return points.map((p) => ({ ...p }))
  const [p0, p1, p2, p3] = points
  const sampled: DiagramPoint[] = []
  for (let i = 0; i <= BEZIER_SAMPLE_COUNT; i++) {
    sampled.push(cubicBezierPoint(p0!, p1!, p2!, p3!, i / BEZIER_SAMPLE_COUNT))
  }
  return sampled
}

/** 收集边在画布上的折线采样点，用于标签定位 */
export function collectDiagramEdgePathPoints(model: BaseEdgeModel): DiagramPoint[] {
  const edge = model as BaseEdgeModel & {
    type?: string
    pointsList?: DiagramPoint[]
    startPoint?: DiagramPoint
    endPoint?: DiagramPoint
  }

  if (Array.isArray(edge.pointsList) && edge.pointsList.length >= 2) {
    const points = edge.pointsList.map((p) => ({ x: p.x, y: p.y }))
    if (edge.type === 'bezier' && points.length >= 4) {
      return sampleBezierControlPoints(points.slice(0, 4))
    }
    return points
  }

  if (edge.startPoint && edge.endPoint) {
    return [
      { x: edge.startPoint.x, y: edge.startPoint.y },
      { x: edge.endPoint.x, y: edge.endPoint.y }
    ]
  }

  return []
}

function buildPathSegments(points: DiagramPoint[]) {
  const segments: Array<{ a: DiagramPoint; b: DiagramPoint; len: number }> = []
  let total = 0
  for (let i = 0; i < points.length - 1; i++) {
    const len = segmentLength(points[i]!, points[i + 1]!)
    if (len <= 0) continue
    segments.push({ a: points[i]!, b: points[i + 1]!, len })
    total += len
  }
  return { segments, total }
}

export function pointAtDiagramEdgePathRatio(points: DiagramPoint[], ratio: number): DiagramPoint {
  if (points.length === 0) return { x: 0, y: 0 }
  if (points.length === 1) return { ...points[0]! }

  const clamped = Math.min(1, Math.max(0, ratio))
  const { segments, total } = buildPathSegments(points)
  if (total <= 0 || segments.length === 0) {
    return { ...points[Math.floor(points.length / 2)]! }
  }

  let remain = total * clamped
  for (const seg of segments) {
    if (remain <= seg.len) {
      return lerpPoint(seg.a, seg.b, remain / seg.len)
    }
    remain -= seg.len
  }

  const last = segments[segments.length - 1]!
  return { ...last.b }
}

function tangentAtDiagramEdgePathRatio(points: DiagramPoint[], ratio: number): DiagramPoint {
  const clamped = Math.min(1, Math.max(0, ratio))
  const { segments, total } = buildPathSegments(points)
  if (total <= 0 || segments.length === 0) {
    return { x: 1, y: 0 }
  }

  let remain = total * clamped
  for (const seg of segments) {
    if (remain <= seg.len || seg === segments[segments.length - 1]) {
      return { x: seg.b.x - seg.a.x, y: seg.b.y - seg.a.y }
    }
    remain -= seg.len
  }

  const last = segments[segments.length - 1]!
  return { x: last.b.x - last.a.x, y: last.b.y - last.a.y }
}

type DiagramNodeBounds = { x: number; y: number; width: number; height: number }

function nodeBoundsRect(node: DiagramNodeBounds, padding = EDGE_LABEL_NODE_PADDING): DiagramRect {
  return {
    left: node.x - node.width / 2 - padding,
    right: node.x + node.width / 2 + padding,
    top: node.y - node.height / 2 - padding,
    bottom: node.y + node.height / 2 + padding
  }
}

function rectsOverlap(a: DiagramRect, b: DiagramRect): boolean {
  return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom)
}

function estimateEdgeLabelHalfSize(model: BaseEdgeModel): { halfW: number; halfH: number } {
  const style = model.getTextStyle?.() ?? {}
  const fontSize = Number(style.fontSize ?? 12)
  const lineHeight = Number(style.lineHeight ?? 1.2)
  const value = String(model.text?.value ?? '')
  const lines = value.split(/\r?\n/)
  const maxLen = Math.max(...lines.map((line) => line.length), 1)
  const halfW = Math.min(96, maxLen * fontSize * 0.55) + 10
  const halfH = (lines.length * fontSize * lineHeight) / 2 + 8
  return { halfW, halfH }
}

function labelOverlapsNodes(
  center: DiagramPoint,
  halfW: number,
  halfH: number,
  nodes: DiagramNodeBounds[]
): boolean {
  const labelRect: DiagramRect = {
    left: center.x - halfW,
    right: center.x + halfW,
    top: center.y - halfH,
    bottom: center.y + halfH
  }
  return nodes.some((node) => rectsOverlap(labelRect, nodeBoundsRect(node)))
}

function collectEdgeEndpointNodes(model: BaseEdgeModel): DiagramNodeBounds[] {
  const edge = model as BaseEdgeModel & {
    sourceNode?: DiagramNodeBounds
    targetNode?: DiagramNodeBounds
  }
  const nodes: DiagramNodeBounds[] = []
  if (edge.sourceNode) nodes.push(edge.sourceNode)
  if (edge.targetNode) nodes.push(edge.targetNode)
  return nodes
}

function normalizeVector(v: DiagramPoint): DiagramPoint {
  const len = Math.hypot(v.x, v.y)
  if (len <= 1e-6) return { x: 0, y: 1 }
  return { x: v.x / len, y: v.y / len }
}

/** 在路径中点附近沿法线微调，避免标签与端点节点重叠 */
function adjustEdgeLabelClearance(
  model: BaseEdgeModel,
  center: DiagramPoint,
  tangent: DiagramPoint,
  nodes: DiagramNodeBounds[]
): DiagramPoint {
  const { halfW, halfH } = estimateEdgeLabelHalfSize(model)
  if (!nodes.length || !labelOverlapsNodes(center, halfW, halfH, nodes)) {
    return center
  }

  const normal = normalizeVector({ x: -tangent.y, y: tangent.x })
  const candidates: DiagramPoint[] = []

  for (const offset of EDGE_LABEL_CLEARANCE_OFFSETS) {
    candidates.push(
      { x: center.x + normal.x * offset, y: center.y + normal.y * offset },
      { x: center.x - normal.x * offset, y: center.y - normal.y * offset }
    )
  }

  let best = center
  let bestScore = Number.POSITIVE_INFINITY
  for (const candidate of candidates) {
    if (labelOverlapsNodes(candidate, halfW, halfH, nodes)) continue
    const score = Math.hypot(candidate.x - center.x, candidate.y - center.y)
    if (score < bestScore) {
      best = candidate
      bestScore = score
    }
  }

  return bestScore === Number.POSITIVE_INFINITY ? center : best
}

/** 计算边标签应处的画布坐标：始终取路径弧长中点，必要时法向微调防重叠 */
export function resolveDiagramEdgeTextPosition(model: BaseEdgeModel): DiagramPoint {
  const edge = model as BaseEdgeModel & { dbClickPosition?: DiagramPoint }
  const textValue = model.text?.value

  if (edge.dbClickPosition && !textValue) {
    return { x: edge.dbClickPosition.x, y: edge.dbClickPosition.y }
  }

  const points = collectDiagramEdgePathPoints(model)
  if (points.length >= 2) {
    const center = pointAtDiagramEdgePathRatio(points, 0.5)
    const tangent = tangentAtDiagramEdgePathRatio(points, 0.5)
    const nodes = collectEdgeEndpointNodes(model)
    return adjustEdgeLabelClearance(model, center, tangent, nodes)
  }

  return { x: model.text?.x ?? 0, y: model.text?.y ?? 0 }
}

export function syncDiagramEdgeTextPosition(model: BaseEdgeModel): void {
  const text = model.text
  if (!text?.value) return

  const pos = resolveDiagramEdgeTextPosition(model)
  if (!Number.isFinite(pos.x) || !Number.isFinite(pos.y)) return
  if (Math.abs(text.x - pos.x) < 0.5 && Math.abs(text.y - pos.y) < 0.5) return

  const edge = model as BaseEdgeModel & { customTextPosition?: boolean; resetTextPosition?: () => void }
  if (edge.customTextPosition && typeof edge.resetTextPosition === 'function') {
    edge.resetTextPosition()
    return
  }

  model.setText({ x: pos.x, y: pos.y })
}

export function syncDiagramEdgeTextById(lf: LogicFlow, edgeId: string): void {
  const model = lf.getEdgeModelById(edgeId)
  if (model) syncDiagramEdgeTextPosition(model)
}

export function syncDiagramEdgeTextsForNodeIds(lf: LogicFlow, nodeIds: readonly string[]): void {
  const seen = new Set<string>()
  for (const nodeId of nodeIds) {
    for (const edge of lf.graphModel.getNodeEdges(nodeId)) {
      if (seen.has(edge.id)) continue
      seen.add(edge.id)
      syncDiagramEdgeTextPosition(edge)
    }
  }
}

let pendingNodeIds: Set<string> | null = null
let syncMicrotaskQueued = false

function flushScheduledDiagramEdgeTextSync(lf: LogicFlow): void {
  syncMicrotaskQueued = false
  const ids = pendingNodeIds
  pendingNodeIds = null
  if (!ids?.size) return
  syncDiagramEdgeTextsForNodeIds(lf, [...ids])
}

/** 拖拽过程中在当前事件栈结束后再同步，覆盖 LF handleEdgeTextMove 的滞后修正 */
export function scheduleDiagramEdgeTextSyncForNodes(lf: LogicFlow, nodeIds: readonly string[]): void {
  if (!nodeIds.length) return
  if (!pendingNodeIds) pendingNodeIds = new Set()
  for (const id of nodeIds) pendingNodeIds.add(id)
  if (syncMicrotaskQueued) return

  syncMicrotaskQueued = true
  queueMicrotask(() => flushScheduledDiagramEdgeTextSync(lf))
}

export function cancelScheduledDiagramEdgeTextSync(): void {
  pendingNodeIds = null
  syncMicrotaskQueued = false
}
