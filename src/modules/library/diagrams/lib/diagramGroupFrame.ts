import LogicFlow, { h } from '@logicflow/core'
import {
  DiagramRectResizeModel,
  DiagramRectResizeView
} from '@modules/library/diagrams/lib/diagramRectResizeBase'
import {
  DEFAULT_GROUP_STYLE,
  readGroupStyle,
  resolveGroupFrameStrokeForRender
} from '@modules/library/diagrams/lib/diagramGroupFrameTheme'
import { applyDefaultRectSize } from '@modules/library/diagrams/lib/diagramShapeResize'

export const DIAGRAM_GROUP_FRAME_TYPE = 'dg-group-frame'

export type { DiagramGroupStyle } from '@modules/library/diagrams/lib/diagramGroupFrameTheme'
export {
  DEFAULT_GROUP_STYLE,
  GROUP_FRAME_STROKE_THEME,
  isThemeGroupFrameStroke,
  defaultGroupFrameStroke,
  readGroupStyle,
  resolveGroupFrameStrokeForRender,
  resolveGroupFrameStrokeForUi
} from '@modules/library/diagrams/lib/diagramGroupFrameTheme'

export function isGroupFrameType(type: unknown): boolean {
  return type === DIAGRAM_GROUP_FRAME_TYPE
}

/** LogicFlow NodeModel.type 在 d.ts 中可能收窄为 `""`，统一经此判断（不做 type predicate，避免 TS 将分支收窄为 never） */
export function isGroupFrameModel(model: { type?: unknown } | null | undefined): boolean {
  return isGroupFrameType(model?.type)
}

export function readGroupAlwaysVisible(properties: Record<string, unknown>): boolean {
  return Boolean(properties.dgGroupAlwaysVisible)
}

/** 新建组合框时的内边距与最小尺寸 */
export const DIAGRAM_GROUP_FRAME_CREATE_PAD = 12
export const DIAGRAM_GROUP_FRAME_MIN_SIZE = { width: 80, height: 60 } as const

/** 指针是否在组合框区域内（由适配器 pointermove 维护，不持久化） */
const pointerInsideGroupIds = new Set<string>()

export function setGroupFramePointerInside(groupId: string, inside: boolean): void {
  if (inside) pointerInsideGroupIds.add(groupId)
  else pointerInsideGroupIds.delete(groupId)
}

export function isGroupFramePointerInside(groupId: string): boolean {
  return pointerInsideGroupIds.has(groupId)
}

export function clearGroupFramePointerInside(): void {
  pointerInsideGroupIds.clear()
}

export function isPointInsideGroupFrame(
  model: { x: number; y: number; width: number; height: number },
  canvasX: number,
  canvasY: number
): boolean {
  const halfW = model.width / 2
  const halfH = model.height / 2
  return (
    canvasX >= model.x - halfW &&
    canvasX <= model.x + halfW &&
    canvasY >= model.y - halfH &&
    canvasY <= model.y + halfH
  )
}

function isLiveGroupFrame(lf: LogicFlow, groupId: string): boolean {
  const group = lf.getNodeModelById(groupId)
  return Boolean(group && isGroupFrameType(group.type))
}

