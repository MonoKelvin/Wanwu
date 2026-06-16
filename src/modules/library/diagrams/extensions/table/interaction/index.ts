/**
 * 表格画布交互模块 — 模块内聚，对外仅导出集成所需 API。
 * 注册入口：bindDiagramTableCanvasEvents（由 tableShapeExtension 引用）
 * 属性面板：tablePropertyBridge
 * 组合式：tableCellSelection
 */

export { bindDiagramTableCanvasEvents } from '@modules/library/diagrams/extensions/table/interaction/bindDiagramTableCanvasEvents'

export {
  focusTableCellOnCanvas,
  augmentTableNodeForPropertyPanel,
  isDiagramTableNode,
  isTableCellTextFieldMixed,
  patchTableCellTextStyleFromPanel
} from '@modules/library/diagrams/extensions/table/interaction/tablePropertyBridge'

export {
  type TableActiveCell,
  type TableCellMarqueeRect,
  tableActiveCellRevision,
  setTableCellMarquee,
  getTableCellMarquee,
  getTableSelectedCells,
  getTableSelectionAnchor,
  setTableCellSelection,
  setTableActiveCell,
  clearTableActiveCell,
  getTableActiveCell,
  isTableCellSelected,
  clearAllTableActiveCells,
  setTableCellStyleMixedFields,
  getTableCellStyleMixedFields,
  cellsInTableRect,
  syncActiveCellAfterStructureChange,
  syncCellSelectionAfterStructureChange
} from '@modules/library/diagrams/extensions/table/interaction/tableCellSelection'
