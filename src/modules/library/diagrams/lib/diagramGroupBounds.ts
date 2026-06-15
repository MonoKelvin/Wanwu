import type LogicFlow from '@logicflow/core'
import { updateEdgePointByAnchors } from '@logicflow/core/lib/util/resize'
import {
  collectDiagramGroupContent,
  isGroupFrameType
} from '@modules/library/diagrams/lib/diagramGroupFrame'
import { syncDiagramEdgeTextsForNodeIds } from '@modules/library/diagrams/lib/diagramEdgeTextSync'

const GROUP_PAD = 12
const GROUP_MIN_WIDTH = 80
const GROUP_MIN_HEIGHT = 60

/**
 * tight：以内容为中心紧贴（新建/合并组合）
 * fit：左/上锚定，右/下随内容伸缩（拖拽中与松手后均实时生效）
 */
export type GroupFrameBoundsSyncMode = 'tight' | 'fit'

export type SyncGroupFrameBoundsOptions = {
  mode?: GroupFrameBoundsSyncMode
}

function readMemberBounds(
  lf: LogicFlow,
  memberNodeIds: string[],
  memberEdgeIds: string[]
): { minX: number; maxX: number; minY: number; maxY: number } | null {
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity

  for (const id of memberNodeIds) {
    const model = lf.getNodeModelById(id)
    if (!model) continue
    minX = Math.min(minX, model.x - model.width / 2)
    maxX = Math.max(maxX, model.x + model.width / 2)
    minY = Math.min(minY, model.y - model.height / 2)
    maxY = Math.max(maxY, model.y + model.height / 2)
  }

  if (!memberNodeIds.length) {
    for (const edgeId of memberEdgeIds) {
      const model = lf.getEdgeModelById(edgeId)
      for (const pt of model?.pointsList ?? []) {
        minX = Math.min(minX, pt.x)
        maxX = Math.max(maxX, pt.x)
        minY = Math.min(minY, pt.y)
        maxY = Math.max(maxY, pt.y)
      }
    }
  }

  if (!Number.isFinite(minX)) return null
  return { minX, maxX, minY, maxY }
}

/** 左/上锚定：仅在被内容推动时向外扩展；fit 时右/下可随内容收缩 */
function resolveAnchoredHorizontal(
  curLeft: number,
  curRight: number,
  reqLeft: number,
  reqRight: number,
  mode: GroupFrameBoundsSyncMode
): { left: number; right: number } {
  if (mode === 'tight') {
    return { left: reqLeft, right: reqRight }
  }
  const left = Math.min(curLeft, reqLeft)
  const right = reqRight
  return { left, right }
}

function resolveAnchoredVertical(
  curTop: number,
  curBottom: number,
  reqTop: number,
  reqBottom: number,
  mode: GroupFrameBoundsSyncMode
): { top: number; bottom: number } {
  if (mode === 'tight') {
    return { top: reqTop, bottom: reqBottom }
  }
  const top = Math.min(curTop, reqTop)
  const bottom = reqBottom
  return { top, bottom }
}

/** 最小尺寸不足时向右/下扩展，保持左/上锚定 */
function enforceMinSizeAnchored(
  left: number,
  top: number,
  right: number,
  bottom: number
): { left: number; top: number; right: number; bottom: number } {
  let r = right
  let b = bottom
  if (r - left < GROUP_MIN_WIDTH) r = left + GROUP_MIN_WIDTH
  if (b - top < GROUP_MIN_HEIGHT) b = top + GROUP_MIN_HEIGHT
  return { left, top, right: r, bottom: b }
}

function applyFrameRect(
  lf: LogicFlow,
  group: { id: string; x: number; y: number; width: number; height: number; setAttributes?: () => void },
  left: number,
  top: number,
  right: number,
  bottom: number
): void {
  const w = right - left
  const h = bottom - top
  const cx = (left + right) / 2
  const cy = (top + bottom) / 2
  group.width = w
  group.height = h
  const dx = cx - group.x
  const dy = cy - group.y
  if (dx !== 0 || dy !== 0) {
    lf.graphModel.moveNode(group.id, dx, dy, true)
  }
  if ('setAttributes' in group && typeof group.setAttributes === 'function') {
    group.setAttributes()
  }
}

