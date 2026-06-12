import type LogicFlow from '@logicflow/core'
import {
  isDiagramShapePayloadEnvelope,
  syncShapeExtensionNodeAfterLoad
} from '@modules/library/diagrams/domain/shape-extension'
import { applyNodeDimensions } from '@modules/library/diagrams/lib/diagramShapeResize'
import {
  applyEdgeProperties,
  applyNodeProperties,
  normalizeEdgeStyleProperties,
  normalizeNodeStyleProperties,
  readEdgeProperties,
  readNodeProperties
} from '@modules/library/diagrams/lib/diagramStyleBridge'

export interface DiagramGraphData {
  nodes: unknown[]
  edges: unknown[]
}

export function normalizeDiagramGraph(data: unknown): DiagramGraphData {
  if (!data || typeof data !== 'object') return { nodes: [], edges: [] }
  const g = data as { nodes?: unknown[]; edges?: unknown[] }
  return { nodes: g.nodes ?? [], edges: g.edges ?? [] }
}

/** 加载后为带 dgShape 的节点同步布局与文本 */
export function syncDiagramShapeExtensionsAfterLoad(
  lf: LogicFlow,
  sourceGraph?: { nodes?: unknown[] }
): void {
  const rawNodes = (sourceGraph?.nodes ?? []) as Array<{
    id: string
    properties?: Record<string, unknown>
  }>
  for (const raw of rawNodes) {
    if (!isDiagramShapePayloadEnvelope(raw.properties?.dgShape)) continue
    syncShapeExtensionNodeAfterLoad(lf, raw.id)
  }
}

/** 加载后规范化样式属性并恢复尺寸 */
export function reapplyLoadedDiagramGraphStyles(
  lf: LogicFlow,
  sourceGraph?: { nodes?: unknown[]; edges?: unknown[] }
): void {
  const rawNodes = (sourceGraph?.nodes ?? []) as Array<{
    id: string
    width?: number
    height?: number
    properties?: Record<string, unknown>
  }>
  for (const raw of rawNodes) {
    const props = raw.properties ?? {}
    const normalized = normalizeNodeStyleProperties(props)
    if (JSON.stringify(normalized) !== JSON.stringify(props)) {
      lf.setProperties(raw.id, normalized)
    }
  }
  const rawEdges = (sourceGraph?.edges ?? []) as Array<{
    id: string
    properties?: Record<string, unknown>
  }>
  for (const raw of rawEdges) {
    const props = raw.properties ?? {}
    const normalized = normalizeEdgeStyleProperties(props)
    if (JSON.stringify(normalized) !== JSON.stringify(props)) {
      lf.setProperties(raw.id, normalized)
    }
  }
  for (const raw of rawNodes) {
    const model = lf.getNodeModelById(raw.id)
    if (!model) continue
    const props = raw.properties ?? {}
    const nodeSize = props.nodeSize as Record<string, unknown> | undefined
    const rx = Number(nodeSize?.rx ?? props.rx)
    const ry = Number(nodeSize?.ry ?? props.ry)
    if (Number.isFinite(rx) && rx > 0 && Number.isFinite(ry) && ry > 0) {
      applyNodeDimensions(
        model as Parameters<typeof applyNodeDimensions>[0],
        Math.round(rx * 2),
        Math.round(ry * 2)
      )
    } else {
      const w = Number(raw.width ?? props.width ?? nodeSize?.width)
      const h = Number(raw.height ?? props.height ?? nodeSize?.height)
      if (Number.isFinite(w) && w > 0 && Number.isFinite(h) && h > 0) {
        applyNodeDimensions(
          model as Parameters<typeof applyNodeDimensions>[0],
          Math.round(w),
          Math.round(h)
        )
      }
    }
    const readProps = readNodeProperties(lf, raw.id)
    if (readProps) applyNodeProperties(lf, readProps)
  }
  const edges = (sourceGraph?.edges ?? []) as Array<{ id: string }>
  for (const edge of edges) {
    const props = readEdgeProperties(lf, edge.id)
    if (props) applyEdgeProperties(lf, props)
  }
}
