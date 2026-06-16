import LogicFlow, { h } from '@logicflow/core'
import {
  DiagramRectResizeModel,
  DiagramRectResizeView
} from '@modules/library/diagrams/lib/diagramRectResizeBase'
import { applyDefaultRectSize } from '@modules/library/diagrams/lib/diagramShapeResize'
import { diagramGetResizeControl } from '@modules/library/diagrams/lib/diagramResizeControls'
import {
  applyNodeShapeExtension,
  DG_SHAPE_RENDER_REV_KEY
} from '@modules/library/diagrams/domain/shape-extension/diagramShapeBridge'
import { DG_SHAPE_PAYLOAD_KEY } from '@modules/library/diagrams/domain/shape-extension/types'
import {
  applyTableLayoutToModel,
  computeTableLayout,
  computeTableMinSize,
  normalizeTableData,
  syncTableLayoutToNode,
  TABLE_LAYOUT,
  type TableLayoutLine
} from '@modules/library/diagrams/extensions/table/kinds/tableLayout'
import { fitTableToNodeSize } from '@modules/library/diagrams/extensions/table/kinds/tableResize'
import {
  resolveTableCellTextPaint,
  toTableCellMeasureStyle
} from '@modules/library/diagrams/extensions/table/kinds/tableTextStyle'
import { wrapTableCellText } from '@modules/library/diagrams/extensions/table/kinds/tableCellMeasure'
import { renderTableCellHtmlText } from '@modules/library/diagrams/extensions/table/render/tableCellTextRender'
import type { TableLayoutMeasureOptions } from '@modules/library/diagrams/extensions/table/kinds/tableLayout'
import { DIAGRAM_TABLE_KIND, DIAGRAM_TABLE_LF_TYPE, type DiagramTableData } from '@modules/library/diagrams/extensions/table/kinds/tableTypes'
import { tableCodec } from '@modules/library/diagrams/extensions/table/kinds/tableCodec'
import { renderTableDividerOverlay, renderTableToolbarOverlay } from '@modules/library/diagrams/extensions/table/render/tableToolOverlay'
import { renderTableMoveOverlay } from '@modules/library/diagrams/extensions/table/render/tableMoveOverlay'
import { renderTableInteractionGroup } from '@modules/library/diagrams/extensions/table/render/tableCellInteractionRender'
import {
  readTableNodeAppearance,
  tableAppearanceCssVars
} from '@modules/library/diagrams/extensions/table/kinds/tableAppearance'
import { getTableActiveCell } from '@modules/library/diagrams/extensions/table/interaction/tableCellSelection'
import {
  isTableDividerDragging,
  isTableNodeResizing
} from '@modules/library/diagrams/extensions/table/interaction/tableCanvasRuntime'

const TABLE_LF_TYPE = DIAGRAM_TABLE_LF_TYPE

export function readTableData(model: { properties?: Record<string, unknown> }): DiagramTableData | null {
  const envelope = model.properties?.[DG_SHAPE_PAYLOAD_KEY]
  if (!envelope || typeof envelope !== 'object') return null
  try {
    return tableCodec.read(envelope as never)
  } catch {
    return null
  }
}

function readTableLayoutMeasureOptions(model: {
  getTextStyle?: () => Record<string, unknown>
  properties?: Record<string, unknown>
}): TableLayoutMeasureOptions {
  return {
    cellStyle: toTableCellMeasureStyle(model as never, false),
    headerStyle: toTableCellMeasureStyle(model as never, true)
  }
}

function renderWrappedCellText(
  top: number,
  line: TableLayoutLine,
  cellLeft: number,
  cellW: number,
  isHeader: boolean,
  model: { getTextStyle?: () => Record<string, unknown>; properties?: Record<string, unknown> },
  data: DiagramTableData | null
): unknown {
  const innerW = Math.max(8, cellW - TABLE_LAYOUT.PAD_X * 2)
  const paint = resolveTableCellTextPaint(model as never, isHeader, line.row, line.col, data)
  const measureStyle = {
    fontSize: paint.fontSize,
    fontFamily: paint.fontFamily,
    fontWeight: paint.fontWeight,
    lineHeight: paint.lineHeight
  }
  const wrapped = wrapTableCellText(line.text, innerW, measureStyle)
  return renderTableCellHtmlText(top, line, cellLeft, cellW, paint, wrapped)
}

