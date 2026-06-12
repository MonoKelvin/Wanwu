import type LogicFlow from '@logicflow/core'
import { DIAGRAM_CLIPBOARD_DEFAULT_OFFSET } from '@modules/library/diagrams/lib/diagramEditorConstants'
import { syncGroupFramesForNodes } from '@modules/library/diagrams/lib/diagramGroupBounds'
import { isGroupFrameModel } from '@modules/library/diagrams/lib/diagramGroupFrame'
import { selectionBoundsCenter } from '@modules/library/diagrams/lib/diagramNodeLayout'
import { snapNodesAfterDrag } from '@modules/library/diagrams/lib/diagramGridSnap'
import { applyNodeDimensions } from '@modules/library/diagrams/lib/diagramShapeResize'
import {
  applyEdgeProperties,
  readEdgeProperties
} from '@modules/library/diagrams/lib/diagramStyleBridge'

export interface DiagramClipboardNodeSnapshot {
  id: string
  type: string
  x: number
  y: number
  width?: number
  height?: number
  text?: string
  properties?: Record<string, unknown>
}

export interface DiagramClipboardEdgeSnapshot {
  type: string
  sourceNodeId: string
  targetNodeId: string
  text?: string
  properties?: Record<string, unknown>
}

export interface DiagramClipboardSnapshot {
  nodes: DiagramClipboardNodeSnapshot[]
  edges: DiagramClipboardEdgeSnapshot[]
}

export function lfTextToClipboardString(text: unknown): string | undefined {
  if (typeof text === 'string') return text || undefined
  if (text && typeof text === 'object' && 'value' in text) {
    const value = String((text as { value?: string }).value ?? '')
    return value || undefined
  }
  return undefined
}

/** 展开组合框选区为内容图元/连线 id（与属性面板选区能力一致） */
export function resolveDiagramClipboardTargets(
  lf: LogicFlow,
  options: {
    nodeIds?: string[]
    edgeIds?: string[]
    liveNodeIds: string[]
    liveEdgeIds: string[]
  }
): { nodeIds: string[]; edgeIds: string[] } {
  const rawNodeIds = options.nodeIds?.length ? options.nodeIds : options.liveNodeIds
  const rawEdgeIds = options.edgeIds?.length ? options.edgeIds : options.liveEdgeIds

  const expandedNodeIds: string[] = []
  const expandedEdgeIds = new Set(rawEdgeIds)

  for (const id of rawNodeIds) {
    const model = lf.getNodeModelById(id)
    if (!model) continue
    if (isGroupFrameModel(model)) {
      const members = (model.properties?.dgGroupMembers as string[] | undefined) ?? []
      const groupEdges = (model.properties?.dgGroupEdges as string[] | undefined) ?? []
      for (const memberId of members) expandedNodeIds.push(memberId)
      for (const edgeId of groupEdges) expandedEdgeIds.add(edgeId)
      continue
    }
    expandedNodeIds.push(id)
  }

  const nodeIdSet = new Set<string>()
  for (const id of expandedNodeIds) {
    const model = lf.getNodeModelById(id)
    if (model && !isGroupFrameModel(model)) {
      nodeIdSet.add(id)
    }
  }

  return {
    nodeIds: [...nodeIdSet],
    edgeIds: [...expandedEdgeIds]
  }
}

export function buildDiagramClipboardSnapshot(
  lf: LogicFlow,
  targets: { nodeIds: string[]; edgeIds: string[] }
): DiagramClipboardSnapshot | null {
  if (!targets.nodeIds.length && !targets.edgeIds.length) return null

  const nodes = targets.nodeIds
    .map((id) => {
      const model = lf.getNodeModelById(id)
      if (!model || isGroupFrameModel(model)) return null
      return {
        id: model.id,
        type: String(model.type),
        x: model.x,
        y: model.y,
        width: model.width,
        height: model.height,
        text: lfTextToClipboardString(model.text),
        properties: (() => {
          const p = structuredClone(model.properties ?? {}) as Record<string, unknown>
          delete p.dgGroupId
          return p
        })()
      }
    })
    .filter(Boolean) as DiagramClipboardNodeSnapshot[]

  const edges = targets.edgeIds
    .map((edgeId) => {
      const model = lf.getEdgeModelById(edgeId)
      if (!model) return null
      return {
        type: String(model.type),
        sourceNodeId: model.sourceNodeId,
        targetNodeId: model.targetNodeId,
        text: lfTextToClipboardString(model.text),
        properties: structuredClone(model.properties ?? {}) as Record<string, unknown>
      }
    })
    .filter(Boolean) as DiagramClipboardEdgeSnapshot[]

  return { nodes, edges }
}

