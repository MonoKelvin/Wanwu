import type { DiagramTableData } from '@modules/library/diagrams/extensions/table/kinds/tableTypes'

export const TABLE_LAYOUT = {
  PAD_X: 8,
  HEADER_H: 28,
  ROW_H: 26,
  COL_MIN_W: 72,
  FONT_SIZE: 12
} as const

export type TableLayoutLine = {
  kind: 'header' | 'cell' | 'divider'
  row: number
  col: number
  y: number
  text: string
}

export type TableLayoutResult = {
  width: number
  height: number
  colWidths: number[]
  lines: TableLayoutLine[]
}

function measureColWidths(data: DiagramTableData, totalWidth?: number): number[] {
  const colCount = Math.max(1, data.columns.length)
  const widths = Array.from({ length: colCount }, () => TABLE_LAYOUT.COL_MIN_W)
  const measure = (text: string, col: number) => {
    const len = Math.max(String(text ?? '').length, 2)
    widths[col] = Math.max(widths[col]!, TABLE_LAYOUT.COL_MIN_W, len * 7 + TABLE_LAYOUT.PAD_X * 2)
  }
  if (data.showHeader) {
    data.columns.forEach((label, i) => measure(label, i))
  }
  for (const row of data.rows) {
    row.forEach((cell, i) => {
      if (i < colCount) measure(cell, i)
    })
  }
  if (totalWidth && totalWidth > 0) {
    const sum = widths.reduce((a, b) => a + b, 0)
    if (sum < totalWidth) {
      const extra = (totalWidth - sum) / colCount
      for (let i = 0; i < colCount; i++) widths[i] = widths[i]! + extra
    }
  }
  return widths
}

export function normalizeTableData(data: DiagramTableData): DiagramTableData {
  const colCount = Math.max(1, data.columns.length)
  const columns = Array.from({ length: colCount }, (_, i) => String(data.columns[i] ?? `列 ${i + 1}`))
  const rows = (data.rows ?? []).map((row) =>
    Array.from({ length: colCount }, (_, i) => String(row[i] ?? ''))
  )
  return {
    showHeader: data.showHeader !== false,
    columns,
    rows
  }
}

export function computeTableLayout(data: DiagramTableData, width?: number): TableLayoutResult {
  const normalized = normalizeTableData(data)
  const colWidths = measureColWidths(normalized, width)
  const totalWidth = colWidths.reduce((a, b) => a + b, 0)
  const lines: TableLayoutLine[] = []
  let y = 0

  if (normalized.showHeader) {
    normalized.columns.forEach((text, col) => {
      lines.push({ kind: 'header', row: -1, col, y: y + TABLE_LAYOUT.HEADER_H / 2, text })
    })
    y += TABLE_LAYOUT.HEADER_H
    lines.push({ kind: 'divider', row: -1, col: 0, y, text: '' })
  }

  normalized.rows.forEach((row, rowIndex) => {
    row.forEach((text, col) => {
      lines.push({
        kind: 'cell',
        row: rowIndex,
        col,
        y: y + TABLE_LAYOUT.ROW_H / 2,
        text
      })
    })
    y += TABLE_LAYOUT.ROW_H
    if (rowIndex < normalized.rows.length - 1) {
      lines.push({ kind: 'divider', row: rowIndex, col: 0, y, text: '' })
    }
  })

  const minHeight =
    (normalized.showHeader ? TABLE_LAYOUT.HEADER_H : 0) +
    Math.max(1, normalized.rows.length) * TABLE_LAYOUT.ROW_H

  return {
    width: Math.max(totalWidth, TABLE_LAYOUT.COL_MIN_W * colWidths.length),
    height: minHeight,
    colWidths,
    lines
  }
}

export function syncTableLayoutToNode(
  model: { width: number; height: number; minWidth?: number; minHeight?: number },
  data: DiagramTableData
): void {
  const layout = computeTableLayout(data, model.width)
  model.width = layout.width
  model.height = layout.height
  model.minWidth = TABLE_LAYOUT.COL_MIN_W
  model.minHeight = TABLE_LAYOUT.ROW_H
}
