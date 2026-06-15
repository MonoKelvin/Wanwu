import LogicFlow, { h } from '@logicflow/core'
import {
  DiagramRectResizeModel,
  DiagramRectResizeView
} from '@modules/library/diagrams/lib/diagramRectResizeBase'
import { applyDefaultRectSize } from '@modules/library/diagrams/lib/diagramShapeResize'
import { DG_SHAPE_RENDER_REV_KEY } from '@modules/library/diagrams/domain/shape-extension/diagramShapeBridge'
import { DG_SHAPE_PAYLOAD_KEY } from '@modules/library/diagrams/domain/shape-extension/types'
import {
  computeTableLayout,
  normalizeTableData,
  syncTableLayoutToNode,
  TABLE_LAYOUT,
  type TableLayoutLine
} from '@modules/library/diagrams/extensions/table/kinds/tableLayout'
import type { DiagramTableData } from '@modules/library/diagrams/extensions/table/kinds/tableTypes'
import { tableCodec } from '@modules/library/diagrams/extensions/table/kinds/tableCodec'

const TABLE_LF_TYPE = 'dg-table'

function readTableData(model: { properties?: Record<string, unknown> }): DiagramTableData | null {
  const envelope = model.properties?.[DG_SHAPE_PAYLOAD_KEY]
  if (!envelope || typeof envelope !== 'object') return null
  try {
    return tableCodec.read(envelope as never)
  } catch {
    return null
  }
}

function truncateCell(text: string, maxWidth: number): string {
  const maxChars = Math.max(4, Math.floor(maxWidth / 7))
  if (text.length <= maxChars) return text
  return `${text.slice(0, maxChars - 1)}…`
}

function colX(left: number, colWidths: number[], col: number): number {
  let x = left
  for (let i = 0; i < col; i++) x += colWidths[i] ?? 0
  return x + (colWidths[col] ?? 0) / 2
}

export function registerTableShape(lf: LogicFlow): void {
  class Model extends DiagramRectResizeModel {
    initNodeData(data: LogicFlow.NodeConfig) {
      super.initNodeData(data)
      applyDefaultRectSize(this, data, { width: 240, height: 108, radius: 4 })
      this.minWidth = TABLE_LAYOUT.COL_MIN_W
      this.minHeight = TABLE_LAYOUT.ROW_H
      this.text.editable = false
    }

    setAttributes() {
      const data = readTableData(this)
      if (data) syncTableLayoutToNode(this, data)
      super.setAttributes()
    }
  }

  class View extends DiagramRectResizeView {
    getResizeShape() {
      const { model } = this.props
      const { x, y, width, height } = model
      const style = model.getNodeStyle()
      const left = x - width / 2
      const top = y - height / 2
      const data = readTableData(model)
      const layout = data ? computeTableLayout(data, width) : null
      const colWidths = layout?.colWidths ?? [width]
      const shapes: unknown[] = [
        h('rect', {
          ...style,
          x: left,
          y: top,
          width,
          height,
          rx: 4,
          ry: 4
        })
      ]

      let accX = left
      for (let i = 0; i < colWidths.length; i++) {
        const w = colWidths[i]!
        if (i > 0) {
          shapes.push(
            h('line', {
              x1: accX,
              y1: top,
              x2: accX,
              y2: top + height,
              stroke: style.stroke,
              strokeWidth: style.strokeWidth
            })
          )
        }
        accX += w
      }

      const renderLine = (line: TableLayoutLine) => {
        if (line.kind === 'divider') {
          shapes.push(
            h('line', {
              x1: left,
              y1: top + line.y,
              x2: left + width,
              y2: top + line.y,
              stroke: style.stroke,
              strokeWidth: style.strokeWidth
            })
          )
          return
        }
        const cellW = colWidths[line.col] ?? TABLE_LAYOUT.COL_MIN_W
        const isHeader = line.kind === 'header'
        shapes.push(
          h('text', {
            x: colX(left, colWidths, line.col),
            y: top + line.y,
            dominantBaseline: 'middle',
            textAnchor: 'middle',
            fontSize: TABLE_LAYOUT.FONT_SIZE,
            fontWeight: isHeader ? 600 : 400,
            fill: style.stroke,
            pointerEvents: 'none'
          }, truncateCell(line.text, cellW - TABLE_LAYOUT.PAD_X * 2))
        )
      }

      layout?.lines.forEach(renderLine)

      void model.properties?.[DG_SHAPE_RENDER_REV_KEY]
      return h('g', { className: 'dg-table-shape' }, shapes as never)
    }
  }

  lf.register({ type: TABLE_LF_TYPE, view: View, model: Model })
}

export { TABLE_LF_TYPE }
