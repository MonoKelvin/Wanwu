import type { DiagramTableData } from '@modules/library/diagrams/extensions/table/kinds/tableTypes'
import {
  countWrappedLines,
  measureTableTextWidth,
  type TableCellMeasureStyle
} from '@modules/library/diagrams/extensions/table/kinds/tableCellMeasure'
import {
  materializeTableDimensions,
  normalizeTableData,
  TABLE_LAYOUT
} from '@modules/library/diagrams/extensions/table/kinds/tableLayout'

function lineBlockHeight(lineCount: number, fontSize: number): number {
  const lineHeight = fontSize * 1.35
  return Math.max(TABLE_LAYOUT.ROW_H, lineCount * lineHeight + TABLE_LAYOUT.CELL_PAD_Y)
}

/**
 * 根据单元格内容扩展列宽/行高（只增不减）
 */
export function fitTableCellContent(
  data: DiagramTableData,
  row: number,
  col: number,
  style: TableCellMeasureStyle = {}
): DiagramTableData {
  const normalized = materializeTableDimensions(data)
  const colWidths = [...normalized.colWidths!]
  const rowHeights = [...normalized.rowHeights!]
  const fontSize = style.fontSize ?? TABLE_LAYOUT.FONT_SIZE

  const value =
    row === -1 ? String(normalized.columns[col] ?? '') : String(normalized.rows[row]?.[col] ?? '')

  const singleLineW = measureTableTextWidth(value.replace(/\n/g, ' '), style)
  const neededColW = Math.max(TABLE_LAYOUT.COL_MIN_W, singleLineW + TABLE_LAYOUT.PAD_X * 2)
  if (neededColW > colWidths[col]!) {
    colWidths[col] = neededColW
  }

  const innerW = colWidths[col]! - TABLE_LAYOUT.PAD_X * 2
  const lineCount = countWrappedLines(value, innerW, style)
  const neededBlockH = lineBlockHeight(lineCount, fontSize)

  if (row === -1) {
    const headerHeight = normalized.headerHeight ?? TABLE_LAYOUT.HEADER_H
    return normalizeTableData({
      ...normalized,
      colWidths,
      headerHeight: Math.max(headerHeight, neededBlockH)
    })
  }

  if (row >= 0 && row < rowHeights.length && neededBlockH > rowHeights[row]!) {
    rowHeights[row] = neededBlockH
  }

  return normalizeTableData({ ...normalized, colWidths, rowHeights })
}

export type { TableCellMeasureStyle }