export function registerTableShape(lf: LogicFlow): void {
  class Model extends DiagramRectResizeModel {
    initNodeData(data: LogicFlow.NodeConfig) {
      super.initNodeData(data)
      applyDefaultRectSize(this, data, { width: 240, height: 108, radius: 4 })
      this.text.editable = false
    }

    setAttributes() {
      super.setAttributes()
      const data = readTableData(this)
      if (!data) {
        this.minWidth = TABLE_LAYOUT.COL_MIN_W
        this.minHeight = TABLE_LAYOUT.ROW_H
        return
      }
      const measureOptions = readTableLayoutMeasureOptions(this)
      const mins = computeTableMinSize(data, measureOptions)
      this.minWidth = mins.minWidth
      this.minHeight = mins.minHeight
      if (!isTableDividerDragging() && !isTableNodeResizing()) {
        applyTableLayoutToModel(this, data, measureOptions)
      }
    }

    resize(resizeInfo: Parameters<DiagramRectResizeModel['resize']>[0]) {
      const before = readTableData(this)
      const oldW = this.width
      const oldH = this.height
      const result = super.resize(resizeInfo)
      if (!before) return result

      const mins = computeTableMinSize(before, readTableLayoutMeasureOptions(this))
      if (this.width < mins.minWidth) this.width = mins.minWidth
      if (this.height < mins.minHeight) this.height = mins.minHeight

      const fitted = fitTableToNodeSize(before, oldW, oldH, this.width, this.height)
      if (fitted) {
        const lf = this.graphModel?.lf
        if (lf) {
          applyNodeShapeExtension(lf, this.id, DIAGRAM_TABLE_KIND, fitted)
          const model = lf.getNodeModelById(this.id)
          if (model) syncTableLayoutToNode(model, fitted)
        }
      }
      return result
    }
  }

  class View extends DiagramRectResizeView {
    getText() {
      return h('g', {})
    }

    /** 角点在下、分割线在中、工具条在上，避免分割线被缩放层挡住 */
    getResizeControl() {
      const { model, graphModel } = this.props
      void model.properties?.[DG_SHAPE_RENDER_REV_KEY]
      const core = diagramGetResizeControl(model, graphModel)
      if (!model.isSelected) return core

      const data = readTableData(model)
      if (!data) return core

      const { x, y, width, height } = model
      const left = x - width / 2
      const top = y - height / 2
      const measureOptions = readTableLayoutMeasureOptions(model)
      const layout = computeTableLayout(data, width, measureOptions, height)
      const active = getTableActiveCell(model.id)
      const dividers = renderTableDividerOverlay(left, top, width, height, layout, model.id)
      const toolbar = renderTableToolbarOverlay(
        left,
        top,
        width,
        height,
        layout,
        data,
        model.id,
        active
      )
      const interaction =
        layout && data
          ? renderTableInteractionGroup(left, top, layout, data, model.id, true)
          : null
      const layers = [core, interaction, dividers, toolbar].filter(Boolean)
      if (layers.length === 0) return null
      if (layers.length === 1) return layers[0] as ReturnType<DiagramRectResizeView['getResizeControl']>
      return h('g', { className: 'dg-resize-root' }, layers as never) as ReturnType<
        DiagramRectResizeView['getResizeControl']
      >
    }

    getResizeOverlay() {
      return undefined
    }

    getResizeShape() {
      const { model } = this.props
      const { x, y, width, height } = model
      const style = model.getNodeStyle()
      const appearance = readTableNodeAppearance(style as Record<string, unknown>)
      const left = x - width / 2
      const top = y - height / 2
      const data = readTableData(model)
      const measureOptions = readTableLayoutMeasureOptions(model)
      const layout = data ? computeTableLayout(data, width, measureOptions, height) : null
      const colWidths = layout?.colWidths ?? [width]
      const selected = Boolean(model.isSelected)
      const strokeWidth = appearance.strokeWidth ?? 1
      const contentInset = Math.max(1, strokeWidth / 2)
      const clipId = `dg-table-clip-${model.id}`
      const shapeStyle = tableAppearanceCssVars(appearance)
      const shapes: unknown[] = [
        h('rect', {
          x: left,
          y: top,
          width,
          height,
          rx: 4,
          ry: 4,
          fill: appearance.fill,
          stroke: 'none',
          class: 'dg-table-body-bg'
        })
      ]
      const innerShapes: unknown[] = []

      if (layout?.regions) {
        for (const region of layout.regions) {
          if (region.kind !== 'header') continue
          innerShapes.push(
            h('rect', {
              x: left + region.x,
              y: top + region.y,
              width: region.width,
              height: region.height,
              class: 'dg-table-header-cell',
              stroke: 'none',
              pointerEvents: 'none'
            })
          )
        }
        const rowBands = new Map<number, { y: number; h: number }>()
        for (const region of layout.regions) {
          if (region.kind !== 'cell') continue
          if (!rowBands.has(region.row)) {
            rowBands.set(region.row, { y: region.y, h: region.height })
          }
        }
        for (const [rowIndex, band] of rowBands) {
          if (rowIndex % 2 !== 1) continue
          innerShapes.push(
            h('rect', {
              x: left,
              y: top + band.y,
              width,
              height: band.h,
              class: 'dg-table-row-alt',
              stroke: 'none',
              pointerEvents: 'none'
            })
          )
        }
        if (data?.showHeader !== false && layout.headerHeight > 0) {
          innerShapes.push(
            h('line', {
              x1: left,
              y1: top + layout.headerHeight,
              x2: left + width,
              y2: top + layout.headerHeight,
              class: 'dg-table-header-divider',
              stroke: appearance.stroke,
              strokeWidth: 1,
              opacity: 0.35
            })
          )
        }
      }

      let accX = left
      for (let i = 0; i < colWidths.length; i++) {
        const w = colWidths[i]!
        if (i > 0) {
          innerShapes.push(
            h('line', {
              x1: accX,
              y1: top,
              x2: accX,
              y2: top + height,
              class: 'dg-table-grid-line',
              stroke: appearance.stroke,
              strokeWidth: 1,
              opacity: 0.35
            })
          )
        }
        accX += w
      }

      for (const line of layout?.lines ?? []) {
        if (line.kind === 'divider') {
          innerShapes.push(
            h('line', {
              x1: left,
              y1: top + line.y,
              x2: left + width,
              y2: top + line.y,
              class: 'dg-table-grid-line',
              stroke: appearance.stroke,
              strokeWidth: 1,
              opacity: 0.35
            })
          )
        }
      }

      for (const line of layout?.lines ?? []) {
        if (line.kind === 'divider') continue
        const isHeader = line.kind === 'header'
        let cellLeft = left
        for (let i = 0; i < line.col; i++) cellLeft += colWidths[i] ?? 0
        const cellW = colWidths[line.col] ?? TABLE_LAYOUT.COL_MIN_W
        innerShapes.push(
          renderWrappedCellText(top, line, cellLeft, cellW, isHeader, model, data)
        )
      }

      const interactionLayer =
        layout && data
          ? renderTableInteractionGroup(left, top, layout, data, model.id, selected)
          : null
      const moveLayer = renderTableMoveOverlay(left, top, width, height, model.id)

      void model.properties?.[DG_SHAPE_RENDER_REV_KEY]
      shapes.push(
        h('defs', {}, [
          h('clipPath', { id: clipId }, [
            h('rect', {
              x: left + contentInset,
              y: top + contentInset,
              width: Math.max(0, width - contentInset * 2),
              height: Math.max(0, height - contentInset * 2),
              rx: Math.max(0, 4 - contentInset)
            })
          ])
        ]),
        h(
          'g',
          { clipPath: `url(#${clipId})` },
          innerShapes as never
        ),
        ...(interactionLayer ? [interactionLayer] : []),
        ...(moveLayer ? [moveLayer] : []),
        h('rect', {
          x: left,
          y: top,
          width,
          height,
          rx: 4,
          ry: 4,
          fill: 'none',
          stroke: style.stroke,
          strokeWidth: style.strokeWidth,
          class: 'dg-table-body-border',
          pointerEvents: 'none'
        })
      )
      return h('g', { className: 'dg-table-shape', 'data-dg-node-id': model.id }, shapes as never)
    }
  }

  lf.register({ type: TABLE_LF_TYPE, view: View, model: Model })
}

export { TABLE_LF_TYPE }
