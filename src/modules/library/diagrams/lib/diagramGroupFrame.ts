import LogicFlow, { h } from '@logicflow/core'
import {
  DiagramRectResizeModel,
  DiagramRectResizeView
} from '@modules/library/diagrams/lib/diagramRectResizeBase'
import { applyDefaultRectSize } from '@modules/library/diagrams/lib/diagramShapeResize'

export const DIAGRAM_GROUP_FRAME_TYPE = 'dg-group-frame'

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
        ...data.properties
      }
    }

    getNodeStyle() {
      const style = super.getNodeStyle()
      const gs = readGroupStyle(this.properties as Record<string, unknown>)
      const visible = this.isHovered || this.isSelected
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
      return h('g', {}, [
        h('rect', {
          x: x - width / 2,
          y: y - height / 2,
          width,
          height,
          rx: 6,
          ry: 6,
          fill: style.fill,
          stroke: style.stroke,
          strokeWidth: style.strokeWidth,
          strokeDasharray: style.strokeDasharray
        })
      ])
    }
  }

  lf.register({ type: DIAGRAM_GROUP_FRAME_TYPE, view: GroupFrameView, model: GroupFrameModel })
}
