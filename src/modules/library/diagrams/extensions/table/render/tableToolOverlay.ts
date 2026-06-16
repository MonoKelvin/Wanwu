import { h } from '@logicflow/core'
import type { TableLayoutResult } from '@modules/library/diagrams/extensions/table/kinds/tableLayout'
import { TABLE_LAYOUT } from '@modules/library/diagrams/extensions/table/kinds/tableLayout'
import type { TableActiveCell } from '@modules/library/diagrams/extensions/table/interaction/tableCellSelection'
import { getDefaultTableActiveCell } from '@modules/library/diagrams/extensions/table/kinds/tableCellNav'
import {
  getTableToolbarCapabilities,
  type TableToolbarCapabilities
} from '@modules/library/diagrams/extensions/table/kinds/tableToolbarOps'
import type { DiagramTableData } from '@modules/library/diagrams/extensions/table/kinds/tableTypes'
import {
  getTableActiveDivider,
  isTableDividerDragging,
  shouldHideTableToolbar,
  TABLE_TOOLBAR_TOOLTIP_ATTR
} from '@modules/library/diagrams/extensions/table/interaction/tableCanvasRuntime'

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function effectiveToolbarActive(
  data: DiagramTableData,
  active: TableActiveCell | null
): TableActiveCell {
  if (active) return active
  if (data.rows.length > 0) {
    return {
      col: Math.max(0, data.columns.length - 1),
      row: data.rows.length - 1
    }
  }
  return getDefaultTableActiveCell(data)
}

/** 工具条对齐锚点：列中心 X、行中心 Y（画布坐标） */
export function resolveToolbarAnchors(
  left: number,
  top: number,
  width: number,
  height: number,
  layout: TableLayoutResult,
  data: DiagramTableData,
  active: TableActiveCell | null
): { colCx: number; rowCy: number } {
  const cell = effectiveToolbarActive(data, active)
  const region = layout.regions.find((r) => r.row === cell.row && r.col === cell.col)
  if (!region) {
    return { colCx: left + width / 2, rowCy: top + height / 2 }
  }
  return {
    colCx: left + region.x + region.width / 2,
    rowCy: top + region.y + region.height / 2
  }
}

function renderDividerHandle(
  kind: 'col' | 'row',
  left: number,
  top: number,
  width: number,
  height: number,
  index: number,
  nodeId: string
): unknown {
  const isCol = kind === 'col'
  const active = getTableActiveDivider()
  const isActive =
    isTableDividerDragging() && active?.kind === kind && active.index === index
  const guide = isCol
    ? h('line', {
        x1: left + width / 2,
        y1: top,
        x2: left + width / 2,
        y2: top + height,
        class: 'dg-table-divider-guide'
      })
    : h('line', {
        x1: left,
        y1: top + height / 2,
        x2: left + width,
        y2: top + height / 2,
        class: 'dg-table-divider-guide'
      })

  return h(
    'g',
    {
      class: `dg-table-divider-handle dg-table-divider-handle--${kind}${isActive ? ' is-divider-active' : ''}`,
      'data-dg-node-id': nodeId
    },
    [
      guide,
      h('rect', {
        x: left,
        y: top,
        width,
        height,
        fill: 'transparent',
        stroke: 'none',
        className: isCol ? 'dg-table-col-divider' : 'dg-table-row-divider',
        'data-index': String(index),
        'data-dg-node-id': nodeId
      })
    ]
  )
}

function renderToolButton(
  cx: number,
  cy: number,
  className: string,
  nodeId: string,
  glyph: string,
  title: string,
  disabled: boolean,
  action: 'addCol' | 'addRow' | 'removeCol' | 'removeRow'
): unknown {
  const size = TABLE_LAYOUT.TOOL_SIZE
  const hit = TABLE_LAYOUT.TOOL_HIT
  const half = size / 2
  const hitHalf = hit / 2
  return h(
    'g',
    {
      class: `${className}${disabled ? ' is-disabled' : ''}`,
      'data-dg-node-id': nodeId,
      'data-disabled': disabled ? '1' : '0',
      [TABLE_TOOLBAR_TOOLTIP_ATTR]: title
    },
    [
      h('rect', {
        x: cx - hitHalf,
        y: cy - hitHalf,
        width: hit,
        height: hit,
        fill: 'transparent',
        stroke: 'none',
        class: 'dg-table-tool-hit',
        'data-dg-node-id': nodeId
      }),
      h('rect', {
        x: cx - half,
        y: cy - half,
        width: size,
        height: size,
        rx: 5,
        class: 'dg-table-tool-btn',
        'data-dg-node-id': nodeId
      }),
      h(
        'text',
        {
          x: cx,
          y: cy + 0.5,
          textAnchor: 'middle',
          dominantBaseline: 'middle',
          class: 'dg-table-tool-btn__glyph',
          pointerEvents: 'none'
        },
        glyph
      )
    ]
  )
}

function renderToolGuide(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): unknown {
  return h('line', {
    x1,
    y1,
    x2,
    y2,
    class: 'dg-table-tool-guide',
    pointerEvents: 'none'
  })
}

