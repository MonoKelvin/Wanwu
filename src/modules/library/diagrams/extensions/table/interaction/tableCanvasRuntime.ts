/**
 * 表格画布瞬时状态与 View→Binder 回调桥。
 * 仅供 table 模块内部（render 层触发、bindDiagramTableCanvasEvents 注册处理）。
 */
import { reactive } from 'vue'

// —— 分割线拖拽 ——

let dividerDragging = false
let activeDivider: { kind: 'col' | 'row'; index: number } | null = null

export type TableDividerPointerContext = {
  kind: 'col' | 'row'
  index: number
  nodeId: string
}

type TableDividerPointerDownHandler = (
  event: PointerEvent,
  context: TableDividerPointerContext
) => void

let dividerPointerDownHandler: TableDividerPointerDownHandler | null = null

export function setTableDividerPointerDownHandler(
  handler: TableDividerPointerDownHandler | null
): void {
  dividerPointerDownHandler = handler
}

export function invokeTableDividerPointerDown(
  event: PointerEvent,
  context: TableDividerPointerContext
): void {
  dividerPointerDownHandler?.(event, context)
}

// —— 单元格 / 移动 / 工具条（View 层 onPointerDown 回调） ——

export type TableCellPointerContext = {
  nodeId: string
  row: number
  col: number
}

type TableCellPointerDownHandler = (
  event: PointerEvent,
  context: TableCellPointerContext
) => void
type TableCellDblClickHandler = (event: MouseEvent, context: TableCellPointerContext) => void
type TableMovePointerDownHandler = (event: PointerEvent, nodeId: string) => void
type TableToolbarPointerDownHandler = (
  event: PointerEvent,
  context: { nodeId: string; action: 'addCol' | 'addRow' | 'removeCol' | 'removeRow' }
) => void

let cellPointerDownHandler: TableCellPointerDownHandler | null = null
let cellDblClickHandler: TableCellDblClickHandler | null = null
let movePointerDownHandler: TableMovePointerDownHandler | null = null
let toolbarPointerDownHandler: TableToolbarPointerDownHandler | null = null
let lastPointerCell: TableCellPointerContext | null = null

export function setTableCellPointerDownHandler(handler: TableCellPointerDownHandler | null): void {
  cellPointerDownHandler = handler
}

export function setTableCellDblClickHandler(handler: TableCellDblClickHandler | null): void {
  cellDblClickHandler = handler
}

export function setTableMovePointerDownHandler(handler: TableMovePointerDownHandler | null): void {
  movePointerDownHandler = handler
}

export function setTableToolbarPointerDownHandler(handler: TableToolbarPointerDownHandler | null): void {
  toolbarPointerDownHandler = handler
}

export function invokeTableCellPointerDown(
  event: PointerEvent,
  context: TableCellPointerContext
): void {
  lastPointerCell = context
  cellPointerDownHandler?.(event, context)
}

export function invokeTableCellDblClick(event: MouseEvent, context: TableCellPointerContext): void {
  lastPointerCell = context
  cellDblClickHandler?.(event, context)
}

export function invokeTableMovePointerDown(event: PointerEvent, nodeId: string): void {
  movePointerDownHandler?.(event, nodeId)
}

export function invokeTableToolbarPointerDown(
  event: PointerEvent,
  context: { nodeId: string; action: 'addCol' | 'addRow' | 'removeCol' | 'removeRow' }
): void {
  toolbarPointerDownHandler?.(event, context)
}

export function getLastPointerCell(): TableCellPointerContext | null {
  return lastPointerCell
}

export function rememberTablePointerCell(context: TableCellPointerContext): void {
  lastPointerCell = context
}

// —— 属性面板等外部 patch 后清理瞬时交互 ——

type TableExternalPatchHandler = (nodeId: string) => void

let externalPatchHandler: TableExternalPatchHandler | null = null

export function setTableExternalPatchHandler(handler: TableExternalPatchHandler | null): void {
  externalPatchHandler = handler
}

export function invokeTableExternalPatchHandler(nodeId: string): void {
  externalPatchHandler?.(nodeId)
}

export function setTableDividerDragging(value: boolean): void {
  dividerDragging = value
  if (!value) activeDivider = null
}

export function isTableDividerDragging(): boolean {
  return dividerDragging
}

export function setTableActiveDivider(
  divider: { kind: 'col' | 'row'; index: number } | null
): void {
  activeDivider = divider
}

export function getTableActiveDivider(): { kind: 'col' | 'row'; index: number } | null {
  return activeDivider
}

let nodeResizing = false

export function setTableNodeResizing(value: boolean): void {
  nodeResizing = value
}

export function isTableNodeResizing(): boolean {
  return nodeResizing
}

export function shouldHideTableToolbar(): boolean {
  return dividerDragging || nodeResizing
}

// —— 表格移动控件 ——

export type TableMoveDirection = 'up' | 'down' | 'left' | 'right'

export type TableMoveAction =
  | { kind: 'nudge'; dir: TableMoveDirection; nodeId: string }
  | { kind: 'drag'; nodeId: string }

type TableMoveHandler = (event: PointerEvent, action: TableMoveAction) => void

let moveHandler: TableMoveHandler | null = null

export function setTableMoveHandler(handler: TableMoveHandler | null): void {
  moveHandler = handler
}

export function invokeTableMoveAction(event: PointerEvent, action: TableMoveAction): void {
  moveHandler?.(event, action)
}

// —— 工具条 Tooltip ——

export const TABLE_TOOL_BTN_SELECTOR =
  '.dg-table-add-col, .dg-table-remove-col, .dg-table-add-row, .dg-table-remove-row'

export const TABLE_TOOLTIP_TARGET_SELECTOR = TABLE_TOOL_BTN_SELECTOR

export const TABLE_TOOLBAR_TOOLTIP_ATTR = 'data-dg-table-tooltip'

export type TableToolbarTooltipState = {
  visible: boolean
  text: string
  left: number
  top: number
  width: number
  height: number
}

export const tableToolbarTooltipState = reactive<TableToolbarTooltipState>({
  visible: false,
  text: '',
  left: 0,
  top: 0,
  width: 1,
  height: 1
})

export function showTableToolbarTooltip(target: Element, text: string): void {
  const hit = target.closest('.dg-table-tool-hit') ?? target
  const rect = hit.getBoundingClientRect()
  tableToolbarTooltipState.text = text
  tableToolbarTooltipState.left = rect.left
  tableToolbarTooltipState.top = rect.top
  tableToolbarTooltipState.width = Math.max(rect.width, 1)
  tableToolbarTooltipState.height = Math.max(rect.height, 1)
  tableToolbarTooltipState.visible = true
}

export function hideTableToolbarTooltip(): void {
  tableToolbarTooltipState.visible = false
  tableToolbarTooltipState.text = ''
}

export function resolveTableToolbarTooltipTarget(target: EventTarget | null): Element | null {
  if (!(target instanceof Element)) return null
  return target.closest(TABLE_TOOLTIP_TARGET_SELECTOR)
}

export function readTableToolbarTooltipText(target: Element): string | null {
  const host = target.closest(`[${TABLE_TOOLBAR_TOOLTIP_ATTR}]`)
  const text = host?.getAttribute(TABLE_TOOLBAR_TOOLTIP_ATTR)
  return text?.trim() ? text : null
}
