import type LogicFlow from '@logicflow/core'
import {
  DG_SHAPE_RENDER_REV_KEY,
  refreshLayoutHandledShapeView
} from '@modules/library/diagrams/domain/shape-extension/diagramShapeBridge'
import {
  hideTableToolbarTooltip,
  invokeTableExternalPatchHandler,
  isTableDividerDragging,
  isTableNodeResizing
} from '@modules/library/diagrams/extensions/table/interaction/tableCanvasRuntime'
import { DG_SHAPE_PAYLOAD_KEY } from '@modules/library/diagrams/domain/shape-extension/types'
import type { DiagramNodeProperties } from '@modules/library/diagrams/lib/diagramSelectionTypes'
import type { TableCellCoord } from '@modules/library/diagrams/extensions/table/kinds/tableCellNav'
import { patchTableCellsTextStyle } from '@modules/library/diagrams/extensions/table/kinds/tableCellTextStyles'
import { resolveTableCellsTextStyleForProperty } from '@modules/library/diagrams/extensions/table/kinds/tableCellTextStyles'
import { buildTableModifyNodePatch } from '@modules/library/diagrams/extensions/table/interaction/tableCanvasMutation'
import { getDiagramEditorRuntime } from '@modules/library/diagrams/composables/useDiagramEditorRuntime'
import {
  materializeTableDimensions,
  type TableLayoutMeasureOptions
} from '@modules/library/diagrams/extensions/table/kinds/tableLayout'
import { DIAGRAM_TABLE_KIND, DIAGRAM_TABLE_LF_TYPE } from '@modules/library/diagrams/extensions/table/kinds/tableTypes'
import { tableCodec } from '@modules/library/diagrams/extensions/table/kinds/tableCodec'
import { readTableData } from '@modules/library/diagrams/extensions/table/render/tableRegs'
import { toTableCellMeasureStyle } from '@modules/library/diagrams/extensions/table/kinds/tableTextStyle'
import {
  getTableCellStyleMixedFields,
  getTableSelectedCells,
  setTableActiveCell,
  setTableCellStyleMixedFields,
  type TableActiveCell
} from '@modules/library/diagrams/extensions/table/interaction/tableCellSelection'

export function isDiagramTableNode(node: DiagramNodeProperties | null | undefined): boolean {
  return node?.shapeExtension?.kind === DIAGRAM_TABLE_KIND
}

function readTableMeasureOptions(model: {
  getTextStyle?: () => Record<string, unknown>
  properties?: Record<string, unknown>
}): TableLayoutMeasureOptions {
  return {
    cellStyle: toTableCellMeasureStyle(model as never, false),
    headerStyle: toTableCellMeasureStyle(model as never, true)
  }
}

let tableShapeStabilizing = false

/** 属性 patch 后：固化列宽行高、保持选中态可交互（不再触发 syncLayout 递归） */
export function stabilizeTableNodeAfterShapePatch(lf: LogicFlow, nodeId: string): void {
  if (tableShapeStabilizing) return
  const model = lf.getNodeModelById(nodeId)
  const data = model ? readTableData(model) : null
  if (!model || !data) return

  const measureOptions = readTableMeasureOptions(model)
  const materialized = materializeTableDimensions(
    data,
    model.width,
    measureOptions,
    model.height
  )
  const colSame =
    JSON.stringify(materialized.colWidths) === JSON.stringify(data.colWidths)
  const rowSame =
    JSON.stringify(materialized.rowHeights) === JSON.stringify(data.rowHeights)
  const headerSame = materialized.headerHeight === data.headerHeight

  if (!colSame || !rowSame || !headerSame) {
    tableShapeStabilizing = true
    try {
      const props = model.properties as Record<string, unknown>
      lf.setProperties(nodeId, {
        [DG_SHAPE_PAYLOAD_KEY]: tableCodec.toEnvelope(materialized),
        [DG_SHAPE_RENDER_REV_KEY]: Number(props[DG_SHAPE_RENDER_REV_KEY] ?? 0) + 1
      })
    } finally {
      tableShapeStabilizing = false
    }
  }

  if (model.draggable === false) {
    model.draggable = true
  }
}

export type TableExternalPropertyPatchOptions = {
  /** dgShape patch 已在同次 setProperties 中 bump 修订号时跳过额外刷新 */
  skipRenderRefresh?: boolean
}

/** 属性面板 / 样式 patch 后：清理交互残留、固化布局并强制刷新命中层 */
export function notifyTableExternalPropertyPatch(
  lf: LogicFlow,
  nodeId: string,
  options?: TableExternalPropertyPatchOptions
): void {
  const model = lf.getNodeModelById(nodeId)
  if (!model || String(model.type) !== DIAGRAM_TABLE_LF_TYPE) return
  // 分割线拖拽 / 节点缩放时每帧 patch dgShape，不得打断瞬时交互
  if (isTableDividerDragging() || isTableNodeResizing()) return

  hideTableToolbarTooltip()
  invokeTableExternalPatchHandler(nodeId)
  stabilizeTableNodeAfterShapePatch(lf, nodeId)
  if (!options?.skipRenderRefresh) {
    refreshLayoutHandledShapeView(lf, nodeId)
  }
}

/** 属性面板等外部入口：同步画布活动单元格并刷新表格操作层 */
export function focusTableCellOnCanvas(
  lf: LogicFlow | null | undefined,
  nodeId: string,
  cell: TableActiveCell
): void {
  setTableActiveCell(nodeId, cell)
  if (lf) stabilizeTableNodeAfterShapePatch(lf, nodeId)
}

/** 属性面板：用当前选中单元格的有效文字样式覆盖节点快照 */
export function augmentTableNodeForPropertyPanel(
  node: DiagramNodeProperties | null | undefined,
  lf: LogicFlow | null | undefined
): DiagramNodeProperties | null | undefined {
  if (!node || !lf || !isDiagramTableNode(node)) return node
  const cells = getTableSelectedCells(node.id)
  if (cells.length === 0) return node
  const model = lf.getNodeModelById(node.id)
  const data = model ? readTableData(model) : null
  if (!model || !data) return node
  const { textStyle, mixedFields } = resolveTableCellsTextStyleForProperty(model, data, cells)
  setTableCellStyleMixedFields(node.id, mixedFields)
  return { ...node, textStyle }
}

export function isTableCellTextFieldMixed(nodeId: string, field: string): boolean {
  return getTableCellStyleMixedFields(nodeId).includes(field)
}

export function patchTableCellTextStyleFromPanel(
  lf: LogicFlow,
  nodeId: string,
  cells: TableCellCoord[],
  patch: Record<string, unknown>
): void {
  const model = lf.getNodeModelById(nodeId)
  const data = model ? readTableData(model) : null
  if (!model || !data || cells.length === 0) return
  const next = patchTableCellsTextStyle(data, cells, patch)
  const nodePatch = buildTableModifyNodePatch(next)
  if (nodePatch) {
    getDiagramEditorRuntime().port?.modifyNodeWithUndo(nodeId, nodePatch)
  }
  const syncedModel = lf.getNodeModelById(nodeId)
  const synced = syncedModel ? readTableData(syncedModel) : next
  const { mixedFields } = resolveTableCellsTextStyleForProperty(model, synced ?? next, cells)
  setTableCellStyleMixedFields(nodeId, mixedFields)
}
