import type LogicFlow from '@logicflow/core'
import { syncGroupFrameBounds, ensureGroupFrameAtBottom } from '@modules/library/diagrams/lib/diagramGroupBounds'
import {
  DEFAULT_GROUP_STYLE,
  DIAGRAM_GROUP_FRAME_CREATE_PAD,
  DIAGRAM_GROUP_FRAME_MIN_SIZE,
  DIAGRAM_GROUP_FRAME_TYPE,
  clearElementGroupId,
  isGroupFrameModel
} from '@modules/library/diagrams/lib/diagramGroupFrame'
import type { DiagramNodeBounds } from '@modules/library/diagrams/lib/diagramNodeLayout'

export function detachDiagramNodeFromGroup(lf: LogicFlow, nodeId: string): void {
  const model = lf.getNodeModelById(nodeId)
  const groupId = model?.properties?.dgGroupId
  if (typeof groupId !== 'string' || !groupId) return
  const group = lf.getNodeModelById(groupId)
  if (!group || !isGroupFrameModel(group)) {
    clearElementGroupId(lf, nodeId)
    return
  }
  const members = ((group.properties?.dgGroupMembers as string[] | undefined) ?? []).filter(
    (id) => id !== nodeId
  )
  lf.setProperties(groupId, { dgGroupMembers: members })
  clearElementGroupId(lf, nodeId)
  if (!members.length && !((group.properties?.dgGroupEdges as string[] | undefined) ?? []).length) {
    lf.deleteNode(groupId)
  } else {
    syncGroupFrameBounds(lf, groupId)
  }
}

export function detachDiagramEdgeFromGroup(lf: LogicFlow, edgeId: string): void {
  const model = lf.getEdgeModelById(edgeId)
  const groupId = model?.properties?.dgGroupId
  if (typeof groupId !== 'string' || !groupId) return
  const group = lf.getNodeModelById(groupId)
  if (!group || !isGroupFrameModel(group)) {
    clearElementGroupId(lf, edgeId)
    return
  }
  const edges = ((group.properties?.dgGroupEdges as string[] | undefined) ?? []).filter(
    (id) => id !== edgeId
  )
  lf.setProperties(groupId, { dgGroupEdges: edges })
  clearElementGroupId(lf, edgeId)
  if (!edges.length && !((group.properties?.dgGroupMembers as string[] | undefined) ?? []).length) {
    lf.deleteNode(groupId)
  } else {
    syncGroupFrameBounds(lf, groupId)
  }
}

export function releaseDiagramGroupFrame(lf: LogicFlow, groupId: string): void {
  const model = lf.getNodeModelById(groupId)
  const members = (model?.properties?.dgGroupMembers as string[] | undefined) ?? []
  const edgeMembers = (model?.properties?.dgGroupEdges as string[] | undefined) ?? []

  for (const memberId of members) {
    clearElementGroupId(lf, memberId)
  }
  for (const edgeId of edgeMembers) {
    clearElementGroupId(lf, edgeId)
  }
  for (const node of lf.graphModel.nodes) {
    if (node.properties?.dgGroupId === groupId) {
      clearElementGroupId(lf, node.id)
    }
  }
  for (const edge of lf.graphModel.edges) {
    if (edge.properties?.dgGroupId === groupId) {
      clearElementGroupId(lf, edge.id)
    }
  }
  if (isGroupFrameModel(model)) {
    if (lf.getNodeModelById(groupId)?.isSelected) {
      lf.deselectElementById(groupId)
    }
    lf.deleteNode(groupId)
  }
}

export function mergeUngroupedIntoDiagramGroup(
  lf: LogicFlow,
  groupId: string,
  nodeIds: string[],
  edgeIds: string[]
): void {
  const group = lf.getNodeModelById(groupId)
  if (!group || !isGroupFrameModel(group)) return

  const memberSet = new Set((group.properties?.dgGroupMembers as string[] | undefined) ?? [])
  const edgeSet = new Set((group.properties?.dgGroupEdges as string[] | undefined) ?? [])

  for (const id of nodeIds) {
    const model = lf.getNodeModelById(id)
    if (!model || isGroupFrameModel(model)) continue
    detachDiagramNodeFromGroup(lf, id)
    memberSet.add(id)
    lf.setProperties(id, { dgGroupId: groupId })
  }
  for (const id of edgeIds) {
    if (!lf.getEdgeModelById(id)) continue
    detachDiagramEdgeFromGroup(lf, id)
    edgeSet.add(id)
    lf.setProperties(id, { dgGroupId: groupId })
  }

  lf.setProperties(groupId, {
    dgGroupMembers: [...memberSet],
    dgGroupEdges: [...edgeSet]
  })
  syncGroupFrameBounds(lf, groupId)
}

export function createDiagramGroupFrame(
  lf: LogicFlow,
  nodeIds: string[],
  edgeIds: string[],
  readNodeBounds: (nodeId: string) => DiagramNodeBounds | null
): string | null {
  if (nodeIds.length + edgeIds.length < 2) return null

  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity

  for (const id of nodeIds) {
    const bounds = readNodeBounds(id)
    if (!bounds) continue
    minX = Math.min(minX, bounds.x - bounds.width / 2)
    maxX = Math.max(maxX, bounds.x + bounds.width / 2)
    minY = Math.min(minY, bounds.y - bounds.height / 2)
    maxY = Math.max(maxY, bounds.y + bounds.height / 2)
  }

  if (!nodeIds.length) {
    for (const edgeId of edgeIds) {
      const model = lf.getEdgeModelById(edgeId)
      for (const pt of model?.pointsList ?? []) {
        minX = Math.min(minX, pt.x)
        maxX = Math.max(maxX, pt.x)
        minY = Math.min(minY, pt.y)
        maxY = Math.max(maxY, pt.y)
      }
    }
  }

  if (!Number.isFinite(minX)) {
    minX = 0
    maxX = DIAGRAM_GROUP_FRAME_MIN_SIZE.width
    minY = 0
    maxY = DIAGRAM_GROUP_FRAME_MIN_SIZE.height
  }

  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  const w = Math.max(
    maxX - minX + DIAGRAM_GROUP_FRAME_CREATE_PAD * 2,
    DIAGRAM_GROUP_FRAME_MIN_SIZE.width
  )
  const h = Math.max(
    maxY - minY + DIAGRAM_GROUP_FRAME_CREATE_PAD * 2,
    DIAGRAM_GROUP_FRAME_MIN_SIZE.height
  )

  const groupId = `${DIAGRAM_GROUP_FRAME_TYPE}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
  lf.addNode({
    id: groupId,
    type: DIAGRAM_GROUP_FRAME_TYPE,
    x: cx,
    y: cy,
    properties: {
      dgGroupMembers: nodeIds,
      dgGroupEdges: edgeIds,
      dgGroupStyle: { ...DEFAULT_GROUP_STYLE }
    }
  })
  const groupModel = lf.getNodeModelById(groupId)
  if (groupModel) {
    groupModel.width = w
    groupModel.height = h
  }
  for (const id of nodeIds) {
    lf.setProperties(id, { dgGroupId: groupId })
  }
  for (const id of edgeIds) {
    lf.setProperties(id, { dgGroupId: groupId })
  }
  ensureGroupFrameAtBottom(lf, groupId)
  lf.selectElementById(groupId)
  return groupId
}
