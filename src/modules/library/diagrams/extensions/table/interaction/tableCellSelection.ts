import { ref } from 'vue'
import type { TableCellCoord } from '@modules/library/diagrams/extensions/table/kinds/tableCellNav'

export type TableActiveCell = TableCellCoord

const selectionByNode = new Map<string, TableCellCoord[]>()
const anchorByNode = new Map<string, TableCellCoord>()
const editFocusByNode = new Map<string, TableCellCoord>()
const mixedFieldsByNode = new Map<string, string[]>()

/** 框选过程中的矩形（画布局部坐标，相对节点左上） */
export type TableCellMarqueeRect = { x: number; y: number; width: number; height: number }
let marqueeRect: TableCellMarqueeRect | null = null

export const tableActiveCellRevision = ref(0)

function bumpRevision(): void {
  tableActiveCellRevision.value += 1
}

function sameCell(a: TableCellCoord, b: TableCellCoord): boolean {
  return a.row === b.row && a.col === b.col
}

function cellKey(cell: TableCellCoord): string {
  return `${cell.row},${cell.col}`
}

export function setTableCellMarquee(rect: TableCellMarqueeRect | null): void {
  marqueeRect = rect
  bumpRevision()
}

export function getTableCellMarquee(): TableCellMarqueeRect | null {
  return marqueeRect
}

export function getTableSelectedCells(nodeId: string): TableCellCoord[] {
  return selectionByNode.get(nodeId) ?? []
}

export function getTableSelectionAnchor(nodeId: string): TableCellCoord | null {
  return anchorByNode.get(nodeId) ?? null
}

export function setTableCellSelection(
  nodeId: string,
  cells: TableCellCoord[],
  anchor?: TableCellCoord | null,
  options?: { force?: boolean }
): void {
  const normalized = dedupeCells(cells)
  const prev = selectionByNode.get(nodeId) ?? []
  const prevAnchor = anchorByNode.get(nodeId)
  const nextAnchor = anchor ?? prevAnchor ?? normalized[0] ?? null
  const sameCells =
    prev.length === normalized.length &&
    prev.every((c) => normalized.some((n) => sameCell(c, n)))
  const sameAnchor =
    !anchor ||
    (prevAnchor != null && nextAnchor != null && sameCell(anchor, prevAnchor))
  if (!options?.force && sameCells && sameAnchor) return

  if (normalized.length === 0) {
    selectionByNode.delete(nodeId)
    anchorByNode.delete(nodeId)
    editFocusByNode.delete(nodeId)
    mixedFieldsByNode.delete(nodeId)
  } else {
    selectionByNode.set(nodeId, normalized)
    if (nextAnchor) {
      anchorByNode.set(nodeId, nextAnchor)
      editFocusByNode.set(nodeId, nextAnchor)
    }
  }
  bumpRevision()
}

export function setTableActiveCell(nodeId: string, cell: TableCellCoord): void {
  setTableCellSelection(nodeId, [cell], cell)
}

export function clearTableActiveCell(nodeId: string): void {
  if (!selectionByNode.has(nodeId) && !anchorByNode.has(nodeId)) return
  selectionByNode.delete(nodeId)
  anchorByNode.delete(nodeId)
  editFocusByNode.delete(nodeId)
  mixedFieldsByNode.delete(nodeId)
  bumpRevision()
}

export function getTableActiveCell(nodeId: string): TableActiveCell | null {
  const cells = getTableSelectedCells(nodeId)
  if (cells.length === 0) return null
  const editFocus = editFocusByNode.get(nodeId)
  if (editFocus && cells.some((c) => sameCell(c, editFocus))) return editFocus
  const anchor = getTableSelectionAnchor(nodeId)
  if (anchor && cells.some((c) => sameCell(c, anchor))) return anchor
  return cells[0]!
}

