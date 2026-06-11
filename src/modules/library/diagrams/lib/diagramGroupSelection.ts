import type LogicFlow from '@logicflow/core'
import {
  DIAGRAM_GROUP_FRAME_TYPE,
  isGroupFrameType,
  resolveGroupFrameIdForElement
} from '@modules/library/diagrams/lib/diagramGroupFrame'

export type DiagramGroupSelectionAnalysis = {
  orderedNodeIds: string[]
  orderedEdgeIds: string[]
  contentNodeIds: string[]
  contentEdgeIds: string[]
  ungroupedNodeIds: string[]
  ungroupedEdgeIds: string[]
  /** 按选中顺序出现的第一个组合框 id */
  primaryGroupId: string | null
  totalElementCount: number
}

/** 合并 LF 选区 id，仅以 model.isSelected 为准（selectNodes 切换选中时可能残留旧节点） */
export function collectOrderedSelectionIds(lf: LogicFlow): {
  nodeIds: string[]
  edgeIds: string[]
} {
  const nodeIds: string[] = []
  const edgeIds: string[] = []
  const seenN = new Set<string>()
  const seenE = new Set<string>()

  const pushNode = (id: string) => {
    const model = lf.getNodeModelById(id)
    if (!model?.isSelected) return
    if (!seenN.has(id)) {
      seenN.add(id)
      nodeIds.push(id)
    }
  }
  const pushEdge = (id: string) => {
    const model = lf.getEdgeModelById(id)
    if (!model?.isSelected) return
    if (!seenE.has(id)) {
      seenE.add(id)
      edgeIds.push(id)
    }
  }

  for (const node of lf.graphModel.selectNodes) pushNode(node.id)
  for (const node of lf.getSelectElements(true).nodes) pushNode(node.id)
  for (const edge of lf.getSelectElements(true).edges) pushEdge(edge.id)
  for (const model of lf.graphModel.nodes) {
    if (model.isSelected) pushNode(model.id)
  }
  for (const model of lf.graphModel.edges) {
    if (model.isSelected) pushEdge(model.id)
  }
  return { nodeIds, edgeIds }
}

/** 统计当前选中的连线数量 */
export function countSelectedEdges(lf: LogicFlow): number {
  let count = 0
  for (const edge of lf.graphModel.edges) {
    if (edge.isSelected) count += 1
  }
  return count
}

export function resolvePrimaryGroupId(
  lf: LogicFlow,
  orderedNodeIds: string[],
  orderedEdgeIds: string[]
): string | null {
  for (const id of orderedNodeIds) {
    const model = lf.getNodeModelById(id)
    if (!model) continue
    if (isGroupFrameType(model.type)) return id
    const gid = model.properties?.dgGroupId
    if (typeof gid === 'string' && gid) return gid
  }
  for (const id of orderedEdgeIds) {
    const gid = lf.getEdgeModelById(id)?.properties?.dgGroupId
    if (typeof gid === 'string' && gid) return gid
  }
  return null
}

function expandSelectionContent(
  lf: LogicFlow,
  orderedNodeIds: string[],
  orderedEdgeIds: string[]
): { contentNodeIds: string[]; contentEdgeIds: string[] } {
  const nodeSet = new Set<string>()
  const edgeSet = new Set<string>(orderedEdgeIds)

  for (const id of orderedNodeIds) {
    const model = lf.getNodeModelById(id)
    if (!model) continue
    if (isGroupFrameType(model.type)) {
      const members = (model.properties?.dgGroupMembers as string[] | undefined) ?? []
      const groupEdges = (model.properties?.dgGroupEdges as string[] | undefined) ?? []
      for (const memberId of members) nodeSet.add(memberId)
      for (const edgeId of groupEdges) edgeSet.add(edgeId)
      continue
    }
    if (model.type !== DIAGRAM_GROUP_FRAME_TYPE) {
      nodeSet.add(id)
    }
  }

  return { contentNodeIds: [...nodeSet], contentEdgeIds: [...edgeSet] }
}

export function analyzeGroupSelection(
  lf: LogicFlow,
  explicitNodeIds?: string[],
  explicitEdgeIds?: string[]
): DiagramGroupSelectionAnalysis {
  const ordered =
    explicitNodeIds?.length || explicitEdgeIds?.length
      ? { nodeIds: explicitNodeIds ?? [], edgeIds: explicitEdgeIds ?? [] }
      : collectOrderedSelectionIds(lf)

  const { contentNodeIds, contentEdgeIds } = expandSelectionContent(
    lf,
    ordered.nodeIds,
    ordered.edgeIds
  )

  const ungroupedNodeIds = contentNodeIds.filter((id) => {
    const model = lf.getNodeModelById(id)
    return model && !isGroupFrameType(model.type) && !resolveGroupFrameIdForElement(lf, id, 'node')
  })
  const ungroupedEdgeIds = contentEdgeIds.filter(
    (id) => !resolveGroupFrameIdForElement(lf, id, 'edge')
  )

  return {
    orderedNodeIds: ordered.nodeIds,
    orderedEdgeIds: ordered.edgeIds,
    contentNodeIds,
    contentEdgeIds,
    ungroupedNodeIds,
    ungroupedEdgeIds,
    primaryGroupId: resolvePrimaryGroupId(lf, ordered.nodeIds, ordered.edgeIds),
    totalElementCount: contentNodeIds.length + contentEdgeIds.length
  }
}

/** 选区是否满足组合条件（≥2 个图元/连线，与是否已组合无关） */
export function canGroupFromLiveSelection(
  lf: LogicFlow,
  nodeIds: string[],
  edgeIds: string[]
): boolean {
  const analysis = analyzeGroupSelection(lf, nodeIds, edgeIds)
  if (analysis.totalElementCount >= 2) return true

  let contentNodes = 0
  for (const id of nodeIds) {
    const model = lf.getNodeModelById(id)
    if (model && !isGroupFrameType(model.type)) contentNodes += 1
  }
  const edgeCount = edgeIds.length || countSelectedEdges(lf)
  return contentNodes + edgeCount >= 2
}

export function selectionHasGroupedElements(
  lf: LogicFlow,
  orderedNodeIds: string[],
  orderedEdgeIds: string[]
): boolean {
  for (const id of orderedNodeIds) {
    const model = lf.getNodeModelById(id)
    if (!model) continue
    if (model.type === DIAGRAM_GROUP_FRAME_TYPE) return true
    const gid = model.properties?.dgGroupId
    if (typeof gid === 'string' && gid && lf.getNodeModelById(gid)?.type === DIAGRAM_GROUP_FRAME_TYPE) {
      return true
    }
  }
  for (const id of orderedEdgeIds) {
    const gid = lf.getEdgeModelById(id)?.properties?.dgGroupId
    if (typeof gid === 'string' && gid && lf.getNodeModelById(gid)?.type === DIAGRAM_GROUP_FRAME_TYPE) {
      return true
    }
  }
  return false
}
