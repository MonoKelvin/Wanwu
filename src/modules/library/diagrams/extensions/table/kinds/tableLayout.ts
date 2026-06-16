import type { DiagramTableData } from '@modules/library/diagrams/extensions/table/kinds/tableTypes'
import {
  contentMinColWidths,
  contentMinHeaderHeight,
  contentMinRowHeights,
  type TableLayoutMeasureOptions
} from '@modules/library/diagrams/extensions/table/kinds/tableCellMeasure'
import { syncNodeSizeProperties } from '@modules/library/diagrams/lib/diagramShapeResize'

export type { TableLayoutMeasureOptions } from '@modules/library/diagrams/extensions/table/kinds/tableCellMeasure'

export const TABLE_LAYOUT = {
  PAD_X: 8,
  HEADER_H: 28,
  ROW_H: 26,
  COL_MIN_W: 72,
  FONT_SIZE: 12,
  DIVIDER_HIT: 8,
  EDGE_HIT: 4,
  TOOL_SIZE: 20,
  TOOL_HIT: 28,
  MOVE_SIZE: 28,
  MOVE_HIT: 38,
  TOOL_GAP: 10,
  TOOL_PAIR_GAP: 6,
  CELL_PAD_Y: 8
} as const

export type TableLayoutLine = {
  kind: 'header' | 'cell' | 'divider'
  row: number
  col: number
  y: number
  text: string
  cellTop: number
  cellHeight: number
}

export type TableLayoutRegion = {
  kind: 'header' | 'cell'
  row: number
  col: number
  x: number
  y: number
  width: number
  height: number
}

export type TableColDivider = {
  index: number
  x: number
}

export type TableRowDivider = {
  index: number
  y: number
}

export type TableLayoutResult = {
  width: number
  height: number
  colWidths: number[]
  rowHeights: number[]
  headerHeight: number
  lines: TableLayoutLine[]
  regions: TableLayoutRegion[]
  colDividers: TableColDivider[]
  rowDividers: TableRowDivider[]
}

/** 在不低于 mins 的前提下将 total 均分 */
export function distributeEqual(total: number, mins: number[]): number[] {
  const n = mins.length
  if (n === 0) return []
  const floors = mins.map((m) => Math.max(0, m))
  const floorSum = floors.reduce((a, b) => a + b, 0)
  const budget = Math.max(total, floorSum)
  const slot = (budget - floorSum) / n
  const sizes = floors.map((f) => f + slot)
  const sum = sizes.reduce((a, b) => a + b, 0)
  sizes[n - 1]! += budget - sum
  return sizes
}

/** 保持各档比例，将总和缩放到 total（不低于 floors），避免拖拽后被均分覆盖 */
export function scaleSizesToTotal(sizes: number[], total: number, floors: number[]): number[] {
  const n = sizes.length
  if (n === 0) return []
  const mins = floors.map((f) => Math.max(0, f))
  const minSum = mins.reduce((a, b) => a + b, 0)
  const target = Math.max(total, minSum)
  let current = sizes.map((s, i) => Math.max(mins[i]!, s))
  let sum = current.reduce((a, b) => a + b, 0)
  if (sum <= 0.01) return distributeEqual(target, mins)
  if (Math.abs(sum - target) <= 0.5) return current

  for (let pass = 0; pass < 8; pass++) {
    const scale = target / sum
    const next = current.map((s, i) => Math.max(mins[i]!, s * scale))
    const nextSum = next.reduce((a, b) => a + b, 0)
    if (Math.abs(nextSum - target) <= 0.5) {
      current = next
      break
    }
    current = next
    sum = nextSum
  }
  const diff = target - current.reduce((a, b) => a + b, 0)
  current[n - 1]! += diff
  return current
}

function measureColWidths(
  data: DiagramTableData,
  totalWidth?: number,
  measureOptions: TableLayoutMeasureOptions = {}
): number[] {
  const colCount = Math.max(1, data.columns.length)
  const contentMins = contentMinColWidths(data, measureOptions)
  const colFloor = (index: number) =>
    Math.max(TABLE_LAYOUT.COL_MIN_W, contentMins[index] ?? TABLE_LAYOUT.COL_MIN_W)

  let widths: number[]
  if (data.colWidths?.length === colCount) {
    widths = data.colWidths.map((w, i) => Math.max(colFloor(i), w))
  } else if (totalWidth && totalWidth > 0) {
    widths = distributeEqual(
      totalWidth,
      Array.from({ length: colCount }, (_, i) => colFloor(i))
    )
  } else {
    const natural = Array.from({ length: colCount }, (_, i) => colFloor(i))
    widths = distributeEqual(natural.reduce((a, b) => a + b, 0), natural)
  }

  if (totalWidth && totalWidth > 0) {
    const sum = widths.reduce((a, b) => a + b, 0)
    if (Math.abs(sum - totalWidth) > 0.5) {
      const floors = Array.from({ length: colCount }, (_, i) => colFloor(i))
      widths =
        data.colWidths?.length === colCount
          ? scaleSizesToTotal(widths, totalWidth, floors)
          : distributeEqual(totalWidth, floors)
    }
  }
  return widths
}

