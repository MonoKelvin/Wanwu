import LogicFlow, { h } from '@logicflow/core'
import {
  DiagramRectResizeModel,
  DiagramRectResizeView
} from '@modules/library/diagrams/lib/diagramRectResizeBase'
import { applyDefaultRectSize } from '@modules/library/diagrams/lib/diagramShapeResize'

export const DIAGRAM_GROUP_FRAME_TYPE = 'dg-group-frame'

export function isGroupFrameType(type: unknown): boolean {
  return type === DIAGRAM_GROUP_FRAME_TYPE
}

export type DiagramGroupStyle = {
  stroke: string
  strokeWidth: number
  strokeDasharray: string
  fill: string
}

export const DEFAULT_GROUP_STYLE: DiagramGroupStyle = {
  stroke: '#3b82f6',
  strokeWidth: 1.5,
  strokeDasharray: '6 4',
  fill: 'transparent'
}

export function readGroupStyle(properties: Record<string, unknown>): DiagramGroupStyle {
  const raw = (properties.dgGroupStyle ?? {}) as Partial<DiagramGroupStyle>
  return {
    stroke: raw.stroke ?? DEFAULT_GROUP_STYLE.stroke,
    strokeWidth: raw.strokeWidth ?? DEFAULT_GROUP_STYLE.strokeWidth,
    strokeDasharray: raw.strokeDasharray ?? DEFAULT_GROUP_STYLE.strokeDasharray,
    fill: raw.fill ?? DEFAULT_GROUP_STYLE.fill
  }
}

export function readGroupAlwaysVisible(properties: Record<string, unknown>): boolean {
  return Boolean(properties.dgGroupAlwaysVisible)
}

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
        stroke: visible ? gs.stroke : 'transparent',
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
