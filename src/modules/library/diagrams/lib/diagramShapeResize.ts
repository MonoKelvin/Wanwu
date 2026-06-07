import type LogicFlow from '@logicflow/core'

export type PolyPoint = [number, number]

/** 图元缩放控制点样式（适配深浅主题） */
export function diagramResizeControlStyle(): {
  width: number
  height: number
  fill: string
  stroke: string
} {
  const isDark = document.documentElement.dataset.theme === 'dark'
  return {
    width: 6,
    height: 6,
    fill: isDark ? '#2a2a2e' : '#ffffff',
    stroke: isDark ? '#6a6a72' : '#8a8a92'
  }
}

/** 是否已有持久化尺寸（拖拽缩放、属性面板、保存重开） */
export function hasPersistedNodeSize(data: LogicFlow.NodeConfig): boolean {
  const p = (data.properties ?? {}) as Record<string, unknown>
  const nodeSize = p.nodeSize as Record<string, unknown> | undefined
  if (
    nodeSize?.width != null ||
    nodeSize?.height != null ||
    nodeSize?.rx != null ||
    nodeSize?.ry != null
  ) {
    return true
  }
  if (p.width != null || p.height != null || p.rx != null || p.ry != null) {
    return true
  }
  const raw = data as { width?: number; height?: number }
  return (raw.width != null && raw.width > 0) || (raw.height != null && raw.height > 0)
}

export function applyDefaultRectSize(
  model: { width: number; height: number; radius?: number },
  data: LogicFlow.NodeConfig,
  defaults: { width: number; height: number; radius?: number }
): void {
  if (!hasPersistedNodeSize(data)) {
    model.width = defaults.width
    model.height = defaults.height
    if (defaults.radius != null) {
      model.radius = defaults.radius
    }
  }
}

export function applyDefaultEllipseRadii(
  model: { rx: number; ry: number },
  data: LogicFlow.NodeConfig,
  defaults: { rx: number; ry: number }
): void {
  if (!hasPersistedNodeSize(data)) {
    model.rx = defaults.rx
    model.ry = defaults.ry
  }
}

export function centerPolygonPoints(points: PolyPoint[]): {
  points: PolyPoint[]
  width: number
  height: number
} {
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  for (const [px, py] of points) {
    minX = Math.min(minX, px)
    maxX = Math.max(maxX, px)
    minY = Math.min(minY, py)
    maxY = Math.max(maxY, py)
  }
  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  return {
    points: points.map(([px, py]) => [px - cx, py - cy] as PolyPoint),
    width: maxX - minX,
    height: maxY - minY
  }
}

export function resolvePolygonGeometry(
  data: LogicFlow.NodeConfig,
  templatePoints: PolyPoint[]
): { points: PolyPoint[]; basisW: number; basisH: number } {
  const template = centerPolygonPoints(templatePoints)
  const props = (data.properties ?? {}) as Record<string, unknown>
  const stored = props.dgPolyPoints as PolyPoint[] | undefined
  const basisW = Number(props.dgPolyBasisW)
  const basisH = Number(props.dgPolyBasisH)

  if (!stored || !Array.isArray(stored) || stored.length < 3) {
    return { points: template.points, basisW: template.width, basisH: template.height }
  }

  if (!props.dgPolyCentered) {
    const centered = centerPolygonPoints(stored)
    return { points: centered.points, basisW: centered.width, basisH: centered.height }
  }

  return {
    points: stored,
    basisW: Number.isFinite(basisW) && basisW > 0 ? basisW : template.width,
    basisH: Number.isFinite(basisH) && basisH > 0 ? basisH : template.height
  }
}

type SizedNodeModel = {
  width: number
  height: number
  rx?: number
  ry?: number
  setProperties: (props: Record<string, unknown>) => void
}

function isRadiiBasedNode(model: SizedNodeModel): boolean {
  return typeof model.rx === 'number' && typeof model.ry === 'number'
}

/** 写入宽高并同步 nodeSize，供属性面板与粘贴使用 */
export function applyNodeDimensions(model: SizedNodeModel, width: number, height: number): void {
  if (isRadiiBasedNode(model)) {
    model.rx = width / 2
    model.ry = height / 2
    model.setProperties({
      nodeSize: { rx: model.rx, ry: model.ry },
      rx: model.rx,
      ry: model.ry,
      width,
      height
    })
    return
  }
  model.width = width
  model.height = height
  model.setProperties({
    nodeSize: { width, height },
    width,
    height
  })
}
