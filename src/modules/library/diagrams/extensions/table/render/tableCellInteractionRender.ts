import { h } from '@logicflow/core'
import type { TableLayoutResult } from '@modules/library/diagrams/extensions/table/kinds/tableLayout'
import type { DiagramTableData } from '@modules/library/diagrams/extensions/table/kinds/tableTypes'
import {
  getTableCellMarquee,
  isTableCellSelected,
  tableActiveCellRevision
} from '@modules/library/diagrams/extensions/table/interaction/tableCellSelection'
import { renderTableEdgeHits } from '@modules/library/diagrams/extensions/table/render/tableEdgeHits'

/** 单元格命中、选区高亮、框选（命中由 document capture 统一处理，此处仅保留几何与 data-*） */
export function renderTableCellInteractionLayer(
  left: number,
  top: number,
  layout: TableLayoutResult,
  data: DiagramTableData,
  nodeId: string,
  selected: boolean
): unknown[] {
  void tableActiveCellRevision.value
  const shapes: unknown[] = []

  for (const region of layout.regions) {
    shapes.push(
      h('rect', {
        x: left + region.x,
        y: top + region.y,
        width: region.width,
        height: region.height,
        fill: 'transparent',
        stroke: 'none',
        class: 'dg-table-cell-hit',
        'data-row': String(region.row),
        'data-col': String(region.col),
        'data-kind': region.kind,
        'data-dg-node-id': nodeId
      })
    )
  }

  shapes.push(
    ...renderTableEdgeHits(left, top, layout, data.showHeader !== false, selected, nodeId)
  )

  const marquee = selected ? getTableCellMarquee(nodeId) : null
  if (marquee) {
    shapes.push(
      h('rect', {
        x: left + marquee.x,
        y: top + marquee.y,
        width: marquee.width,
        height: marquee.height,
        class: 'dg-table-cell-marquee',
        pointerEvents: 'none'
      })
    )
  }

  if (selected) {
    for (const region of layout.regions) {
      if (!isTableCellSelected(nodeId, region.row, region.col)) continue
      shapes.push(
        h('rect', {
          x: left + region.x + 1,
          y: top + region.y + 1,
          width: Math.max(0, region.width - 2),
          height: Math.max(0, region.height - 2),
          class: 'dg-table-cell-active',
          fill: 'none',
          pointerEvents: 'none'
        })
      )
    }
  }

  return shapes
}

export function renderTableInteractionGroup(
  left: number,
  top: number,
  layout: TableLayoutResult,
  data: DiagramTableData,
  nodeId: string,
  selected: boolean
): unknown {
  const shapes = renderTableCellInteractionLayer(left, top, layout, data, nodeId, selected)
  if (shapes.length === 0) return null
  return h('g', { className: 'dg-table-interaction-layer', 'data-dg-node-id': nodeId }, shapes as never)
}