function resolveRowHeights(
  data: DiagramTableData,
  colWidths: number[],
  measureOptions: TableLayoutMeasureOptions = {},
  bodyHeight?: number
): number[] {
  const rowCount = Math.max(1, data.rows.length)
  const cellStyle = measureOptions.cellStyle ?? {}
  const contentMins = contentMinRowHeights(data, colWidths, cellStyle)
  const rowFloor = (index: number) =>
    Math.max(TABLE_LAYOUT.ROW_H, contentMins[index] ?? TABLE_LAYOUT.ROW_H)

  if (data.rowHeights?.length === rowCount) {
    const heights = data.rowHeights.map((h, i) => Math.max(rowFloor(i), h))
    if (bodyHeight != null && bodyHeight > 0) {
      const sum = heights.reduce((a, b) => a + b, 0)
      if (Math.abs(sum - bodyHeight) > 0.5) {
        const floors = Array.from({ length: rowCount }, (_, i) => rowFloor(i))
        return scaleSizesToTotal(heights, bodyHeight, floors)
      }
    }
    return heights
  }

  const defaultBody =
    contentMins.reduce((a, b) => a + b, 0) || rowCount * TABLE_LAYOUT.ROW_H
  const totalBody = bodyHeight != null && bodyHeight > 0 ? bodyHeight : defaultBody
  return distributeEqual(
    totalBody,
    Array.from({ length: rowCount }, (_, i) => rowFloor(i))
  )
}

export function normalizeTableData(data: DiagramTableData): DiagramTableData {
  const colCount = Math.max(1, data.columns.length)
  const columns = Array.from({ length: colCount }, (_, i) => String(data.columns[i] ?? ''))
  const rows = (data.rows ?? []).map((row) =>
    Array.from({ length: colCount }, (_, i) => String(row[i] ?? ''))
  )
  const rowHeights =
    data.rowHeights?.length === rows.length
      ? data.rowHeights.map((h) => Math.max(TABLE_LAYOUT.ROW_H, h))
      : undefined
  const colWidths =
    data.colWidths?.length === colCount
      ? data.colWidths.map((w) => Math.max(TABLE_LAYOUT.COL_MIN_W, w))
      : undefined
  const headerHeight =
    data.headerHeight != null ? Math.max(TABLE_LAYOUT.ROW_H, data.headerHeight) : undefined
  const cellTextStyles =
    data.cellTextStyles && typeof data.cellTextStyles === 'object'
      ? { ...data.cellTextStyles }
      : undefined

  return {
    showHeader: data.showHeader !== false,
    columns,
    rows,
    ...(colWidths ? { colWidths } : {}),
    ...(rowHeights ? { rowHeights } : {}),
    ...(headerHeight != null ? { headerHeight } : {}),
    ...(cellTextStyles ? { cellTextStyles } : {})
  }
}

export function computeTableLayout(
  data: DiagramTableData,
  width?: number,
  measureOptions: TableLayoutMeasureOptions = {},
  height?: number
): TableLayoutResult {
  const normalized = normalizeTableData(data)
  const colWidths = measureColWidths(normalized, width, measureOptions)
  const headerStyle = measureOptions.headerStyle ?? measureOptions.cellStyle ?? {}
  let headerHeight = normalized.showHeader
    ? normalized.headerHeight ?? TABLE_LAYOUT.HEADER_H
    : 0
  if (normalized.showHeader) {
    headerHeight = Math.max(
      headerHeight,
      contentMinHeaderHeight(normalized, colWidths, headerStyle)
    )
  }
  const bodyHeight =
    height != null && height > 0 ? Math.max(0, height - headerHeight) : undefined
  const rowHeights = resolveRowHeights(normalized, colWidths, measureOptions, bodyHeight)
  const totalWidth = colWidths.reduce((a, b) => a + b, 0)
  const lines: TableLayoutLine[] = []
  const regions: TableLayoutRegion[] = []
  const colDividers: TableColDivider[] = []
  const rowDividers: TableRowDivider[] = []
  let y = 0
  let accX = 0

  for (let i = 1; i < colWidths.length; i++) {
    accX += colWidths[i - 1]!
    colDividers.push({ index: i, x: accX })
  }

  if (normalized.showHeader) {
    accX = 0
    normalized.columns.forEach((text, col) => {
      const cellW = colWidths[col]!
      regions.push({
        kind: 'header',
        row: -1,
        col,
        x: accX,
        y: 0,
        width: cellW,
        height: headerHeight
      })
      lines.push({
        kind: 'header',
        row: -1,
        col,
        y: y + headerHeight / 2,
        text,
        cellTop: y,
        cellHeight: headerHeight
      })
      accX += cellW
    })
    y += headerHeight
    rowDividers.push({ index: 0, y })
    lines.push({ kind: 'divider', row: -1, col: 0, y, text: '', cellTop: y, cellHeight: 0 })
  }

  normalized.rows.forEach((row, rowIndex) => {
    const rowH = rowHeights[rowIndex] ?? TABLE_LAYOUT.ROW_H
    accX = 0
    row.forEach((text, col) => {
      const cellW = colWidths[col] ?? TABLE_LAYOUT.COL_MIN_W
      regions.push({
        kind: 'cell',
        row: rowIndex,
        col,
        x: accX,
        y,
        width: cellW,
        height: rowH
      })
      lines.push({
        kind: 'cell',
        row: rowIndex,
        col,
        y: y + rowH / 2,
        text,
        cellTop: y,
        cellHeight: rowH
      })
      accX += cellW
    })
    y += rowH
    rowDividers.push({ index: normalized.showHeader ? rowIndex + 1 : rowIndex, y })
    if (rowIndex < normalized.rows.length - 1) {
      lines.push({ kind: 'divider', row: rowIndex, col: 0, y, text: '', cellTop: y, cellHeight: 0 })
    }
  })

  const minHeight = headerHeight + rowHeights.reduce((a, b) => a + b, 0)

  return {
    width: Math.max(totalWidth, TABLE_LAYOUT.COL_MIN_W * colWidths.length),
    height: minHeight,
    colWidths,
    rowHeights,
    headerHeight,
    lines,
    regions,
    colDividers,
    rowDividers
  }
}

