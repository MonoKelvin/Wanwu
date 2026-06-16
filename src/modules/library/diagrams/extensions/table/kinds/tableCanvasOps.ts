import type { DiagramTableData } from '@modules/library/diagrams/extensions/table/kinds/tableTypes'
import type { TableCellMeasureStyle } from '@modules/library/diagrams/extensions/table/kinds/tableCellMeasure'
import {
  materializeTableDimensions,
  normalizeTableData,
  TABLE_LAYOUT
} from '@modules/library/diagrams/extensions/table/kinds/tableLayout'
import {
  resizeTableColumnDivider,
  resizeTableRowDivider
} from '@modules/library/diagrams/extensions/table/kinds/tableResize'

export { resizeTableColumnDivider, resizeTableRowDivider }

export const TABLE_MAX_COLS = 8
export const TABLE_MAX_ROWS = 32

export function patchTableCell(
  data: DiagramTableData,
  row: number,
  col: number,
  value: string,
  style?: TableCellMeasureStyle,
  tableWidth?: number,
  tableHeight?: number
): DiagramTableData {
  const normalized = normalizeTableData(data)
  let next: DiagramTableData
  if (row === -1) {
    const columns = [...normalized.columns]
    columns[col] = value
    next = { ...normalized, columns }
  } else {
    const rows = normalized.rows.map((r, ri) =>
      ri === row ? r.map((c, ci) => (ci === col ? value : c)) : [...r]
    )
    next = { ...normalized, rows }
  }
  const measureOptions =
    style != null
      ? row === -1
        ? { headerStyle: style }
        : { cellStyle: style }
      : {}
  return materializeTableDimensions(next, tableWidth, measureOptions, tableHeight)
}

export function insertTableColumn(
  data: DiagramTableData,
  refCol: number,
  before = false
): DiagramTableData {
  const normalized = materializeTableDimensions(data)
  if (normalized.columns.length >= TABLE_MAX_COLS) return normalized
  const insertAt = before
    ? Math.max(0, Math.min(refCol, normalized.columns.length))
    : Math.max(0, Math.min(refCol + 1, normalized.columns.length))
  const columns = [...normalized.columns]
  columns.splice(insertAt, 0, '')
  const rows = normalized.rows.map((row) => {
    const next = [...row]
    next.splice(insertAt, 0, '')
    return next
  })
  const colWidths = [...normalized.colWidths!]
  const ref = colWidths[Math.max(0, insertAt - 1)] ?? TABLE_LAYOUT.COL_MIN_W
  colWidths.splice(insertAt, 0, ref)
  return normalizeTableData({ ...normalized, columns, rows, colWidths })
}

export function deleteTableColumn(data: DiagramTableData, col: number): DiagramTableData {
  const normalized = materializeTableDimensions(data)
  if (normalized.columns.length <= 1) return normalized
  const columns = normalized.columns.filter((_, i) => i !== col)
  const rows = normalized.rows.map((row) => row.filter((_, i) => i !== col))
  const colWidths = normalized.colWidths!.filter((_, i) => i !== col)
  return normalizeTableData({ ...normalized, columns, rows, colWidths })
}

export function insertTableRow(data: DiagramTableData, refRow: number, before = false): DiagramTableData {
  const normalized = materializeTableDimensions(data)
  if (normalized.rows.length >= TABLE_MAX_ROWS) return normalized
  const colCount = normalized.columns.length
  const insertAt = before
    ? Math.max(0, Math.min(refRow, normalized.rows.length))
    : Math.max(0, Math.min(refRow + 1, normalized.rows.length))
  const rows = [...normalized.rows]
  rows.splice(insertAt, 0, Array.from({ length: colCount }, () => ''))
  const rowHeights = [...normalized.rowHeights!]
  const ref = rowHeights[Math.max(0, insertAt - 1)] ?? TABLE_LAYOUT.ROW_H
  rowHeights.splice(insertAt, 0, ref)
  return normalizeTableData({ ...normalized, rows, rowHeights })
}

export function deleteTableRow(data: DiagramTableData, row: number): DiagramTableData {
  const normalized = materializeTableDimensions(data)
  if (normalized.rows.length <= 1) return normalized
  const rows = normalized.rows.filter((_, i) => i !== row)
  const rowHeights = normalized.rowHeights!.filter((_, i) => i !== row)
  return normalizeTableData({ ...normalized, rows, rowHeights })
}

/** 交换两行数据及对应行高（属性面板上移/下移） */
export function moveTableRow(
  data: DiagramTableData,
  from: number,
  to: number
): DiagramTableData {
  if (from === to) return normalizeTableData(data)
  const normalized = materializeTableDimensions(data)
  const rows = [...normalized.rows]
  const rowHeights = [...normalized.rowHeights!]
  if (from < 0 || to < 0 || from >= rows.length || to >= rows.length) return normalized
  ;[rows[from], rows[to]] = [rows[to]!, rows[from]!]
  ;[rowHeights[from], rowHeights[to]] = [rowHeights[to]!, rowHeights[from]!]
  return normalizeTableData({ ...normalized, rows, rowHeights })
}

/** @deprecated 使用 resizeTableColumnDivider */
export function resizeTableColumnBoundary(
  data: DiagramTableData,
  dividerIndex: number,
  deltaX: number,
  _tableWidth?: number
): DiagramTableData {
  return resizeTableColumnDivider(data, dividerIndex, deltaX)
}

/** @deprecated 使用 resizeTableRowDivider */
export function resizeTableRowBoundary(
  data: DiagramTableData,
  dividerIndex: number,
  deltaY: number
): DiagramTableData {
  return resizeTableRowDivider(data, dividerIndex, deltaY)
}
