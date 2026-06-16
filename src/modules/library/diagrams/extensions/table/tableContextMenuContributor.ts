import type LogicFlow from '@logicflow/core'
import type { DiagramContextMenuContributionContext } from '@modules/library/diagrams/domain/shape-extension/canvasInteractionTypes'
import { buildShapeExtensionModifyNodePatch } from '@modules/library/diagrams/domain/shape-extension/diagramShapeBridge'
import {
  getTableActiveCell,
  setTableActiveCell,
  syncActiveCellAfterStructureChange
} from '@modules/library/diagrams/extensions/table/interaction/tableCellSelection'
import { readTableData } from '@modules/library/diagrams/extensions/table/render'
import {
  deleteTableColumn,
  deleteTableRow,
  insertTableColumn,
  insertTableRow,
  TABLE_MAX_COLS,
  TABLE_MAX_ROWS
} from '@modules/library/diagrams/extensions/table/kinds/tableCanvasOps'
import { normalizeTableData } from '@modules/library/diagrams/extensions/table/kinds/tableLayout'
import {
  isToolbarHeaderActive,
  resolveToolbarColIndex,
  resolveToolbarRowIndex
} from '@modules/library/diagrams/extensions/table/kinds/tableToolbarOps'
import { DIAGRAM_TABLE_KIND, DIAGRAM_TABLE_LF_TYPE, type DiagramTableData } from '@modules/library/diagrams/extensions/table/kinds/tableTypes'

type TableCellHit = { row: number; col: number }

function readTableFromNode(lf: LogicFlow, nodeId: string): DiagramTableData | null {
  const model = lf.getNodeModelById(nodeId)
  if (!model || String(model.type) !== DIAGRAM_TABLE_LF_TYPE) return null
  return readTableData(model)
}

function parseCellHit(event?: MouseEvent): TableCellHit | null {
  const target = event?.target
  if (!(target instanceof Element)) return null
  const hit = target.closest('.dg-table-cell-hit')
  if (!hit) return null
  const row = Number(hit.getAttribute('data-row'))
  const col = Number(hit.getAttribute('data-col'))
  if (!Number.isFinite(row) || !Number.isFinite(col)) return null
  return { row, col }
}

function patchTable(
  ctx: DiagramContextMenuContributionContext,
  nodeId: string,
  data: DiagramTableData,
  active = getTableActiveCell(nodeId)
) {
  const patch = buildShapeExtensionModifyNodePatch(DIAGRAM_TABLE_KIND, normalizeTableData(data))
  if (patch) ctx.modifyNode(nodeId, patch)
  if (active) setTableActiveCell(nodeId, active)
}

export function tableContextMenuContributor(ctx: DiagramContextMenuContributionContext) {
  if (ctx.nodeIds.length !== 1) return []
  const lf = ctx.getLf()
  if (!lf) return []
  const nodeId = ctx.nodeIds[0]!
  const data = readTableFromNode(lf, nodeId)
  if (!data) return []

  const cellFromEvent = parseCellHit(ctx.event)
  const active = cellFromEvent ?? getTableActiveCell(nodeId)
  const col = resolveToolbarColIndex(data, active)
  const row = resolveToolbarRowIndex(data, active)
  const onHeader = isToolbarHeaderActive(cellFromEvent ?? active)

  return [
    {
      label: '在左侧插入列',
      wwIcon: 'columns-2',
      disabled: data.columns.length >= TABLE_MAX_COLS,
      command: () => {
        const insertAt = Math.max(0, Math.min(col, data.columns.length))
        const next = insertTableColumn(data, col, true)
        patchTable(
          ctx,
          nodeId,
          next,
          syncActiveCellAfterStructureChange(active, { type: 'insertCol', at: insertAt }, next)
        )
      }
    },
    {
      label: '在右侧插入列',
      wwIcon: 'columns-2',
      disabled: data.columns.length >= TABLE_MAX_COLS,
      command: () => {
        const insertAt = Math.min(col + 1, data.columns.length)
        const next = insertTableColumn(data, col, false)
        patchTable(
          ctx,
          nodeId,
          next,
          syncActiveCellAfterStructureChange(active, { type: 'insertCol', at: insertAt }, next)
        )
      }
    },
    {
      label: '在上方插入行',
      wwIcon: 'rows',
      disabled: data.rows.length >= TABLE_MAX_ROWS || onHeader,
      command: () => {
        const insertAt = Math.max(0, Math.min(row, data.rows.length))
        const next = insertTableRow(data, row, true)
        patchTable(
          ctx,
          nodeId,
          next,
          syncActiveCellAfterStructureChange(active, { type: 'insertRow', at: insertAt }, next)
        )
      }
    },
    {
      label: '在下方插入行',
      wwIcon: 'rows',
      disabled: data.rows.length >= TABLE_MAX_ROWS,
      command: () => {
        const insertAt = onHeader
          ? 0
          : Math.min(row + 1, data.rows.length)
        const next = onHeader ? insertTableRow(data, 0, true) : insertTableRow(data, row, false)
        patchTable(
          ctx,
          nodeId,
          next,
          syncActiveCellAfterStructureChange(active, { type: 'insertRow', at: insertAt }, next)
        )
      }
    },
    { separator: true },
    {
      label: cellFromEvent ? '删除此列' : '删除选中列',
      wwIcon: 'minus',
      disabled: data.columns.length <= 1,
      command: () => {
        const next = deleteTableColumn(data, col)
        patchTable(
          ctx,
          nodeId,
          next,
          syncActiveCellAfterStructureChange(active, { type: 'deleteCol', at: col }, next)
        )
      }
    },
    {
      label: cellFromEvent && cellFromEvent.row >= 0 ? '删除此行' : '删除选中行',
      wwIcon: 'minus',
      disabled: data.rows.length <= 1 || onHeader,
      command: () => {
        const next = deleteTableRow(data, row)
        patchTable(
          ctx,
          nodeId,
          next,
          syncActiveCellAfterStructureChange(active, { type: 'deleteRow', at: row }, next)
        )
      }
    }
  ]
}