export type TableMinSize = { minWidth: number; minHeight: number }

export function computeTableMinSize(
  data: DiagramTableData,
  measureOptions: TableLayoutMeasureOptions = {}
): TableMinSize {
  const normalized = normalizeTableData(data)
  const colWidths = contentMinColWidths(normalized, measureOptions)
  const rowHeights = contentMinRowHeights(normalized, colWidths, measureOptions.cellStyle ?? {})
  const headerStyle = measureOptions.headerStyle ?? measureOptions.cellStyle ?? {}
  const headerMin =
    normalized.showHeader !== false
      ? contentMinHeaderHeight(normalized, colWidths, headerStyle)
      : 0
  return {
    minWidth: colWidths.reduce((a, b) => a + b, 0),
    minHeight: headerMin + rowHeights.reduce((a, b) => a + b, 0)
  }
}

/** 固化 colWidths / rowHeights，避免 measure 覆盖拖拽结果 */
export function materializeTableDimensions(
  data: DiagramTableData,
  tableWidth?: number,
  measureOptions: TableLayoutMeasureOptions = {},
  tableHeight?: number
): DiagramTableData {
  const normalized = normalizeTableData(data)
  const layout = computeTableLayout(normalized, tableWidth, measureOptions, tableHeight)
  return normalizeTableData({
    ...normalized,
    colWidths: [...layout.colWidths],
    rowHeights: [...layout.rowHeights],
    ...(normalized.showHeader !== false ? { headerHeight: layout.headerHeight } : {})
  })
}

/** 拖拽分割线/角点缩放时保留已有列宽行高，避免 materialize 重置用户布局 */
export function snapshotTableDataForDrag(
  data: DiagramTableData,
  tableWidth?: number,
  measureOptions: TableLayoutMeasureOptions = {},
  tableHeight?: number
): DiagramTableData {
  const normalized = normalizeTableData(data)
  const colCount = normalized.columns.length
  const rowCount = normalized.rows.length
  if (
    normalized.colWidths?.length === colCount &&
    normalized.rowHeights?.length === rowCount
  ) {
    return normalized
  }
  return materializeTableDimensions(normalized, tableWidth, measureOptions, tableHeight)
}

export function applyTableLayoutToModel(
  model: {
    width: number
    height: number
    minWidth?: number
    minHeight?: number
  },
  data: DiagramTableData,
  measureOptions: TableLayoutMeasureOptions = {}
): boolean {
  const mins = computeTableMinSize(data, measureOptions)
  model.minWidth = mins.minWidth
  model.minHeight = mins.minHeight

  const targetWidth = Math.max(model.width, mins.minWidth)
  const targetHeight = Math.max(model.height, mins.minHeight)
  const layout = computeTableLayout(data, targetWidth, measureOptions, targetHeight)

  let changed = false
  if (targetWidth > model.width + 0.5) {
    model.width = targetWidth
    changed = true
  }
  if (layout.height > model.height + 0.5) {
    model.height = layout.height
    changed = true
  } else if (targetHeight > model.height + 0.5) {
    model.height = targetHeight
    changed = true
  }
  return changed
}

/** dgShape 内容变更后同步尺寸；勿在 setAttributes 中调用 setProperties，避免与 LF 递归 */
export function syncTableLayoutToNode(
  model: {
    width: number
    height: number
    minWidth?: number
    minHeight?: number
    setProperties: (p: Record<string, unknown>) => void
  },
  data: DiagramTableData,
  measureOptions: TableLayoutMeasureOptions = {}
): void {
  if (applyTableLayoutToModel(model, data, measureOptions)) {
    syncNodeSizeProperties(model)
  }
}
