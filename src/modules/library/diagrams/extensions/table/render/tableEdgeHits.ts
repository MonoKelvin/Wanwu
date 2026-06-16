import { h } from '@logicflow/core'
import type { TableLayoutResult } from '@modules/library/diagrams/extensions/table/kinds/tableLayout'
import { TABLE_LAYOUT } from '@modules/library/diagrams/extensions/table/kinds/tableLayout'

/** draw.io：未选中表格时，行列分割线 4px 命中带可拖（每条分割线仅一层 hit，避免重复叠盖） */
export function renderTableEdgeHits(
  left: number,
  top: number,
  layout: TableLayoutResult,
  _showHeader: boolean,
  selected: boolean,
  nodeId: string
): unknown[] {
  if (selected) return []

  const edge = TABLE_LAYOUT.EDGE_HIT
  const parts: unknown[] = []

  for (const divider of layout.colDividers) {
    parts.push(
      h('rect', {
        x: left + divider.x - edge / 2,
        y: top,
        width: edge,
        height: layout.height,
        fill: 'transparent',
        stroke: 'none',
        className: 'dg-table-edge-hit dg-table-col-divider dg-table-divider-handle',
        'data-index': String(divider.index),
        'data-dg-node-id': nodeId
      })
    )
  }

  for (const divider of layout.rowDividers) {
    parts.push(
      h('rect', {
        x: left,
        y: top + divider.y - edge / 2,
        width: layout.width,
        height: edge,
        fill: 'transparent',
        stroke: 'none',
        className: 'dg-table-edge-hit dg-table-row-divider dg-table-divider-handle',
        'data-index': String(divider.index),
        'data-dg-node-id': nodeId
      })
    )
  }

  return parts
}
