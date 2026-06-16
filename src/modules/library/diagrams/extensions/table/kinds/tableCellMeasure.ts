/** 单元格文本测量（无 tableLayout 依赖，避免循环引用） */

import { DIAGRAM_DEFAULT_FONT_FAMILY } from '@modules/library/diagrams/extensions/table/kinds/tableTextStyle'
import type { DiagramTableData } from '@modules/library/diagrams/extensions/table/kinds/tableTypes'

const CELL_LAYOUT = {
  PAD_X: 8,
  ROW_H: 26,
  COL_MIN_W: 72,
  FONT_SIZE: 12,
  CELL_PAD_Y: 8
} as const

export type TableCellMeasureStyle = {
  fontSize?: number
  fontFamily?: string
  fontWeight?: number
  lineHeight?: number
}

export type TableLayoutMeasureOptions = {
  cellStyle?: TableCellMeasureStyle
  headerStyle?: TableCellMeasureStyle
}

function lineBlockHeight(lineCount: number, fontSize: number, lineHeight = 1.2): number {
  const rowLineHeight = fontSize * lineHeight
  return Math.max(CELL_LAYOUT.ROW_H, lineCount * rowLineHeight + CELL_LAYOUT.CELL_PAD_Y)
}

/** 内容所需最小列宽（各列取该列所有单元格最大值） */
export function contentMinColWidths(
  data: DiagramTableData,
  options: TableLayoutMeasureOptions = {}
): number[] {
  const cellStyle = options.cellStyle ?? {}
  const headerStyle = options.headerStyle ?? cellStyle
  const colCount = Math.max(1, data.columns.length)
  const widths = Array.from({ length: colCount }, () => CELL_LAYOUT.COL_MIN_W)

  const bump = (text: string, col: number, style: TableCellMeasureStyle) => {
    const single = measureTableTextWidth(String(text ?? '').replace(/\n/g, ' '), style)
    const need = Math.max(CELL_LAYOUT.COL_MIN_W, single + CELL_LAYOUT.PAD_X * 2)
    widths[col] = Math.max(widths[col]!, need)
  }

  if (data.showHeader !== false) {
    data.columns.forEach((label, i) => bump(label, i, headerStyle))
  }
  for (const row of data.rows) {
    row.forEach((cell, i) => {
      if (i < colCount) bump(cell, i, cellStyle)
    })
  }
  return widths
}

/** 内容所需最小行高（基于当前列宽换行后行数） */
export function contentMinRowHeights(
  data: DiagramTableData,
  colWidths: number[],
  style: TableCellMeasureStyle = {}
): number[] {
  const fontSize = style.fontSize ?? CELL_LAYOUT.FONT_SIZE
  const lineHeight = style.lineHeight ?? 1.2
  const heights = data.rows.map(() => CELL_LAYOUT.ROW_H)

  for (let row = 0; row < data.rows.length; row++) {
    let maxLines = 1
    for (let col = 0; col < data.columns.length; col++) {
      const innerW = (colWidths[col] ?? CELL_LAYOUT.COL_MIN_W) - CELL_LAYOUT.PAD_X * 2
      const lines = countWrappedLines(data.rows[row]?.[col] ?? '', innerW, style)
      maxLines = Math.max(maxLines, lines)
    }
    heights[row] = lineBlockHeight(maxLines, fontSize, lineHeight)
  }
  return heights
}

export function contentMinHeaderHeight(
  data: DiagramTableData,
  colWidths: number[],
  style: TableCellMeasureStyle = {}
): number {
  if (data.showHeader === false) return 0
  const fontSize = style.fontSize ?? CELL_LAYOUT.FONT_SIZE
  const lineHeight = style.lineHeight ?? 1.2
  let maxLines = 1
  for (let col = 0; col < data.columns.length; col++) {
    const innerW = (colWidths[col] ?? CELL_LAYOUT.COL_MIN_W) - CELL_LAYOUT.PAD_X * 2
    const lines = countWrappedLines(data.columns[col] ?? '', innerW, style)
    maxLines = Math.max(maxLines, lines)
  }
  return lineBlockHeight(maxLines, fontSize, lineHeight)
}

let measureCtx: CanvasRenderingContext2D | null = null

function getMeasureContext(style: TableCellMeasureStyle): CanvasRenderingContext2D | null {
  if (typeof document === 'undefined') return null
  if (!measureCtx) {
    measureCtx = document.createElement('canvas').getContext('2d')
  }
  if (!measureCtx) return null
  const fontSize = style.fontSize ?? 12
  const fontWeight = style.fontWeight ?? 400
  const lineHeight = style.lineHeight ?? 1.2
  const fontFamily = style.fontFamily ?? DIAGRAM_DEFAULT_FONT_FAMILY
  measureCtx.font = `${fontWeight} ${fontSize}px ${fontFamily}`
  return measureCtx
}

export function measureTableTextWidth(
  text: string,
  style: TableCellMeasureStyle = {}
): number {
  const value = String(text ?? '')
  if (!value) return 0
  const ctx = getMeasureContext(style)
  if (ctx) return ctx.measureText(value).width
  const fontSize = style.fontSize ?? 12
  return value.length * fontSize * 0.55
}

/** 按可用宽度换行（保留显式换行符） */
export function wrapTableCellText(
  text: string,
  maxWidth: number,
  style: TableCellMeasureStyle = {}
): string[] {
  const innerW = Math.max(8, maxWidth)
  const paragraphs = String(text ?? '').split('\n')
  const lines: string[] = []

  for (const para of paragraphs) {
    if (!para) {
      lines.push('')
      continue
    }
    let current = ''
    for (const char of para) {
      const next = current + char
      if (measureTableTextWidth(next, style) > innerW && current) {
        lines.push(current)
        current = char
      } else {
        current = next
      }
    }
    if (current) lines.push(current)
  }

  return lines.length > 0 ? lines : ['']
}

export function countWrappedLines(
  text: string,
  innerWidth: number,
  style: TableCellMeasureStyle = {}
): number {
  return wrapTableCellText(text, innerWidth, style).length
}