/** 根据图元/连线解析所属组合框 id（组合框已删除时返回 null） */
/** 收集组合框下全部成员与组内连线（列表 + dgGroupId 反查 + 成员间隐式连线） */
export function collectDiagramGroupContent(
  lf: LogicFlow,
  groupId: string
): { memberNodeIds: string[]; memberEdgeIds: string[] } {
  const group = lf.getNodeModelById(groupId)
  if (!group || !isGroupFrameType(group.type)) {
    return { memberNodeIds: [], memberEdgeIds: [] }
  }

  const memberNodeIds = new Set<string>(
    ((group.properties?.dgGroupMembers as string[] | undefined) ?? []).filter((id) =>
      Boolean(lf.getNodeModelById(id))
    )
  )
  const memberEdgeIds = new Set<string>(
    ((group.properties?.dgGroupEdges as string[] | undefined) ?? []).filter((id) =>
      Boolean(lf.getEdgeModelById(id))
    )
  )

  for (const node of lf.graphModel.nodes) {
    if (isGroupFrameModel(node)) continue
    if (node.properties?.dgGroupId === groupId) memberNodeIds.add(node.id)
  }
  for (const edge of lf.graphModel.edges) {
    if (edge.properties?.dgGroupId === groupId) memberEdgeIds.add(edge.id)
  }
  for (const edge of lf.graphModel.edges) {
    if (memberNodeIds.has(edge.sourceNodeId) && memberNodeIds.has(edge.targetNodeId)) {
      memberEdgeIds.add(edge.id)
    }
  }

  return {
    memberNodeIds: [...memberNodeIds],
    memberEdgeIds: [...memberEdgeIds]
  }
}

export function resolveGroupFrameIdForElement(
  lf: LogicFlow,
  elementId: string,
  kind: 'node' | 'edge'
): string | null {
  if (kind === 'node') {
    const model = lf.getNodeModelById(elementId)
    if (!model) return null
    if (isGroupFrameType(model.type)) return elementId
    const gid = model.properties?.dgGroupId
    if (typeof gid === 'string' && gid && isLiveGroupFrame(lf, gid)) return gid
    for (const frame of lf.graphModel.nodes) {
      if (!isGroupFrameModel(frame)) continue
      const members = (frame.properties?.dgGroupMembers as string[] | undefined) ?? []
      if (members.includes(elementId) && isLiveGroupFrame(lf, frame.id)) return frame.id
    }
    return null
  }
  const edge = lf.getEdgeModelById(elementId)
  const gid = edge?.properties?.dgGroupId
  if (typeof gid === 'string' && gid && isLiveGroupFrame(lf, gid)) return gid
  for (const frame of lf.graphModel.nodes) {
    if (!isGroupFrameModel(frame)) continue
    const edges = (frame.properties?.dgGroupEdges as string[] | undefined) ?? []
    if (edges.includes(elementId) && isLiveGroupFrame(lf, frame.id)) return frame.id
  }
  return null
}

const GROUP_MEMBERSHIP_KEYS = ['dgGroupId', 'dgGroupMembers', 'dgGroupEdges'] as const

/** 同步组合框成员列表与成员 dgGroupId（修复 load/编辑后数据不一致） */
export function syncDiagramGroupMembershipFromFrames(lf: LogicFlow): void {
  for (const frame of lf.graphModel.nodes) {
    if (!isGroupFrameModel(frame)) continue
    const groupId = frame.id
    const { memberNodeIds, memberEdgeIds } = collectDiagramGroupContent(lf, groupId)

    for (const memberId of memberNodeIds) {
      const member = lf.getNodeModelById(memberId)
      if (member && member.properties?.dgGroupId !== groupId) {
        lf.setProperties(memberId, { dgGroupId: groupId })
      }
    }
    for (const edgeId of memberEdgeIds) {
      const edge = lf.getEdgeModelById(edgeId)
      if (edge && edge.properties?.dgGroupId !== groupId) {
        lf.setProperties(edgeId, { dgGroupId: groupId })
      }
    }

    const listedMembers = (frame.properties?.dgGroupMembers as string[] | undefined) ?? []
    const listedEdges = (frame.properties?.dgGroupEdges as string[] | undefined) ?? []
    const membersMatch =
      listedMembers.length === memberNodeIds.length &&
      memberNodeIds.every((id) => listedMembers.includes(id))
    const edgesMatch =
      listedEdges.length === memberEdgeIds.length &&
      memberEdgeIds.every((id) => listedEdges.includes(id))
    if (!membersMatch || !edgesMatch) {
      lf.setProperties(groupId, {
        dgGroupMembers: memberNodeIds,
        dgGroupEdges: memberEdgeIds
      })
    }
  }
}