export function isTableCellSelected(nodeId: string, row: number, col: number): boolean {
  return getTableSelectedCells(nodeId).some((c) => c.row === row && c.col === col)
}

export function clearAllTableActiveCells(): void {
  if (selectionByNode.size === 0 && !marqueeRect) return
  selectionByNode.clear()
  anchorByNode.clear()
  editFocusByNode.clear()
  mixedFieldsByNode.clear()
  marqueeRect = null
  bumpRevision()
}

export function setTableCellStyleMixedFields(nodeId: string, fields: string[]): void {
  mixedFieldsByNode.set(nodeId, fields)
}

export function getTableCellStyleMixedFields(nodeId: string): string[] {
  return mixedFieldsByNode.get(nodeId) ?? []
}

function dedupeCells(cells: TableCellCoord[]): TableCellCoord[] {
  const seen = new Set<string>()
  const out: TableCellCoord[] = []
  for (const cell of cells) {
    const key = cellKey(cell)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(cell)
  }
  return out
}

/** 矩形范围（含起止单元格）内的所有单元格 */
export function cellsInTableRect(
  data: { showHeader?: boolean; columns: string[]; rows: string[][] },
  a: TableCellCoord,
  b: TableCellCoord
): TableCellCoord[] {
  const minRow = Math.min(a.row, b.row)
  const maxRow = Math.max(a.row, b.row)
  const minCol = Math.min(a.col, b.col)
  const maxCol = Math.max(a.col, b.col)
  const cells: TableCellCoord[] = []
  const hasHeader = data.showHeader !== false
  for (let row = minRow; row <= maxRow; row++) {
    if (row === -1 && !hasHeader) continue
    if (row >= data.rows.length) continue
    for (let col = minCol; col <= maxCol; col++) {
      if (col < 0 || col >= data.columns.length) continue
      cells.push({ row, col })
    }
  }
  return dedupeCells(cells)
}

/** 增删行列后收敛活动单元格索引（插入点之后的索引顺延） */
export function syncActiveCellAfterStructureChange(
  active: TableActiveCell | null,
  change:
    | { type: 'insertCol'; at: number }
    | { type: 'deleteCol'; at: number }
    | { type: 'insertRow'; at: number }
    | { type: 'deleteRow'; at: number },
  nextData: { columns: string[]; rows: string[][]; showHeader?: boolean }
): TableActiveCell | null {
  if (!active) return null

  let { row, col } = active
  switch (change.type) {
    case 'insertCol':
      if (col >= change.at) col += 1
      break
    case 'deleteCol':
      if (col === change.at) col = Math.max(0, change.at - 1)
      else if (col > change.at) col -= 1
      break
    case 'insertRow':
      if (row >= 0 && row >= change.at) row += 1
      break
    case 'deleteRow':
      if (row === change.at) {
        row = Math.max(0, Math.min(change.at, nextData.rows.length - 1))
      } else if (row > change.at) {
        row -= 1
      }
      break
  }

  col = Math.max(0, Math.min(col, nextData.columns.length - 1))
  if (row >= nextData.rows.length) row = Math.max(0, nextData.rows.length - 1)
  if (row < -1) row = -1
  if (row === -1 && nextData.showHeader === false) {
    row = Math.max(0, nextData.rows.length - 1)
  }
  return { row, col }
}

/** 同步多选集合在结构变更后的索引 */
export function syncCellSelectionAfterStructureChange(
  cells: TableCellCoord[],
  change:
    | { type: 'insertCol'; at: number }
    | { type: 'deleteCol'; at: number }
    | { type: 'insertRow'; at: number }
    | { type: 'deleteRow'; at: number },
  nextData: { columns: string[]; rows: string[][]; showHeader?: boolean }
): TableCellCoord[] {
  return dedupeCells(
    cells
      .map((cell) => syncActiveCellAfterStructureChange(cell, change, nextData))
      .filter((c): c is TableCellCoord => c != null)
  )
}
