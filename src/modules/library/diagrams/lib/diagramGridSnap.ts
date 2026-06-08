import type LogicFlow from '@logicflow/core'
import {
  softSnapCoordinate,
  snapCoordinateToGrid
} from '@modules/library/diagrams/lib/diagramCanvasTheme'
import { DIAGRAM_GROUP_FRAME_TYPE } from '@modules/library/diagrams/lib/diagramGroupFrame'

/** 通过 LogicFlow graphModel 移动节点，同步更新连线锚点 */
function moveNodesDelta(lf: LogicFlow, nodeIds: string[], dx: number, dy: number): void {
  if (dx === 0 && dy === 0 || !nodeIds.length) return
  const ids = [...new Set(nodeIds)].filter((id) => lf.getNodeModelById(id))
  if (!ids.length) return
  lf.graphModel.moveNodes(ids, dx, dy, true)
}

function collectSnapMoveIds(lf: LogicFlow, nodeIds: string[]): string[] {
  const ids: string[] = []
  const seen = new Set<string>()
  const add = (id: string) => {
    if (seen.has(id) || !lf.getNodeModelById(id)) return
    seen.add(id)
    ids.push(id)
  }

  for (const id of nodeIds) {
    const model = lf.getNodeModelById(id)
    if (!model) continue

    if (model.type === DIAGRAM_GROUP_FRAME_TYPE) {
      add(id)
      for (const memberId of (model.properties?.dgGroupMembers as string[] | undefined) ?? []) {
        add(memberId)
      }
      continue
    }

    const inSelectedGroup = nodeIds.some((groupId) => {
      const group = lf.getNodeModelById(groupId)
      if (group?.type !== DIAGRAM_GROUP_FRAME_TYPE) return false
      return ((group.properties?.dgGroupMembers as string[] | undefined) ?? []).includes(id)
    })
    if (!inSelectedGroup) add(id)
  }

  return ids
}

function softSnapGroupFrameWithMembers(lf: LogicFlow, groupId: string): boolean {
  const model = lf.getNodeModelById(groupId)
  if (!model || model.type !== DIAGRAM_GROUP_FRAME_TYPE) return false
  const nx = softSnapCoordinate(model.x)
  const ny = softSnapCoordinate(model.y)
  const dx = nx - model.x
  const dy = ny - model.y
  if (dx === 0 && dy === 0) return false
  const members = (model.properties?.dgGroupMembers as string[] | undefined) ?? []
  moveNodesDelta(lf, [groupId, ...members], dx, dy)
  return true
}

/** 拖拽过程中轻吸附网格（仅接近网格线时生效） */
export function softSnapNodesDuringDrag(
  lf: LogicFlow,
  nodeIds: string[],
  enabled: boolean,
  anchorId?: string
): void {
  if (!enabled || !nodeIds.length) return

  const uniqueIds = [...new Set(nodeIds)]
  const anchor = lf.getNodeModelById(anchorId ?? uniqueIds[0] ?? '')
  if (!anchor) return

  if (anchor.type === DIAGRAM_GROUP_FRAME_TYPE) {
    softSnapGroupFrameWithMembers(lf, anchor.id)
    return
  }

  const nx = softSnapCoordinate(anchor.x)
  const ny = softSnapCoordinate(anchor.y)
  const dx = nx - anchor.x
  const dy = ny - anchor.y
  if (dx === 0 && dy === 0) return

  moveNodesDelta(lf, collectSnapMoveIds(lf, uniqueIds), dx, dy)
}

/** 刷新对齐参考线（使用模型实时坐标，避免 node:mousemove 携带过期 data） */
export function refreshSnapAlignGuide(lf: LogicFlow, nodeId: string, enabled: boolean): void {
  if (!enabled) {
    lf.removeNodeSnapLine()
    return
  }
  const model = lf.getNodeModelById(nodeId)
  if (!model) return
  lf.setNodeSnapLine(model.getData())
}

function snapGroupFrameWithMembers(lf: LogicFlow, groupId: string): boolean {
  const model = lf.getNodeModelById(groupId)
  if (!model || model.type !== DIAGRAM_GROUP_FRAME_TYPE) return false
  const nx = snapCoordinateToGrid(model.x)
  const ny = snapCoordinateToGrid(model.y)
  const dx = nx - model.x
  const dy = ny - model.y
  if (dx === 0 && dy === 0) return false
  const members = (model.properties?.dgGroupMembers as string[] | undefined) ?? []
  moveNodesDelta(lf, [groupId, ...members], dx, dy)
  return true
}

/**
 * 拖拽结束后将节点对齐网格。
 * 以 anchorId（本次拖动的节点）为基准计算偏移，多选时保持相对位置。
 */
export function snapNodesAfterDrag(
  lf: LogicFlow,
  nodeIds: string[],
  enabled: boolean,
  anchorId?: string
): void {
  if (!enabled || !nodeIds.length) return

  const uniqueIds = [...new Set(nodeIds)]
  const anchor = lf.getNodeModelById(anchorId ?? uniqueIds[0] ?? '')
  if (!anchor) return

  if (anchor.type === DIAGRAM_GROUP_FRAME_TYPE) {
    snapGroupFrameWithMembers(lf, anchor.id)
    return
  }

  const nx = snapCoordinateToGrid(anchor.x)
  const ny = snapCoordinateToGrid(anchor.y)
  const dx = nx - anchor.x
  const dy = ny - anchor.y
  if (dx === 0 && dy === 0) return

  moveNodesDelta(lf, collectSnapMoveIds(lf, uniqueIds), dx, dy)
}

export function snapCanvasPoint(
  x: number,
  y: number,
  enabled: boolean
): { x: number; y: number } {
  if (!enabled) return { x, y }
  return {
    x: snapCoordinateToGrid(x),
    y: snapCoordinateToGrid(y)
  }
}
