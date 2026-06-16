import type { DiagramNodeTextStyle } from '@modules/library/diagrams/lib/diagramSelectionTypes'
import type { TableCellCoord } from '@modules/library/diagrams/extensions/table/kinds/tableCellNav'
import {
  tableCellStyleKey,
  type DiagramTableData,
  type TableCellTextStyleOverride
} from '@modules/library/diagrams/extensions/table/kinds/tableTypes'
import { readTableCellTextStyle } from '@modules/library/diagrams/extensions/table/kinds/tableTextStyle'
import type { BaseNodeModel } from '@logicflow/core'

const TEXT_STYLE_FIELDS = [
  'fontSize',
  'color',
  'fontFamily',
  'fontWeight',
  'fontStyle',
  'underline',
  'strikethrough',
  'textAlign'
] as const

type TextStyleField = (typeof TEXT_STYLE_FIELDS)[number]

function overrideToDiagramTextStyle(
  override: TableCellTextStyleOverride | undefined
): Partial<DiagramNodeTextStyle> {
  if (!override) return {}
  const next: Partial<DiagramNodeTextStyle> = {}
  if (override.fontSize != null) next.fontSize = override.fontSize
  if (override.color != null) next.color = override.color
  if (override.fontFamily != null) next.fontFamily = override.fontFamily
  if (override.fontWeight != null) next.fontWeight = override.fontWeight
  if (override.fontStyle != null) next.fontStyle = override.fontStyle
  if (override.underline != null) next.underline = override.underline
  if (override.strikethrough != null) next.strikethrough = override.strikethrough
  if (override.textAlign != null) next.textAlign = override.textAlign
  return next
}

function diagramTextStyleToOverride(
  patch: Record<string, unknown>
): TableCellTextStyleOverride {
  const next: TableCellTextStyleOverride = {}
  if (patch.fontSize != null) next.fontSize = Number(patch.fontSize)
  if (patch.color != null) next.color = String(patch.color)
  if (patch.fontFamily != null) next.fontFamily = String(patch.fontFamily)
  if (patch.fontWeight != null) {
    next.fontWeight = patch.fontWeight === 'bold' ? 'bold' : 'normal'
  }
  if (patch.fontStyle != null) {
    next.fontStyle = patch.fontStyle === 'italic' ? 'italic' : 'normal'
  }
  if (patch.underline != null) next.underline = Boolean(patch.underline)
  if (patch.strikethrough != null) next.strikethrough = Boolean(patch.strikethrough)
  if (patch.textAlign === 'left' || patch.textAlign === 'center' || patch.textAlign === 'right') {
    next.textAlign = patch.textAlign
  }
  return next
}

export function readTableCellTextStyleOverride(
  data: DiagramTableData,
  row: number,
  col: number
): TableCellTextStyleOverride | undefined {
  return data.cellTextStyles?.[tableCellStyleKey(row, col)]
}

export function effectiveDiagramTextStyleForCell(
  model: BaseNodeModel,
  row: number,
  col: number,
  data?: DiagramTableData | null
): DiagramNodeTextStyle {
  const isHeader = row === -1
  const base = readTableCellTextStyle(model, isHeader, row, col, data)
  return {
    fontSize: base.fontSize,
    color: base.fill,
    fontFamily: base.fontFamily ?? '',
    fontWeight: base.fontWeight >= 600 ? 'bold' : 'normal',
    fontStyle: base.fontStyle === 'italic' ? 'italic' : 'normal',
    underline: base.textDecoration.includes('underline'),
    strikethrough: base.textDecoration.includes('line-through'),
    textAlign:
      base.textAnchor === 'start' ? 'left' : base.textAnchor === 'end' ? 'right' : 'center'
  }
}

export function resolveTableCellsTextStyleForProperty(
  model: BaseNodeModel,
  data: DiagramTableData,
  cells: TableCellCoord[]
): { textStyle: DiagramNodeTextStyle; mixedFields: string[] } {
  if (cells.length === 0) {
    const fallback = effectiveDiagramTextStyleForCell(model, -1, 0, data)
    return { textStyle: fallback, mixedFields: [] }
  }
  const styles = cells.map((c) => effectiveDiagramTextStyleForCell(model, c.row, c.col, data))
  const base = { ...styles[0]! }
  const mixedFields: string[] = []
  for (const field of TEXT_STYLE_FIELDS) {
    const first = styles[0]![field]
    if (!styles.every((s) => s[field] === first)) {
      mixedFields.push(`textStyle.${field}`)
    }
  }
  return { textStyle: base, mixedFields }
}

export function patchTableCellsTextStyle(
  data: DiagramTableData,
  cells: TableCellCoord[],
  patch: Record<string, unknown>
): DiagramTableData {
  if (cells.length === 0) return data
  const overridePatch = diagramTextStyleToOverride(patch)
  const styles = { ...(data.cellTextStyles ?? {}) }
  for (const cell of cells) {
    const key = tableCellStyleKey(cell.row, cell.col)
    styles[key] = { ...styles[key], ...overridePatch }
  }
  return { ...data, cellTextStyles: styles }
}

export function isTableCellTextStyleMixed(
  model: BaseNodeModel,
  data: DiagramTableData,
  cells: TableCellCoord[],
  field: TextStyleField
): boolean {
  if (cells.length <= 1) return false
  const { mixedFields } = resolveTableCellsTextStyleForProperty(model, data, cells)
  return mixedFields.includes(`textStyle.${field}`)
}