/** 选中时：列/行分割线手柄（置于缩放锚点之下） */
export function renderTableDividerOverlay(
  left: number,
  top: number,
  width: number,
  height: number,
  layout: TableLayoutResult,
  nodeId: string
): unknown {
  const hit = TABLE_LAYOUT.DIVIDER_HIT
  const parts: unknown[] = []

  for (const divider of layout.colDividers) {
    parts.push(
      renderDividerHandle(
        'col',
        left + divider.x - hit / 2,
        top,
        hit,
        height,
        divider.index,
        nodeId
      )
    )
  }
  for (const divider of layout.rowDividers) {
    parts.push(
      renderDividerHandle(
        'row',
        left,
        top + divider.y - hit / 2,
        width,
        hit,
        divider.index,
        nodeId
      )
    )
  }

  if (parts.length === 0) return null
  return h('g', { className: 'dg-table-divider-overlay', 'data-dg-node-id': nodeId }, parts as never)
}

function renderToolbarButtons(
  left: number,
  top: number,
  width: number,
  height: number,
  layout: TableLayoutResult,
  data: DiagramTableData,
  nodeId: string,
  active: TableActiveCell | null,
  caps: TableToolbarCapabilities
): unknown[] {
  const size = TABLE_LAYOUT.TOOL_SIZE
  const edgeGap = TABLE_LAYOUT.TOOL_GAP
  const pairGap = TABLE_LAYOUT.TOOL_PAIR_GAP
  const parts: unknown[] = []
  const { colCx, rowCy } = resolveToolbarAnchors(left, top, width, height, layout, data, active)

  const bottomY = top + height + edgeGap + size / 2
  const bottomCount = 1 + (caps.removeColumn ? 1 : 0)
  const bottomRowW = bottomCount * size + (caps.removeColumn ? pairGap : 0)
  const bottomStackLeft = clamp(colCx - bottomRowW / 2, left, left + width - bottomRowW)
  let bottomCx = bottomStackLeft + size / 2

  parts.push(renderToolGuide(colCx, top + height, colCx, bottomY - size / 2 - 2))

  parts.push(
    renderToolButton(
      bottomCx,
      bottomY,
      'dg-table-add-col',
      nodeId,
      '+',
      caps.addColumn ? '在选中列右侧插入列' : '已达最大列数',
      !caps.addColumn,
      'addCol'
    )
  )
  if (caps.removeColumn) {
    bottomCx += size + pairGap
    parts.push(
      renderToolButton(
        bottomCx,
        bottomY,
        'dg-table-remove-col',
        nodeId,
        '−',
        '删除选中列',
        false,
        'removeCol'
      )
    )
  }

  const leftX = left - edgeGap - size / 2
  const leftCount = 1 + (caps.removeRow ? 1 : 0)
  const leftStackH = leftCount * size + (caps.removeRow ? pairGap : 0)
  const leftStackTop = clamp(rowCy - leftStackH / 2, top, top + height - leftStackH)
  let leftCy = leftStackTop + size / 2

  parts.push(renderToolGuide(leftX + size / 2 + 2, rowCy, left, rowCy))

  parts.push(
    renderToolButton(
      leftX,
      leftCy,
      'dg-table-add-row',
      nodeId,
      '+',
      caps.addRow ? '在选中行下方插入行' : '已达最大行数',
      !caps.addRow,
      'addRow'
    )
  )
  if (caps.removeRow) {
    leftCy += size + pairGap
    parts.push(
      renderToolButton(
        leftX,
        leftCy,
        'dg-table-remove-row',
        nodeId,
        '−',
        '删除选中行',
        false,
        'removeRow'
      )
    )
  }

  return parts
}

/** 选中时：下方增删列、左侧增删行（对齐活动单元格，置于缩放锚点之上） */
export function renderTableToolbarOverlay(
  left: number,
  top: number,
  width: number,
  height: number,
  layout: TableLayoutResult,
  data: DiagramTableData,
  nodeId: string,
  active: TableActiveCell | null
): unknown {
  if (shouldHideTableToolbar()) return null
  const caps = getTableToolbarCapabilities(data, active)
  const parts = renderToolbarButtons(
    left,
    top,
    width,
    height,
    layout,
    data,
    nodeId,
    active,
    caps
  )
  return h('g', { className: 'dg-table-tool-overlay', 'data-dg-node-id': nodeId }, parts as never)
}

/** @deprecated 使用 renderTableDividerOverlay + renderTableToolbarOverlay */
export function renderTableInteractionOverlay(
  left: number,
  top: number,
  width: number,
  height: number,
  layout: TableLayoutResult,
  data: DiagramTableData,
  nodeId: string,
  active: TableActiveCell | null = null
): unknown {
  const dividers = renderTableDividerOverlay(left, top, width, height, layout, nodeId)
  const toolbar = renderTableToolbarOverlay(
    left,
    top,
    width,
    height,
    layout,
    data,
    nodeId,
    active
  )
  const parts = [dividers, toolbar].filter(Boolean)
  return h('g', { className: 'dg-table-interaction-overlay', 'data-dg-node-id': nodeId }, parts as never)
}
