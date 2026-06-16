import type { BaseNodeModel } from '@logicflow/core'
import { buildDiagramNodeTextStyle } from '@modules/library/diagrams/lib/diagramStyleBridge'
import type { DiagramNodeTextStyle } from '@modules/library/diagrams/lib/diagramSelectionTypes'
import type { TableCellMeasureStyle } from '@modules/library/diagrams/extensions/table/kinds/tableCellMeasure'
import type { DiagramTableData } from '@modules/library/diagrams/extensions/table/kinds/tableTypes'
import { tableCellStyleKey } from '@modules/library/diagrams/extensions/table/kinds/tableTypes'
import { cssFontFamilyStack } from '@shared/lib/fontCatalog'

/** 与画布全局字体栈一致（见 app/styles/main.css） */
export const DIAGRAM_DEFAULT_FONT_FAMILY =
  "'Inter', 'PingFang SC', 'Source Han Sans SC', system-ui, sans-serif"

export type TableCellTextPaint = {
  fontSize: number
  color: string
  fontFamily: string
  fontWeight: number
  fontStyle: 'normal' | 'italic'
  textDecoration: string
  textAlign: DiagramNodeTextStyle['textAlign']
  lineHeight: number
}

export function readTableTextAlign(model: BaseNodeModel): DiagramNodeTextStyle['textAlign'] {
  const propsStyle = (model.properties?.textStyle ?? {}) as Record<string, unknown>
  const align = propsStyle.textAlign
  if (align === 'left' || align === 'center' || align === 'right') return align
  const lfTextStyle = model.getTextStyle() as Record<string, unknown>
  const anchor = String(lfTextStyle.textAnchor ?? 'middle')
  if (anchor === 'start') return 'left'
  if (anchor === 'end') return 'right'
  return 'center'
}

export function tableTextAnchorForAlign(
  align: DiagramNodeTextStyle['textAlign']
): 'start' | 'middle' | 'end' {
  if (align === 'left') return 'start'
  if (align === 'right') return 'end'
  return 'middle'
}

export function tableCellTextX(
  cellLeft: number,
  cellWidth: number,
  align: DiagramNodeTextStyle['textAlign'],
  padX: number
): number {
  if (align === 'left') return cellLeft + padX
  if (align === 'right') return cellLeft + cellWidth - padX
  return cellLeft + cellWidth / 2
}

function resolveLfLineHeight(lfStyle: Record<string, unknown>): number {
  const lh = lfStyle.lineHeight
  return typeof lh === 'number' && lh > 0 ? lh : 1.2
}

function resolveFontFamily(...candidates: (string | undefined)[]): string {
  for (const candidate of candidates) {
    const stack = cssFontFamilyStack(String(candidate ?? '').trim())
    if (stack) return stack
  }
  return DIAGRAM_DEFAULT_FONT_FAMILY
}

function resolveFontWeight(lfStyle: Record<string, unknown>, isHeader: boolean): number {
  const weight = lfStyle.fontWeight
  if (weight === 'bold' || weight === 700) return 700
  if (typeof weight === 'number') {
    if (isHeader && weight < 600) return 600
    return weight
  }
  return isHeader ? 600 : 400
}

function readDecorationParts(lfStyle: Record<string, unknown>): string[] {
  const parts: string[] = []
  const raw = String(lfStyle.textDecoration ?? '')
  if (raw.includes('underline')) parts.push('underline')
  if (raw.includes('line-through')) parts.push('line-through')
  if (lfStyle.underline) parts.push('underline')
  if (lfStyle.strikethrough) parts.push('line-through')
  return [...new Set(parts)]
}

/** 与 LogicFlow 节点文本同源：buildDiagramNodeTextStyle + 单元格覆盖 */
export function resolveTableCellTextPaint(
  model: BaseNodeModel,
  isHeader: boolean,
  row = isHeader ? -1 : 0,
  col = 0,
  data?: DiagramTableData | null
): TableCellTextPaint {
  const lfStyle = buildDiagramNodeTextStyle(model) as Record<string, unknown>
  const propsStyle = (model.properties?.textStyle ?? {}) as Record<string, unknown>

  let fontSize = Number(lfStyle.fontSize ?? 12)
  let color = String(lfStyle.fill ?? lfStyle.color ?? '#121214')
  let fontFamily = resolveFontFamily(
    String(lfStyle.fontFamily ?? ''),
    String(propsStyle.fontFamily ?? '')
  )
  let fontWeight = resolveFontWeight(lfStyle, isHeader)
  let fontStyle: 'normal' | 'italic' =
    lfStyle.fontStyle === 'italic' || lfStyle.fontStyle === 'oblique' ? 'italic' : 'normal'
  let textAlign = readTableTextAlign(model)
  let lineHeight = resolveLfLineHeight(lfStyle)
  const decorationParts = readDecorationParts(lfStyle)

  const override = data?.cellTextStyles?.[tableCellStyleKey(row, col)]
  if (override) {
    if (override.fontSize != null) fontSize = override.fontSize
    if (override.color != null) color = override.color
    if (override.fontFamily != null) {
      fontFamily = resolveFontFamily(override.fontFamily)
    }
    if (override.fontWeight === 'bold') fontWeight = 700
    else if (override.fontWeight === 'normal') fontWeight = isHeader ? 600 : 400
    if (override.fontStyle === 'italic') fontStyle = 'italic'
    else if (override.fontStyle === 'normal') fontStyle = 'normal'
    if (override.textAlign) textAlign = override.textAlign
    if (override.underline) decorationParts.push('underline')
    if (override.strikethrough) decorationParts.push('line-through')
    if (override.underline === false) {
      const i = decorationParts.indexOf('underline')
      if (i >= 0) decorationParts.splice(i, 1)
    }
    if (override.strikethrough === false) {
      const i = decorationParts.indexOf('line-through')
      if (i >= 0) decorationParts.splice(i, 1)
    }
  }

  return {
    fontSize,
    color,
    fontFamily,
    fontWeight,
    fontStyle,
    textDecoration: decorationParts.length ? decorationParts.join(' ') : 'none',
    textAlign,
    lineHeight
  }
}

export function readTableCellTextStyle(
  model: BaseNodeModel,
  isHeader: boolean,
  row = isHeader ? -1 : 0,
  col = 0,
  data?: DiagramTableData | null
): {
  fontSize: number
  fill: string
  fontFamily?: string
  fontWeight: number
  fontStyle: string
  textDecoration: string
  textAnchor: 'start' | 'middle' | 'end'
  lineHeight: number
  textAlign: DiagramNodeTextStyle['textAlign']
} {
  const paint = resolveTableCellTextPaint(model, isHeader, row, col, data)
  return {
    fontSize: paint.fontSize,
    fill: paint.color,
    fontFamily: paint.fontFamily === DIAGRAM_DEFAULT_FONT_FAMILY ? undefined : paint.fontFamily,
    fontWeight: paint.fontWeight,
    fontStyle: paint.fontStyle,
    textDecoration: paint.textDecoration,
    textAnchor: tableTextAnchorForAlign(paint.textAlign),
    lineHeight: paint.lineHeight,
    textAlign: paint.textAlign
  }
}

export function toTableCellMeasureStyle(
  model: BaseNodeModel,
  isHeader: boolean
): TableCellMeasureStyle {
  const paint = resolveTableCellTextPaint(model, isHeader)
  return {
    fontSize: paint.fontSize,
    fontFamily: paint.fontFamily,
    fontWeight: paint.fontWeight,
    lineHeight: paint.lineHeight
  }
}
