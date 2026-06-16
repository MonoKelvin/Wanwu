import type LogicFlow from '@logicflow/core'
import type { DiagramTableData } from '@modules/library/diagrams/extensions/table/kinds/tableTypes'
import { computeTableLayout, type TableLayoutResult } from '@modules/library/diagrams/extensions/table/kinds/tableLayout'
import { toTableCellMeasureStyle } from '@modules/library/diagrams/extensions/table/kinds/tableTextStyle'
import type { TableCellMarqueeRect } from '@modules/library/diagrams/extensions/table/interaction/tableCellSelection'

export type TableCellCoord = { row: number; col: number }

export function listTableCells(data: DiagramTableData): TableCellCoord[] {
  const cols = data.columns.length
  const cells: TableCellCoord[] = []
  if (data.showHeader !== false) {
    for (let c = 0; c < cols; c++) cells.push({ row: -1, col: c })
  }
  for (let r = 0; r < data.rows.length; r++) {
    for (let c = 0; c < cols; c++) cells.push({ row: r, col: c })
  }
  return cells
}

export function getDefaultTableActiveCell(data: DiagramTableData): TableCellCoord {
  if (data.showHeader !== false) return { row: -1, col: 0 }
  return { row: 0, col: 0 }
}

/** Tab / Shift+Tab 在单元格间移动 */
export function stepTableCell(
  data: DiagramTableData,
  row: number,
  col: number,
  dir: 'next' | 'prev'
): TableCellCoord {
  const cells = listTableCells(data)
  const index = cells.findIndex((c) => c.row === row && c.col === col)
  if (index < 0) return { row, col }
  const next = dir === 'next' ? index + 1 : index - 1
  if (next < 0 || next >= cells.length) return { row, col }
  return cells[next]!
}

/** draw.io 方向键在单元格网格内移动 */
export function stepTableCellArrow(
  data: DiagramTableData,
  row: number,
  col: number,
  dir: 'left' | 'right' | 'up' | 'down'
): TableCellCoord {
  const cols = data.columns.length
  const rows = data.rows.length
  const hasHeader = data.showHeader !== false

  if (dir === 'left') {
    return { row, col: Math.max(0, col - 1) }
  }
  if (dir === 'right') {
    return { row, col: Math.min(cols - 1, col + 1) }
  }
  if (dir === 'up') {
    if (row === -1) return { row: -1, col }
    if (row === 0) return hasHeader ? { row: -1, col } : { row: 0, col }
    return { row: row - 1, col }
  }
  if (row === -1) {
    return rows > 0 ? { row: 0, col } : { row: -1, col }
  }
  if (row < rows - 1) return { row: row + 1, col }
  return { row, col }
}

export function readTableCellValue(
  data: DiagramTableData,
  row: number,
  col: number
): string {
  if (row === -1) return data.columns[col] ?? ''
  return data.rows[row]?.[col] ?? ''
}

/** 根据布局区域计算多选/框选矩形（节点局部坐标） */
export function boundingRectForTableCells(
  layout: TableLayoutResult,
  cells: TableCellCoord[]
): TableCellMarqueeRect | null {
  if (cells.length === 0) return null
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const cell of cells) {
    const region = layout.regions.find((r) => r.row === cell.row && r.col === cell.col)
    if (!region) continue
    minX = Math.min(minX, region.x)
    minY = Math.min(minY, region.y)
    maxX = Math.max(maxX, region.x + region.width)
    maxY = Math.max(maxY, region.y + region.height)
  }
  if (!Number.isFinite(minX)) return null
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}

/** 指针位置命中单元格（画布坐标系下的节点局部点） */
export function hitTestTableCell(
  layout: TableLayoutResult,
  localX: number,
  localY: number
): TableCellCoord | null {
  for (const region of layout.regions) {
    if (
      localX >= region.x &&
      localX <= region.x + region.width &&
      localY >= region.y &&
      localY <= region.y + region.height
    ) {
      return { row: region.row, col: region.col }
    }
  }
  return null
}

export function getTableCellClientRect(
  lf: LogicFlow,
  nodeId: string,
  row: number,
  col: number,
  data: DiagramTableData
): DOMRect | null {
  const model = lf.getNodeModelById(nodeId)
  if (!model) return null
  const measureOptions = {
    cellStyle: toTableCellMeasureStyle(model, false),
    headerStyle: toTableCellMeasureStyle(model, true)
  }
  const layout = computeTableLayout(data, model.width, measureOptions, model.height)
  const region = layout.regions.find((r) => r.row === row && r.col === col)
  if (!region) return null

  const tm = lf.graphModel.transformModel
  const cellLeft = model.x - model.width / 2 + region.x
  const cellTop = model.y - model.height / 2 + region.y
  const pad = 1
  const [rx1, ry1] = tm.CanvasPointToHtmlPoint([cellLeft + pad, cellTop + pad])
  const [rx2, ry2] = tm.CanvasPointToHtmlPoint([
    cellLeft + region.width - pad,
    cellTop + region.height - pad
  ])
  // CanvasPointToHtmlPoint 返回相对于 lf.container 的坐标
  // textarea 用 fixed 定位，需要转换为 viewport 坐标
  const containerEl = lf.container as HTMLElement | undefined
  const containerRect = containerEl?.getBoundingClientRect?.() ?? { left: 0, top: 0 }
  const w = Math.max(1, rx2 - rx1)
  const h = Math.max(1, ry2 - ry1)
  return new DOMRect(rx1 + containerRect.left, ry1 + containerRect.top, w, h)
}