export interface PasteDiagramClipboardOptions {
  clientX?: number
  clientY?: number
  fixedOffsetX?: number
  fixedOffsetY?: number
  clientToCanvas(clientX: number, clientY: number): { x: number; y: number }
  getContainer(): HTMLElement | null
  snapGrid: boolean
  select(nodeIds: string[], edgeIds?: string[]): void
}

/** 将剪贴板快照粘贴到画布，返回新创建的 id */
export function pasteDiagramClipboardSnapshot(
  lf: LogicFlow,
  clip: DiagramClipboardSnapshot,
  options: PasteDiagramClipboardOptions
): { nodeIds: string[]; edgeIds: string[] } {
  if (!clip.nodes.length && !clip.edges.length) {
    return { nodeIds: [], edgeIds: [] }
  }

  let offsetX: number = DIAGRAM_CLIPBOARD_DEFAULT_OFFSET.x
  let offsetY: number = DIAGRAM_CLIPBOARD_DEFAULT_OFFSET.y

  if (clip.nodes.length) {
    const { x: centerX, y: centerY } = selectionBoundsCenter(clip.nodes)
    if (options.fixedOffsetX != null && options.fixedOffsetY != null) {
      offsetX = options.fixedOffsetX
      offsetY = options.fixedOffsetY
    } else if (options.clientX != null && options.clientY != null) {
      const { x: cx, y: cy } = options.clientToCanvas(options.clientX, options.clientY)
      offsetX = cx - centerX
      offsetY = cy - centerY
    } else {
      const container = options.getContainer()
      if (container) {
        const rect = container.getBoundingClientRect()
        const { x: cx, y: cy } = options.clientToCanvas(
          rect.left + rect.width / 2,
          rect.top + rect.height / 2
        )
        offsetX = cx - centerX
        offsetY = cy - centerY
      }
    }
  }

  const idMap = new Map<string, string>()
  const newNodeIds: string[] = []
  const newEdgeIds: string[] = []
  const stamp = Date.now()
  let seq = 0

  for (const node of clip.nodes) {
    const newId = `${node.type}_${stamp}_${seq++}_${Math.random().toString(36).slice(2, 6)}`
    idMap.set(node.id, newId)
    newNodeIds.push(newId)
    const nodeProperties = structuredClone(node.properties ?? {}) as Record<string, unknown>
    delete nodeProperties.dgGroupId
    lf.addNode({
      id: newId,
      type: node.type,
      x: node.x + offsetX,
      y: node.y + offsetY,
      text: node.text,
      properties: nodeProperties
    })
    const model = lf.getNodeModelById(newId)
    if (model && (node.width != null || node.height != null)) {
      applyNodeDimensions(
        model as Parameters<typeof applyNodeDimensions>[0],
        node.width ?? Math.round(model.width),
        node.height ?? Math.round(model.height)
      )
    }
  }

  for (const edge of clip.edges) {
    const sourceNodeId = idMap.get(edge.sourceNodeId) ?? edge.sourceNodeId
    const targetNodeId = idMap.get(edge.targetNodeId) ?? edge.targetNodeId
    if (!lf.getNodeModelById(sourceNodeId) || !lf.getNodeModelById(targetNodeId)) continue
    const newId = `${edge.type}_${stamp}_${seq++}_${Math.random().toString(36).slice(2, 6)}`
    newEdgeIds.push(newId)
    lf.addEdge({
      id: newId,
      type: edge.type,
      sourceNodeId,
      targetNodeId,
      text: edge.text,
      properties: structuredClone(edge.properties ?? {})
    })
    const edgeProps = readEdgeProperties(lf, newId)
    if (edgeProps) applyEdgeProperties(lf, edgeProps)
  }

  if (newNodeIds.length) {
    options.select(newNodeIds)
    if (options.snapGrid) {
      snapNodesAfterDrag(lf, newNodeIds, true, newNodeIds[0])
      syncGroupFramesForNodes(lf, newNodeIds)
    }
  } else if (newEdgeIds.length) {
    options.select([], newEdgeIds)
  }

  return { nodeIds: newNodeIds, edgeIds: newEdgeIds }
}
