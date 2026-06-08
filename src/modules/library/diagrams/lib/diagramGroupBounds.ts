import type LogicFlow from '@logicflow/core'
import { DIAGRAM_GROUP_FRAME_TYPE } from '@modules/library/diagrams/lib/diagramGroupFrame'

const GROUP_PAD = 12

/** 根据成员与组内连线重算组合框位置与尺寸 */
export function syncGroupFrameBounds(lf: LogicFlow, groupId: string): void {
  const group = lf.getNodeModelById(groupId)
  if (!group || group.type !== DIAGRAM_GROUP_FRAME_TYPE) return

  const members = (group.properties?.dgGroupMembers as string[] | undefined) ?? []
  const groupEdges = (group.properties?.dgGroupEdges as string[] | undefined) ?? []

  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity

  for (const id of members) {
    const model = lf.getNodeModelById(id)
    if (!model) continue
    minX = Math.min(minX, model.x - model.width / 2)
    maxX = Math.max(maxX, model.x + model.width / 2)
    minY = Math.min(minY, model.y - model.height / 2)
    maxY = Math.max(maxY, model.y + model.height / 2)
  }

  if (!members.length) {
    for (const edgeId of groupEdges) {
      const model = lf.getEdgeModelById(edgeId)
      for (const pt of model?.pointsList ?? []) {
        minX = Math.min(minX, pt.x)
        maxX = Math.max(maxX, pt.x)
        minY = Math.min(minY, pt.y)
        maxY = Math.max(maxY, pt.y)
      }
    }
  }

  if (!Number.isFinite(minX)) return

  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  const w = Math.max(maxX - minX + GROUP_PAD * 2, 80)
  const h = Math.max(maxY - minY + GROUP_PAD * 2, 60)

  group.width = w
  group.height = h
  const dx = cx - group.x
  const dy = cy - group.y
  if (dx !== 0 || dy !== 0) {
    lf.graphModel.moveNode(groupId, dx, dy, true)
  }
}

export function collectGroupIdsForNodes(lf: LogicFlow, nodeIds: string[]): Set<string> {
  const groupIds = new Set<string>()
  for (const id of nodeIds) {
    const model = lf.getNodeModelById(id)
    if (!model) continue
    if (model.type === DIAGRAM_GROUP_FRAME_TYPE) {
      groupIds.add(id)
      continue
    }
    const parentId = model.properties?.dgGroupId
    if (typeof parentId === 'string' && parentId) {
      groupIds.add(parentId)
    }
  }
  return groupIds
}

export function syncGroupFramesForNodes(lf: LogicFlow, nodeIds: string[]): void {
  for (const groupId of collectGroupIdsForNodes(lf, nodeIds)) {
    syncGroupFrameBounds(lf, groupId)
  }
}
