/**
 * 表格外部位集成面 — 框架层（属性面板、扩展注册等）仅依赖此文件。
 * 领域算法与数据模型见 kinds/；画布交互见 interaction/；渲染见 render/。
 */

export {
  focusTableCellOnCanvas,
  augmentTableNodeForPropertyPanel,
  isDiagramTableNode,
  isTableCellTextFieldMixed,
  patchTableCellTextStyleFromPanel
} from '@modules/library/diagrams/extensions/table/interaction/tablePropertyBridge'

export {
  tableActiveCellRevision,
  getTableActiveCell,
  getTableSelectedCells,
  setTableActiveCell,
  clearTableActiveCell,
  type TableActiveCell
} from '@modules/library/diagrams/extensions/table/interaction/tableCellSelection'

export { bindDiagramTableCanvasEvents } from '@modules/library/diagrams/extensions/table/interaction/bindDiagramTableCanvasEvents'

export { registerTableShape, readTableData } from '@modules/library/diagrams/extensions/table/render/tableRegs'