/** 彻底清除图元/连线的组合标识（setProperties(undefined) 无法删除 LF 属性） */
export function clearElementGroupId(lf: LogicFlow, elementId: string): void {
  clearElementGroupMembership(lf, elementId)
}

/** 清除图元/连线上全部组合成员属性 */
export function clearElementGroupMembership(lf: LogicFlow, elementId: string): void {
  const node = lf.getNodeModelById(elementId)
  const edge = lf.getEdgeModelById(elementId)
  if (!node && !edge) return
  const props = (node ?? edge)?.properties as Record<string, unknown> | undefined
  if (!props) return
  for (const key of GROUP_MEMBERSHIP_KEYS) {
    if (key in props) lf.deleteProperty(elementId, key)
  }
}

/** 按画布坐标同步各组合框的悬停状态 */
export function syncGroupFramePointerHover(
  lf: LogicFlow,
  canvasX: number,
  canvasY: number
): void {
  for (const model of lf.graphModel.nodes) {
    if (!isGroupFrameModel(model)) continue
    const inside = isPointInsideGroupFrame(model, canvasX, canvasY)
    setGroupFramePointerInside(model.id, inside)
  }
}

export function registerDiagramGroupFrame(lf: LogicFlow): void {
  class GroupFrameModel extends DiagramRectResizeModel {
    initNodeData(data: LogicFlow.NodeConfig) {
      super.initNodeData(data)
      applyDefaultRectSize(this, data, { width: 120, height: 80 })
      this.minWidth = 40
      this.minHeight = 40
      this.text.editable = false
      this.properties = {
        dgGroupMembers: [],
        dgGroupEdges: [],
        dgGroupStyle: { ...DEFAULT_GROUP_STYLE },
        dgGroupAlwaysVisible: false,
        ...data.properties
      }
    }

    isGroupFrameVisible(): boolean {
      if (readGroupAlwaysVisible(this.properties as Record<string, unknown>)) return true
      if (this.isSelected) return true
      const members = (this.properties?.dgGroupMembers as string[] | undefined) ?? []
      if (
        members.some((id) => {
          const member = this.graphModel?.getNodeModelById(id)
          return member?.isSelected
        })
      ) {
        return true
      }
      return isGroupFramePointerInside(this.id)
    }

    getNodeStyle() {
      const style = super.getNodeStyle()
      const gs = readGroupStyle(this.properties as Record<string, unknown>)
      const visible = this.isGroupFrameVisible()
      return {
        ...style,
        fill: visible ? gs.fill : 'transparent',
        stroke: visible ? resolveGroupFrameStrokeForRender(gs.stroke) : 'transparent',
        strokeWidth: visible ? gs.strokeWidth : 0,
        strokeDasharray: visible ? gs.strokeDasharray : undefined
      }
    }

    getTextStyle() {
      return { ...super.getTextStyle(), display: 'none' }
    }
  }

  class GroupFrameView extends DiagramRectResizeView {
    getResizeShape() {
      const { model } = this.props
      const { x, y, width, height } = model
      const style = model.getNodeStyle()
      const left = x - width / 2
      const top = y - height / 2
      return h('g', { className: 'dg-group-frame' }, [
        h('rect', {
          x: left,
          y: top,
          width,
          height,
          rx: 6,
          ry: 6,
          fill: style.fill,
          stroke: style.stroke,
          strokeWidth: style.strokeWidth,
          strokeDasharray: style.strokeDasharray,
          pointerEvents: 'none'
        }),
        h('rect', {
          x: left,
          y: top,
          width,
          height,
          rx: 6,
          ry: 6,
          fill: 'transparent',
          stroke: 'transparent',
          pointerEvents: 'fill'
        })
      ])
    }
  }

  lf.register({ type: DIAGRAM_GROUP_FRAME_TYPE, view: GroupFrameView, model: GroupFrameModel })
}
