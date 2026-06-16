import {
  deleteTableColumn,
  deleteTableRow,
  insertTableColumn,
  insertTableRow,
  TABLE_MAX_COLS,
  TABLE_MAX_ROWS
} from '@modules/library/diagrams/extensions/table/kinds/tableCanvasOps'
import type { TableActiveCell } from '@modules/library/diagrams/extensions/table/interaction/tableCellSelection'
import { syncActiveCellAfterStructureChange } from '@modules/library/diagrams/extensions/table/interaction/tableCellSelection'
import type { DiagramTableData } from '@modules/library/diagrams/extensions/table/kinds/tableTypes'

export { TABLE_MAX_COLS, TABLE_MAX_ROWS }

export type TableToolbarCapabilities = {
  addColumn: boolean
  removeColumn: boolean
  addRow: boolean
  removeRow: boolean
}

export type TableToolbarMutationResult = {
  data: DiagramTableData
  active: TableActiveCell | null
  op:
    | { type: 'insertCol'; at: number }
    | { type: 'deleteCol'; at: number }
    | { type: 'insertRow'; at: number }
    | { type: 'deleteRow'; at: number }
    | null
}

/** 有活动单元格时以该列/行为锚点，否则以最后一列/行 */
export function resolveToolbarColIndex(
  data: DiagramTableData,
  active: TableActiveCell | null
): number {
  if (active) return Math.max(0, Math.min(active.col, data.columns.length - 1))
  return Math.max(0, data.columns.length - 1)
}

export function resolveToolbarRowIndex(
  data: DiagramTableData,
  active: TableActiveCell | null
): number {
  if (active && active.row >= 0) {
    return Math.max(0, Math.min(active.row, data.rows.length - 1))
  }
  return Math.max(0, data.rows.length - 1)
}

export function isToolbarHeaderActive(active: TableActiveCell | null): boolean {
  return active?.row === -1
}

export function getTableToolbarCapabilities(
  data: DiagramTableData,
  active: TableActiveCell | null
): TableToolbarCapabilities {
  return {
    addColumn: data.columns.length < TABLE_MAX_COLS,
    removeColumn: data.columns.length > 1,
    addRow: data.rows.length < TABLE_MAX_ROWS,
    removeRow: data.rows.length > 1 && !isToolbarHeaderActive(active)
  }
}

export function tableToolbarAddColumn(
  data: DiagramTableData,
  active: TableActiveCell | null
): TableToolbarMutationResult | null {
  if (data.columns.length >= TABLE_MAX_COLS) return null
  const ref = resolveToolbarColIndex(data, active)
  const insertAt = Math.min(ref + 1, data.columns.length)
  const next = insertTableColumn(data, ref, false)
  return {
    data: next,
    active: syncActiveCellAfterStructureChange(active, { type: 'insertCol', at: insertAt }, next),
    op: { type: 'insertCol', at: insertAt }
  }
}

export function tableToolbarRemoveColumn(
  data: DiagramTableData,
  active: TableActiveCell | null
): TableToolbarMutationResult | null {
  if (data.columns.length <= 1) return null
  const col = resolveToolbarColIndex(data, active)
  const next = deleteTableColumn(data, col)
  return {
    data: next,
    active: syncActiveCellAfterStructureChange(active, { type: 'deleteCol', at: col }, next),
    op: { type: 'deleteCol', at: col }
  }
}

/** 表头选中：在首行数据上方插入；数据行选中：在其下方插入 */
export function tableToolbarAddRow(
  data: DiagramTableData,
  active: TableActiveCell | null
): TableToolbarMutationResult | null {
  if (data.rows.length >= TABLE_MAX_ROWS) return null
  if (isToolbarHeaderActive(active)) {
    const next = insertTableRow(data, 0, true)
    return {
      data: next,
      active: syncActiveCellAfterStructureChange(active, { type: 'insertRow', at: 0 }, next),
      op: { type: 'insertRow', at: 0 }
    }
  }
  const ref = resolveToolbarRowIndex(data, active)
  const insertAt = Math.min(ref + 1, data.rows.length)
  const next = insertTableRow(data, ref, false)
  return {
    data: next,
    active: syncActiveCellAfterStructureChange(active, { type: 'insertRow', at: insertAt }, next),
    op: { type: 'insertRow', at: insertAt }
  }
}

export function tableToolbarRemoveRow(
  data: DiagramTableData,
  active: TableActiveCell | null
): TableToolbarMutationResult | null {
  if (data.rows.length <= 1 || isToolbarHeaderActive(active)) return null
  const row = resolveToolbarRowIndex(data, active)
  const next = deleteTableRow(data, row)
  return {
    data: next,
    active: syncActiveCellAfterStructureChange(active, { type: 'deleteRow', at: row }, next),
    op: { type: 'deleteRow', at: row }
  }
}