/** 组合框尺寸/位置变化后，重算挂在框上的连线锚点与标签 */
function syncGroupFrameConnectedEdges(lf: LogicFlow, groupId: string): void {
  const group = lf.getNodeModelById(groupId)
  if (!group) return
  updateEdgePointByAnchors(group, lf.graphModel)
  syncDiagramEdgeTextsForNodeIds(lf, [groupId])
}

/** 根据成员与组内连线重算组合框位置与尺寸 */
export function syncGroupFrameBounds(
  lf: LogicFlow,
  groupId: string,
  options?: SyncGroupFrameBoundsOptions
): void {
  const group = lf.getNodeModelById(groupId)
  if (!group || !isGroupFrameType(group.type)) return

  const mode = options?.mode ?? 'fit'
  const { memberNodeIds, memberEdgeIds } = collectDiagramGroupContent(lf, groupId)
  const bounds = readMemberBounds(lf, memberNodeIds, memberEdgeIds)
  if (!bounds) return

  const reqLeft = bounds.minX - GROUP_PAD
  const reqRight = bounds.maxX + GROUP_PAD
  const reqTop = bounds.minY - GROUP_PAD
  const reqBottom = bounds.maxY + GROUP_PAD

  const curLeft = group.x - group.width / 2
  const curTop = group.y - group.height / 2
  const curRight = group.x + group.width / 2
  const curBottom = group.y + group.height / 2

  const { left: hLeft, right: hRight } = resolveAnchoredHorizontal(
    curLeft,
    curRight,
    reqLeft,
    reqRight,
    mode
  )
  const { top: vTop, bottom: vBottom } = resolveAnchoredVertical(
    curTop,
    curBottom,
    reqTop,
    reqBottom,
    mode
  )

  const rect = enforceMinSizeAnchored(hLeft, vTop, hRight, vBottom)
  applyFrameRect(lf, group, rect.left, rect.top, rect.right, rect.bottom)
  syncGroupFrameConnectedEdges(lf, groupId)
  ensureGroupFrameAtBottom(lf, groupId)
}

/** 组合框始终置于最底层，避免填充色遮挡其他图元 */
export function ensureGroupFrameAtBottom(lf: LogicFlow, groupId: string): void {
  const group = lf.getNodeModelById(groupId)
  if (!group || !isGroupFrameType(group.type)) return
  let minZ = Infinity
  for (const node of lf.graphModel.nodes) {
    if (node.id === groupId) continue
    minZ = Math.min(minZ, node.zIndex ?? 0)
  }
  for (const edge of lf.graphModel.edges) {
    minZ = Math.min(minZ, edge.zIndex ?? 0)
  }
  const target = minZ === Infinity ? 0 : minZ - 1
  if ((group.zIndex ?? 0) !== target) {
    lf.setElementZIndex(groupId, target)
  }
}

export function ensureAllGroupFramesAtBottom(lf: LogicFlow): void {
  for (const node of lf.graphModel.nodes) {
    if (isGroupFrameType(node.type)) {
      ensureGroupFrameAtBottom(lf, node.id)
    }
  }
}

export function collectGroupIdsForNodes(lf: LogicFlow, nodeIds: readonly string[]): Set<string> {
  const groupIds = new Set<string>()
  const nodeIdSet = new Set(nodeIds)
  for (const id of nodeIds) {
    const model = lf.getNodeModelById(id)
    if (!model) continue
    if (isGroupFrameType(model.type)) {
      groupIds.add(id)
      continue
    }
    const parentId = model.properties?.dgGroupId
    if (typeof parentId === 'string' && parentId) {
      groupIds.add(parentId)
    }
  }
  if (nodeIdSet.size) {
    const graphNodes = lf.graphModel?.nodes
    if (!Array.isArray(graphNodes)) return groupIds
    for (const node of graphNodes) {
      if (!isGroupFrameType(node.type)) continue
      const members = (node.properties?.dgGroupMembers as string[] | undefined) ?? []
      if (members.some((memberId) => nodeIdSet.has(memberId))) {
        groupIds.add(node.id)
      }
    }
  }
  return groupIds
}

export function syncGroupFramesForNodes(
  lf: LogicFlow,
  nodeIds: readonly string[],
  options?: SyncGroupFrameBoundsOptions
): void {
  for (const groupId of collectGroupIdsForNodes(lf, nodeIds)) {
    syncGroupFrameBounds(lf, groupId, options)
  }
}
