import type LogicFlow from '@logicflow/core'
import {
  applyNodeShapeExtension,
  refreshLayoutHandledShapeView
} from '@modules/library/diagrams/domain/shape-extension/diagramShapeBridge'
import type { DiagramShapeCanvasInteractionPorts } from '@modules/library/diagrams/domain/shape-extension/canvasInteractionTypes'
import { pickDiagramElementAtClient } from '@modules/library/diagrams/lib/diagramCanvasHitTest'
import { registerDiagramKeyboardInterceptor } from '@modules/library/diagrams/lib/diagramKeyboardInterceptors'
import {
  onDiagramResizeSessionEnd,
  onDiagramResizeSessionStart
} from '@modules/library/diagrams/lib/diagramResizeSession'
import {
  clearAllTableActiveCells,
  clearTableActiveCell,
  cellsInTableRect,
  getLastActiveTableNodeId,
  getTableActiveCell,
  getTableSelectedCells,
  setTableCellMarquee,
  setTableCellSelection,
  type TableActiveCell
} from '@modules/library/diagrams/extensions/table/interaction/tableCellSelection'
import { computeTableLayout, syncTableLayoutToNode } from '@modules/library/diagrams/extensions/table/kinds/tableLayout'
import {
  getDefaultTableActiveCell,
  getTableCellClientRect,
  readTableCellValue,
  stepTableCell,
  stepTableCellArrow,
  boundingRectForTableCells,
  hitTestTableCell
} from '@modules/library/diagrams/extensions/table/kinds/tableCellNav'
import {
  patchTableCell,
  resizeTableColumnDivider,
  resizeTableRowDivider
} from '@modules/library/diagrams/extensions/table/kinds/tableCanvasOps'
import {
  normalizeTableData,
  snapshotTableDataForDrag
} from '@modules/library/diagrams/extensions/table/kinds/tableLayout'
import { readTableData } from '@modules/library/diagrams/extensions/table/render/tableRegs'
import { readTableCellTextStyle, toTableCellMeasureStyle } from '@modules/library/diagrams/extensions/table/kinds/tableTextStyle'
import {
  tableToolbarAddColumn,
  tableToolbarAddRow,
  tableToolbarRemoveColumn,
  tableToolbarRemoveRow
} from '@modules/library/diagrams/extensions/table/kinds/tableToolbarOps'
import { DIAGRAM_TABLE_KIND, DIAGRAM_TABLE_LF_TYPE, type DiagramTableData } from '@modules/library/diagrams/extensions/table/kinds/tableTypes'
import {
  getLastPointerCell,
  hideTableToolbarTooltip,
  rememberTablePointerCell,
  readTableToolbarTooltipText,
  resolveTableToolbarTooltipTarget,
  setTableActiveDivider,
  setTableDividerDragging,
  setTableNodeResizing,
  setTableExternalPatchHandler,
  shouldHideTableToolbar,
  showTableToolbarTooltip,
  TABLE_TOOLTIP_TARGET_SELECTOR,
  type TableCellPointerContext,
  type TableDividerPointerContext
} from '@modules/library/diagrams/extensions/table/interaction/tableCanvasRuntime'
import {
  disposeTableToolbarTooltipHost,
  ensureTableToolbarTooltipHost
} from '@modules/library/diagrams/extensions/table/interaction/tableToolbarTooltipMount'
import { buildTableModifyNodePatch } from '@modules/library/diagrams/extensions/table/interaction/tableCanvasMutation'

type DividerDrag = {
  kind: 'col' | 'row'
  nodeId: string
  index: number
  startClientX: number
  startClientY: number
  snapshot: DiagramTableData
  restoreDraggable?: boolean
  pointerId: number
  captureEl: Element
}

type CellEdit = {
  nodeId: string
  row: number
  col: number
  textarea: HTMLTextAreaElement
}

type CellMarqueeDrag = {
  nodeId: string
  anchor: TableActiveCell
  startClientX: number
  startClientY: number
  pointerId: number
  captureEl: Element
  marqueeActive: boolean
}

type NodeMoveDrag = {
  nodeId: string
  pointerId: number
  captureEl: Element
  startClientX: number
  startClientY: number
  startX: number
  startY: number
}

const MARQUEE_THRESHOLD_PX = 4

const ARROW_DIRS: Record<string, 'left' | 'right' | 'up' | 'down'> = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down'
}

function isTableNode(lf: LogicFlow, nodeId: string): boolean {
  return String(lf.getNodeModelById(nodeId)?.type ?? '') === DIAGRAM_TABLE_LF_TYPE
}

function isEditableTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  if (!el) return false
  const tag = el.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (el.isContentEditable) return true
  return Boolean(el.closest('[contenteditable="true"]'))
}

function patchTable(lf: LogicFlow, nodeId: string, data: DiagramTableData): void {
  applyNodeShapeExtension(lf, nodeId, DIAGRAM_TABLE_KIND, data)
}

function isCellEditorTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null
  return Boolean(el?.classList?.contains('dg-table-cell-editor'))
}

function parseHitRow(value: string | null): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function parseHitCol(value: string | null): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function parseCellFromHit(hit: Element): TableActiveCell {
  return {
    row: parseHitRow(hit.getAttribute('data-row')),
    col: parseHitCol(hit.getAttribute('data-col'))
  }
}

function getSingleSelectedTableId(lf: LogicFlow): string | null {
  const nodes = lf.getSelectElements(true).nodes
  if (nodes.length === 1) {
    const id = nodes[0]!.id
    if (isTableNode(lf, id)) return id
  }
  const lastActive = getLastActiveTableNodeId()
  if (!lastActive) return null
  const model = lf.getNodeModelById(lastActive)
  return model && isTableNode(lf, lastActive) ? lastActive : null
}

/** 表格画布交互：单元格编辑、分割线拖拽、快捷增删行列（参考 draw.io Graph.js） */
export function bindDiagramTableCanvasEvents(ports: DiagramShapeCanvasInteractionPorts): () => void {
  if (!ports.getContainer()) return () => {}

  ensureTableToolbarTooltipHost()

  const lf = ports.getLf()
  let dividerDrag: DividerDrag | null = null
  let cellEdit: CellEdit | null = null
  let closingCellEditor = false
  let openingCellEditor = false
  let suppressCellEditorBlur = false
  let cellMarquee: CellMarqueeDrag | null = null
  let nodeMoveDrag: NodeMoveDrag | null = null
  let dividerRafId = 0
  let pendingDividerEvent: PointerEvent | null = null
  let editorSyncRafId = 0

  function getCanvasInteractionRoot(): HTMLElement | null {
    const lfEl = (lf as { container?: HTMLElement }).container
    if (lfEl?.isConnected) return lfEl
    const fromPorts = ports.getContainer()
    if (fromPorts?.isConnected) return fromPorts
    return document.querySelector('.dg-canvas-frame') as HTMLElement | null
  }

  function isTablePointerTarget(event: PointerEvent): boolean {
    for (const el of document.elementsFromPoint(event.clientX, event.clientY)) {
      if (!(el instanceof Element)) continue
      if (
        el.closest(
          '.dg-table-shape, .dg-table-cell-hit, .dg-table-col-divider, .dg-table-row-divider, .dg-table-edge-hit, .dg-table-tool-hit, .dg-table-move-handle-hit, .dg-table-move-handle__hit'
        )
      ) {
        return true
      }
    }
    return false
  }

  function getActiveContainer(): HTMLElement | null {
    return getCanvasInteractionRoot()
  }

  function isPointerInsideCanvas(event: PointerEvent): boolean {
    const root = getCanvasInteractionRoot()
    const target = event.target
    if (root && target instanceof Node && root.contains(target)) return true
    const frame = document.querySelector('.dg-canvas-frame')
    if (frame && target instanceof Node && frame.contains(target)) return true
    return isTablePointerTarget(event)
  }

  /** 叠层命中：避免选中态交互层挡住移动柄/工具条/分割线 */
  function findHitInStack(event: PointerEvent, selector: string): Element | null {
    const roots = [
      getCanvasInteractionRoot(),
      document.querySelector('.dg-canvas-frame')
    ].filter(Boolean) as HTMLElement[]
    if (roots.length === 0) return null
    for (const el of document.elementsFromPoint(event.clientX, event.clientY)) {
      if (!(el instanceof Element)) continue
      if (!roots.some((root) => root.contains(el))) continue
      const hit = el.closest(selector)
      if (hit) return hit
    }
    return null
  }

  function getTableLayoutContext(nodeId: string) {
    const model = lf.getNodeModelById(nodeId)
    const data = model ? readTableData(model) : null
    if (!model || !data) return null
    const measureOptions = {
      cellStyle: toTableCellMeasureStyle(model, false),
      headerStyle: toTableCellMeasureStyle(model, true)
    }
    const layout = computeTableLayout(data, model.width, measureOptions, model.height)
    return { model, data, layout, measureOptions }
  }

  function resolveCellAtClient(nodeId: string, clientX: number, clientY: number): TableActiveCell | null {
    const ctx = getTableLayoutContext(nodeId)
    if (!ctx) return null
    const point = lf.getPointByClient({ x: clientX, y: clientY })
    const canvas = point.canvasOverlayPosition
    const localX = canvas.x - (ctx.model.x - ctx.model.width / 2)
    const localY = canvas.y - (ctx.model.y - ctx.model.height / 2)
    return hitTestTableCell(ctx.layout, localX, localY)
  }

  function toggleCellInSelection(nodeId: string, cell: TableActiveCell) {
    const current = getTableSelectedCells(nodeId)
    const exists = current.some((c) => c.row === cell.row && c.col === cell.col)
    if (exists) {
      const next = current.filter((c) => c.row !== cell.row || c.col !== cell.col)
      if (next.length === 0) {
        setTableCellSelection(nodeId, [cell], cell)
      } else {
        setTableCellSelection(nodeId, next, next[0]!)
      }
    } else {
      setTableCellSelection(nodeId, [...current, cell], current[0] ?? cell)
    }
  }

  function updateMarqueeSelection(nodeId: string, anchor: TableActiveCell, current: TableActiveCell) {
    const ctx = getTableLayoutContext(nodeId)
    if (!ctx) return
    const cells = cellsInTableRect(ctx.data, anchor, current)
    setTableCellSelection(nodeId, cells, anchor)
    const rect = boundingRectForTableCells(ctx.layout, cells)
    setTableCellMarquee(nodeId, rect)
    bumpTableView(nodeId)
  }

  function endCellMarqueeDrag() {
    if (!cellMarquee) return
    try {
      cellMarquee.captureEl.releasePointerCapture(cellMarquee.pointerId)
    } catch {
      /* ignore */
    }
    setTableCellMarquee(cellMarquee.nodeId, null)
    cellMarquee = null
  }

  function clearTableMarquee(nodeId: string): void {
    setTableCellMarquee(nodeId, null)
  }

  function stopCellEditorSync(): void {
    if (editorSyncRafId !== 0) {
      cancelAnimationFrame(editorSyncRafId)
      editorSyncRafId = 0
    }
  }

  function syncCellEditorPosition(): void {
    if (!cellEdit) {
      stopCellEditorSync()
      return
    }
    const { nodeId, row, col, textarea } = cellEdit
    const rect = resolveEditorClientRect(nodeId, row, col)
    if (rect) {
      textarea.style.left = `${rect.left}px`
      textarea.style.top = `${rect.top}px`
      textarea.style.width = `${Math.max(rect.width, 48)}px`
      const minH = Math.max(rect.height, 24)
      if (parseFloat(textarea.style.height) < minH) {
        textarea.style.height = `${minH}px`
      }
    }
    editorSyncRafId = requestAnimationFrame(syncCellEditorPosition)
  }

  function startCellEditorSync(): void {
    stopCellEditorSync()
    editorSyncRafId = requestAnimationFrame(syncCellEditorPosition)
  }

  function endNodeMoveDrag(commit: boolean) {
    if (!nodeMoveDrag) return
    try {
      nodeMoveDrag.captureEl.releasePointerCapture(nodeMoveDrag.pointerId)
    } catch {
      /* ignore */
    }
    if (commit) ports.commitDragUndoMutation()
    else ports.clearDragUndoBaseline()
    nodeMoveDrag = null
    ports.scheduleGraphChange()
  }

  function bumpTableView(nodeId: string): void {
    refreshLayoutHandledShapeView(lf, nodeId)
  }

  function commitTableDataChange(nodeId: string, data: DiagramTableData): void {
    const patch = buildTableModifyNodePatch(data)
    if (patch) ports.modifyNode(nodeId, patch)
  }

  function dismissCellEditorForPointer(event: PointerEvent): void {
    if (!cellEdit) return
    if (isCellEditorTarget(event.target)) return
    closeCellEditor(true)
  }

  function resolveTableCellHitFromStack(
    event: PointerEvent
  ): { nodeId: string; cell: TableActiveCell; hitEl: Element } | null {
    const cellHit =
      findHitInStack(event, '.dg-table-cell-hit') ??
      (event.target as Element).closest('.dg-table-cell-hit')
    if (!cellHit) return null
    const nodeId = resolveTableNodeId(cellHit, event)
    if (!nodeId) return null
    return { nodeId, cell: parseCellFromHit(cellHit), hitEl: cellHit }
  }

  function restoreTableNodeInteraction(nodeId: string): void {
    const model = lf.getNodeModelById(nodeId)
    if (model && model.draggable === false) {
      model.draggable = true
    }
    setTableDividerDragging(false)
    setTableActiveDivider(null)
    setTableNodeResizing(false)
    bumpTableView(nodeId)
  }

  function focusCanvasForKeyboard(): void {
    const wrap = getActiveContainer()?.closest('.dg-canvas-wrap') as HTMLElement | null
    wrap?.focus({ preventScroll: true })
  }

  function activateTableNode(nodeId: string, event?: PointerEvent) {
    ports.selectNodeForPropertyPanel(nodeId, event)
    const model = lf.getNodeModelById(nodeId)
    const data = model ? readTableData(model) : null
    if (data && !getTableActiveCell(nodeId)) {
      const initial = getDefaultTableActiveCell(data)
      setTableCellSelection(nodeId, [initial], initial, { force: true })
      bumpTableView(nodeId)
    }
    syncTableNodesFromGraph()
  }

  function selectTableCell(
    nodeId: string,
    cell: TableActiveCell,
    event?: PointerEvent,
    options?: { force?: boolean }
  ) {
    setTableCellSelection(nodeId, [cell], cell, options)
    clearTableMarquee(nodeId)
    ports.selectNodeForPropertyPanel(nodeId, event)
    syncTableNodesFromGraph()
    bumpTableView(nodeId)
    syncTableSelectionToPanel()
    focusCanvasForKeyboard()
  }

  function syncTableSelectionToPanel() {
    ports.notifyUserSelectionChange()
  }

  function focusCell(nodeId: string, cell: TableActiveCell) {
    setTableCellSelection(nodeId, [cell], cell)
    clearTableMarquee(nodeId)
    bumpTableView(nodeId)
    syncTableSelectionToPanel()
    focusCanvasForKeyboard()
    ports.scheduleGraphChange()
  }

  /** 打开编辑器前仅同步选区，避免 bump 重绘导致命中元素失效、定位错位 */
  function prepareCellForEdit(nodeId: string, cell: TableActiveCell) {
    setTableCellSelection(nodeId, [cell], cell)
    clearTableMarquee(nodeId)
    syncTableSelectionToPanel()
  }

  function resolveActiveCell(nodeId: string, data: DiagramTableData): TableActiveCell {
    return getTableActiveCell(nodeId) ?? getDefaultTableActiveCell(data)
  }

  function closeCellEditor(commit: boolean) {
    if (!cellEdit) return
    if (closingCellEditor) return
    closingCellEditor = true
    // 关闭期间暂时清空 cellEdit，避免 patchTable 触发 externalPatchHandler 递归
    const edit = cellEdit
    cellEdit = null
    try {
      const { nodeId, row, col, textarea } = edit
      if (commit) {
        const model = lf.getNodeModelById(nodeId)!
        const data = readTableData(model)
        if (data) {
          const next = patchTableCell(
            data,
            row,
            col,
            textarea.value,
            toTableCellMeasureStyle(model, row === -1),
            model.width,
            model.height
          )
          commitTableDataChange(nodeId, next)
        }
      }
      textarea.remove()
      stopCellEditorSync()
      focusCanvasForKeyboard()
      ports.scheduleGraphChange()
    } finally {
      closingCellEditor = false
    }
  }

  function resolveEditorClientRect(
    nodeId: string,
    row: number,
    col: number
  ): DOMRect | null {
    const model = lf.getNodeModelById(nodeId)
    const data = model ? readTableData(model) : null
    if (!model || !data) return null
    return getTableCellClientRect(lf, nodeId, row, col, data)
  }

  function openCellEditor(
    nodeId: string,
    row: number,
    col: number,
    options?: { initialChar?: string; replaceContent?: boolean }
  ) {
    if (closingCellEditor) return
    if (openingCellEditor) return
    // suppress blur 在整个 open 流程中保持 true，直到 textarea 真正 focus 后才释放
    suppressCellEditorBlur = true
    // 同步标记“正在打开”，使打开窗口期内的后续按键不会重复触发 open（避免孤儿 textarea）
    openingCellEditor = true
    closeCellEditor(true)
    const model = lf.getNodeModelById(nodeId)
    if (!model) {
      suppressCellEditorBlur = false
      openingCellEditor = false
      return
    }

    prepareCellForEdit(nodeId, { row, col })
    const initialChar = options?.initialChar

    const mountEditor = (attempt = 0) => {
      const freshModel = lf.getNodeModelById(nodeId)
      const freshData = freshModel ? readTableData(freshModel) : null
      if (!freshModel || !freshData) {
        suppressCellEditorBlur = false
        openingCellEditor = false
        return
      }

      const activeAtMount = getTableActiveCell(nodeId)
      const mountRow = activeAtMount?.row ?? row
      const mountCol = activeAtMount?.col ?? col
      const rect = resolveEditorClientRect(nodeId, mountRow, mountCol)
      if (!rect) {
        if (attempt < 4) {
          requestAnimationFrame(() => mountEditor(attempt + 1))
        } else {
          suppressCellEditorBlur = false
          openingCellEditor = false
        }
        return
      }

      const value =
        initialChar != null && options?.replaceContent !== false
          ? initialChar
          : readTableCellValue(freshData, mountRow, mountCol)
      const cellStyle = readTableCellTextStyle(freshModel, mountRow === -1)
      const textarea = document.createElement('textarea')
      textarea.className = 'dg-table-cell-editor ww-scroll-main'
      textarea.value = value
      textarea.style.position = 'fixed'
      textarea.style.left = `${rect.left}px`
      textarea.style.top = `${rect.top}px`
      textarea.style.width = `${Math.max(rect.width, 48)}px`
      textarea.style.height = `${Math.max(rect.height, 24)}px`
      textarea.style.zIndex = '10000'
      textarea.style.fontSize = `${cellStyle.fontSize}px`
      textarea.style.fontWeight = String(cellStyle.fontWeight)
      textarea.style.fontStyle = cellStyle.fontStyle
      textarea.style.textDecoration = cellStyle.textDecoration
      textarea.style.color = cellStyle.fill
      if (cellStyle.fontFamily) textarea.style.fontFamily = cellStyle.fontFamily
      textarea.style.lineHeight = '1.35'
      textarea.style.padding = '4px 8px'
      textarea.style.border = '1px solid var(--ww-accent)'
      textarea.style.borderRadius = 'var(--ww-radius-sm, 4px)'
      textarea.style.background = 'var(--ww-elevated)'
      textarea.style.resize = 'none'
      textarea.style.outline = 'none'
      textarea.style.boxSizing = 'border-box'
      textarea.style.whiteSpace = 'pre-wrap'
      textarea.style.wordBreak = 'break-word'
      textarea.style.overflowWrap = 'break-word'
      textarea.style.overflow = 'hidden'
      textarea.style.textAlign =
        cellStyle.textAnchor === 'start' ? 'left' : cellStyle.textAnchor === 'end' ? 'right' : 'center'

      const syncEditorSize = () => {
        textarea.style.height = 'auto'
        textarea.style.height = `${Math.max(rect.height, textarea.scrollHeight)}px`
      }
      syncEditorSize()
      textarea.addEventListener('input', syncEditorSize)

      textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          e.preventDefault()
          closeCellEditor(false)
        } else if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault()
          closeCellEditor(true)
        } else if (e.key === 'Tab') {
          e.preventDefault()
          const current = readTableData(freshModel)
          if (!current) return
          const next = stepTableCell(current, mountRow, mountCol, e.shiftKey ? 'prev' : 'next')
          if (next.row === mountRow && next.col === mountCol) return
          closeCellEditor(true)
          openCellEditor(nodeId, next.row, next.col)
        }
      })
      textarea.addEventListener('blur', () => {
        if (suppressCellEditorBlur) return
        closeCellEditor(true)
      })

      document.body.appendChild(textarea)
      textarea.focus()
      // 等 focus 事件完全冒泡完再解除 blur suppress，避免 focus 引发的 blur 误关编辑器
      requestAnimationFrame(() => { suppressCellEditorBlur = false })
      if (initialChar != null) {
        textarea.setSelectionRange(textarea.value.length, textarea.value.length)
      } else {
        textarea.select()
      }
      cellEdit = { nodeId, row: mountRow, col: mountCol, textarea }
      openingCellEditor = false
      bumpTableView(nodeId)
      startCellEditorSync()
    }

    // 单 rAF 让当前事件循环收尾；编辑框定位是纯几何计算，无需等待 DOM 重渲染
    requestAnimationFrame(() => mountEditor(0))
  }

  function beginCellEdit(nodeId: string, data: DiagramTableData) {
    const active = getTableActiveCell(nodeId) ?? resolveActiveCell(nodeId, data)
    openCellEditor(nodeId, active.row, active.col)
  }

  function beginCellEditWithChar(
    nodeId: string,
    data: DiagramTableData,
    cell: TableActiveCell,
    char: string
  ) {
    const resolved = getTableActiveCell(nodeId) ?? cell
    prepareCellForEdit(nodeId, resolved)
    openCellEditor(nodeId, resolved.row, resolved.col, {
      initialChar: char,
      replaceContent: true
    })
  }

  function resolveTableBodyPointer(
    event: PointerEvent
  ): { nodeId: string; cell: TableActiveCell | null; hitEl: Element } | null {
    const target = event.target as Element

    const cellHit = target.closest('.dg-table-cell-hit')
    if (cellHit) {
      const nodeId = resolveTableNodeId(cellHit, event)
      if (!nodeId) return null
      return { nodeId, cell: parseCellFromHit(cellHit), hitEl: cellHit }
    }

    const tableRoot = target.closest('.dg-table-shape[data-dg-node-id]')
    if (tableRoot) {
      const nodeId = tableRoot.getAttribute('data-dg-node-id')
      if (nodeId && isTableNode(lf, nodeId)) {
        const cell = resolveCellAtClient(nodeId, event.clientX, event.clientY)
        return { nodeId, cell, hitEl: tableRoot }
      }
    }

    const hit = pickDiagramElementAtClient(lf, event.clientX, event.clientY, (clientX, clientY) =>
      lf.getPointByClient({ x: clientX, y: clientY }).canvasOverlayPosition
    )
    if (hit.kind === 'node' && hit.targetId && isTableNode(lf, hit.targetId)) {
      const cell = resolveCellAtClient(hit.targetId, event.clientX, event.clientY)
      return { nodeId: hit.targetId, cell, hitEl: target }
    }

    return null
  }

  function resolveTableNodeId(el: Element | null, event?: PointerEvent): string | null {
    const marked = el?.closest('[data-dg-node-id]')
    const fromAttr = marked?.getAttribute('data-dg-node-id')
    if (fromAttr && isTableNode(lf, fromAttr)) return fromAttr

    if (event) {
      const hit = pickDiagramElementAtClient(lf, event.clientX, event.clientY, (clientX, clientY) =>
        lf.getPointByClient({ x: clientX, y: clientY }).canvasOverlayPosition
      )
      if (hit.kind === 'node' && hit.targetId && isTableNode(lf, hit.targetId)) {
        return hit.targetId
      }
    }
    return null
  }

  function releaseCapturedPointer(
    captureEl: Element | null | undefined,
    pointerId: number | undefined
  ): void {
    if (!captureEl || pointerId == null) return
    try {
      if (captureEl.hasPointerCapture?.(pointerId)) {
        captureEl.releasePointerCapture(pointerId)
      }
    } catch {
      /* ignore */
    }
  }

  function forceResetAllInteractionState(): void {
    if (dividerRafId !== 0) {
      cancelAnimationFrame(dividerRafId)
      dividerRafId = 0
    }
    pendingDividerEvent = null
    if (dividerDrag) {
      releaseCapturedPointer(dividerDrag.captureEl, dividerDrag.pointerId)
      const model = lf.getNodeModelById(dividerDrag.nodeId)
      if (model && dividerDrag.restoreDraggable !== undefined) {
        model.draggable = dividerDrag.restoreDraggable
      }
      dividerDrag = null
      setTableDividerDragging(false)
      setTableActiveDivider(null)
      ports.clearDragUndoBaseline()
    }
    if (nodeMoveDrag) endNodeMoveDrag(false)
    if (cellMarquee) {
      releaseCapturedPointer(cellMarquee.captureEl, cellMarquee.pointerId)
      setTableCellMarquee(cellMarquee.nodeId, null)
      cellMarquee = null
    }
  }

  function resetStaleInteractionState(): void {
    if (dividerDrag) return
    if (nodeMoveDrag) return
    if (cellMarquee?.marqueeActive) return
    if (cellMarquee) {
      releaseCapturedPointer(cellMarquee.captureEl, cellMarquee.pointerId)
      setTableCellMarquee(cellMarquee.nodeId, null)
      cellMarquee = null
    }
  }

  function beginDividerDrag(
    event: PointerEvent,
    context: TableDividerPointerContext,
    hitEl: Element
  ) {
    if (event.ctrlKey || event.metaKey) return
    const nodeId = context.nodeId
    if (!isTableNode(lf, nodeId)) return
    const model = lf.getNodeModelById(nodeId)
    const data = model ? readTableData(model) : null
    if (!model || !data) return

    consumeTablePointer(event)
    hideTableToolbarTooltip()
    activateTableNode(nodeId)
    const measureOptions = {
      cellStyle: toTableCellMeasureStyle(model, false),
      headerStyle: toTableCellMeasureStyle(model, true)
    }
    ports.captureDragUndoBaseline()
    const restoreDraggable = model.draggable
    model.draggable = false
    try {
      hitEl.setPointerCapture(event.pointerId)
    } catch {
      /* SVG 不支持时忽略 */
    }
    setTableDividerDragging(true)
    setTableActiveDivider({ kind: context.kind, index: context.index })
    bumpTableView(nodeId)
    dividerDrag = {
      kind: context.kind,
      nodeId,
      index: context.index,
      startClientX: event.clientX,
      startClientY: event.clientY,
      snapshot: snapshotTableDataForDrag(data, model.width, measureOptions, model.height),
      restoreDraggable,
      pointerId: event.pointerId,
      captureEl: hitEl
    }
  }

  function onCellPointerDown(event: PointerEvent, ctx: TableCellPointerContext, hitEl: Element) {
    consumeTablePointer(event)
    rememberTablePointerCell(ctx)
    dismissCellEditorForPointer(event)
    const cell = { row: ctx.row, col: ctx.col }
    if (event.shiftKey || event.ctrlKey || event.metaKey) {
      activateTableNode(ctx.nodeId, event)
      toggleCellInSelection(ctx.nodeId, cell)
      clearTableMarquee(ctx.nodeId)
      bumpTableView(ctx.nodeId)
      syncTableSelectionToPanel()
      focusCanvasForKeyboard()
      ports.scheduleGraphChange()
      return
    }
    selectTableCell(ctx.nodeId, cell, event, { force: true })
    requestAnimationFrame(() => focusCanvasForKeyboard())
    cellMarquee = {
      nodeId: ctx.nodeId,
      anchor: cell,
      startClientX: event.clientX,
      startClientY: event.clientY,
      pointerId: event.pointerId,
      captureEl: hitEl,
      marqueeActive: false
    }
    ports.scheduleGraphChange()
  }

  function onCellDblClick(event: MouseEvent, ctx: TableCellPointerContext) {
    consumeTablePointer(event as unknown as PointerEvent)
    rememberTablePointerCell(ctx)
    dismissCellEditorForPointer(event as unknown as PointerEvent)
    activateTableNode(ctx.nodeId, event as unknown as PointerEvent)
    openCellEditor(ctx.nodeId, ctx.row, ctx.col)
  }

  function onMovePointerDown(event: PointerEvent, nodeId: string, hitEl: Element) {
    consumeTablePointer(event)
    activateTableNode(nodeId, event)
    beginNodeMoveDrag(event, hitEl, nodeId)
  }

  function onToolbarPointerDown(
    event: PointerEvent,
    ctx: { nodeId: string; action: 'addCol' | 'addRow' | 'removeCol' | 'removeRow' }
  ) {
    const toolEl = (event.currentTarget ?? event.target) as Element
    const group = toolEl.closest(
      '.dg-table-add-col, .dg-table-add-row, .dg-table-remove-col, .dg-table-remove-row'
    )
    if (group?.getAttribute('data-disabled') === '1') {
      consumeTablePointer(event)
      return
    }
    consumeTablePointer(event)
    activateTableNode(ctx.nodeId, event)
    const data = readTableData(lf.getNodeModelById(ctx.nodeId)!)
    if (!data) return
    const active = getTableActiveCell(ctx.nodeId)
    let changed = false
    if (ctx.action === 'addCol') {
      changed = applyToolbarMutation(ctx.nodeId, tableToolbarAddColumn(data, active))
    } else if (ctx.action === 'addRow') {
      changed = applyToolbarMutation(ctx.nodeId, tableToolbarAddRow(data, active))
    } else if (ctx.action === 'removeCol') {
      changed = applyToolbarMutation(ctx.nodeId, tableToolbarRemoveColumn(data, active))
    } else if (ctx.action === 'removeRow') {
      changed = applyToolbarMutation(ctx.nodeId, tableToolbarRemoveRow(data, active))
    }
    if (changed) {
      ports.scheduleGraphChange()
    }
  }

  /** 容器 capture：统一命中表格控件（比 SVG onPointerDown 更可靠，避免重绘后失效） */
  const onContainerPointerDown = (event: PointerEvent) => {
    if (event.button !== 0) return
    dismissCellEditorForPointer(event)
    resetStaleInteractionState()

    const moveHit =
      findHitInStack(event, '.dg-table-move-handle-hit, .dg-table-move-handle__hit') ??
      (event.target as Element).closest('.dg-table-move-handle-hit, .dg-table-move-handle__hit')
    if (moveHit) {
      const nodeId = resolveTableNodeId(moveHit, event)
      if (nodeId) onMovePointerDown(event, nodeId, moveHit)
      return
    }

    const toolHit =
      findHitInStack(event, '.dg-table-tool-hit') ??
      (event.target as Element).closest('.dg-table-tool-hit')
    const toolGroup = toolHit?.closest(
      '.dg-table-add-col, .dg-table-add-row, .dg-table-remove-col, .dg-table-remove-row'
    )
    const addCol =
      (toolGroup?.classList.contains('dg-table-add-col') ? toolGroup : null) ??
      findHitInStack(event, '.dg-table-add-col') ??
      (event.target as Element).closest('.dg-table-add-col')
    const addRow =
      (toolGroup?.classList.contains('dg-table-add-row') ? toolGroup : null) ??
      findHitInStack(event, '.dg-table-add-row') ??
      (event.target as Element).closest('.dg-table-add-row')
    const removeCol =
      (toolGroup?.classList.contains('dg-table-remove-col') ? toolGroup : null) ??
      findHitInStack(event, '.dg-table-remove-col') ??
      (event.target as Element).closest('.dg-table-remove-col')
    const removeRow =
      (toolGroup?.classList.contains('dg-table-remove-row') ? toolGroup : null) ??
      findHitInStack(event, '.dg-table-remove-row') ??
      (event.target as Element).closest('.dg-table-remove-row')
    if (addCol || addRow || removeCol || removeRow) {
      const nodeId = resolveTableNodeId(addCol ?? addRow ?? removeCol ?? removeRow, event)
      if (!nodeId) return
      const action = addCol ? 'addCol' : addRow ? 'addRow' : removeCol ? 'removeCol' : 'removeRow'
      onToolbarPointerDown(event, { nodeId, action })
      return
    }

    const colDivider =
      findHitInStack(event, '.dg-table-col-divider') ??
      (event.target as Element).closest('.dg-table-col-divider')
    const rowDivider =
      findHitInStack(event, '.dg-table-row-divider') ??
      (event.target as Element).closest('.dg-table-row-divider')
    if (colDivider || rowDivider) {
      const hitEl = (colDivider ?? rowDivider)!
      const nodeId = resolveTableNodeId(hitEl, event)
      if (!nodeId) return
      beginDividerDrag(
        event,
        {
          kind: colDivider ? 'col' : 'row',
          index: Number(hitEl.getAttribute('data-index') ?? 0),
          nodeId
        },
        hitEl
      )
      return
    }

    const cellPointer = resolveTableCellHitFromStack(event)
    if (cellPointer) {
      onCellPointerDown(
        event,
        { nodeId: cellPointer.nodeId, row: cellPointer.cell.row, col: cellPointer.cell.col },
        cellPointer.hitEl
      )
      return
    }

    const bodyPointer = resolveTableBodyPointer(event)
    if (bodyPointer?.cell) {
      onCellPointerDown(
        event,
        { nodeId: bodyPointer.nodeId, row: bodyPointer.cell.row, col: bodyPointer.cell.col },
        bodyPointer.hitEl
      )
      return
    }

    if (bodyPointer) {
      stopLfBubble(event)
      activateTableNode(bodyPointer.nodeId, event)
      focusCanvasForKeyboard()
    }
  }

  const onContainerDblClick = (event: MouseEvent) => {
    const pointer = event as unknown as PointerEvent
    const cellPointer = resolveTableCellHitFromStack(pointer)
    if (cellPointer) {
      onCellDblClick(event, {
        nodeId: cellPointer.nodeId,
        row: cellPointer.cell.row,
        col: cellPointer.cell.col
      })
      return
    }

    const hit =
      findHitInStack(pointer, '.dg-table-cell-hit') ??
      (event.target as Element).closest('.dg-table-cell-hit')
    if (hit) {
      const nodeId = resolveTableNodeId(hit, event)
      if (!nodeId) return
      const cell = parseCellFromHit(hit)
      onCellDblClick(event, { nodeId, row: cell.row, col: cell.col })
      return
    }

    const bodyPointer = resolveTableBodyPointer(event as unknown as PointerEvent)
    if (!bodyPointer?.cell) return
    onCellDblClick(event, {
      nodeId: bodyPointer.nodeId,
      row: bodyPointer.cell.row,
      col: bodyPointer.cell.col
    })
  }

  const onInteractionInterrupt = () => {
    if (cellEdit) closeCellEditor(true)
    if (dividerRafId !== 0) {
      cancelAnimationFrame(dividerRafId)
      dividerRafId = 0
    }
    pendingDividerEvent = null
    if (dividerDrag) {
      releaseCapturedPointer(dividerDrag.captureEl, dividerDrag.pointerId)
      const model = lf.getNodeModelById(dividerDrag.nodeId)
      if (model && dividerDrag.restoreDraggable !== undefined) {
        model.draggable = dividerDrag.restoreDraggable
      }
      dividerDrag = null
      setTableDividerDragging(false)
      setTableActiveDivider(null)
      ports.clearDragUndoBaseline()
    }
    if (nodeMoveDrag) endNodeMoveDrag(false)
    if (cellMarquee) endCellMarqueeDrag()
  }

  setTableExternalPatchHandler((nodeId) => {
    if (cellEdit?.nodeId === nodeId) {
      closeCellEditor(true)
    }
    forceResetAllInteractionState()
    restoreTableNodeInteraction(nodeId)
  })

  function beginNodeMoveDrag(event: PointerEvent, hitEl: Element, nodeId: string) {
    blockPointerDefault(event)
    stopLfBubble(event)
    const model = lf.getNodeModelById(nodeId)
    if (!model) return
    ports.captureDragUndoBaseline()
    try {
      hitEl.setPointerCapture(event.pointerId)
    } catch {
      /* ignore */
    }
    nodeMoveDrag = {
      nodeId,
      pointerId: event.pointerId,
      captureEl: hitEl,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: model.x,
      startY: model.y
    }
  }

  function consumeTablePointer(event: PointerEvent) {
    event.preventDefault()
    event.stopPropagation()
  }

  function blockPointerDefault(event: Event) {
    event.preventDefault()
  }

  function stopLfBubble(event: Event) {
    event.stopPropagation()
  }

  function blockNodeDrag(event: Event) {
    blockPointerDefault(event)
    stopLfBubble(event)
  }

  function applyToolbarMutation(
    nodeId: string,
    result: ReturnType<typeof tableToolbarAddColumn>
  ): boolean {
    if (!result) return false
    commitTableDataChange(nodeId, result.data)
    if (result.active) {
      setTableCellSelection(nodeId, [result.active], result.active, { force: true })
    }
    bumpTableView(nodeId)
    return true
  }

  let selectionHandling = false

  const syncTableNodesFromGraph = () => {
    if (selectionHandling) return
    selectionHandling = true
    try {
      for (const node of lf.graphModel.nodes) {
        if (!isTableNode(lf, node.id)) continue
        if (!node.isSelected) {
          clearTableActiveCell(node.id)
          continue
        }
        if (!getTableActiveCell(node.id)) {
          const data = readTableData(node)
          if (data) {
            setTableCellSelection(node.id, [getDefaultTableActiveCell(data)], getDefaultTableActiveCell(data))
            bumpTableView(node.id)
          }
        } else {
          const data = readTableData(node)
          const active = getTableActiveCell(node.id)
          if (data && active?.row === -1 && data.showHeader === false) {
            setTableCellSelection(node.id, [getDefaultTableActiveCell(data)], getDefaultTableActiveCell(data))
            bumpTableView(node.id)
          }
        }
      }
      ports.scheduleGraphChange()
    } finally {
      selectionHandling = false
    }
  }

  const onTableNodeClick = ({ data }: { data: { id: string }; e?: MouseEvent }) => {
    if (!isTableNode(lf, data.id)) return
    const model = lf.getNodeModelById(data.id)
    const tableData = model ? readTableData(model) : null
    if (tableData && !getTableActiveCell(data.id)) {
      const initial = getDefaultTableActiveCell(tableData)
      setTableCellSelection(data.id, [initial], initial, { force: true })
      bumpTableView(data.id)
    }
    syncTableNodesFromGraph()
    ports.notifyUserSelectionChange()
  }

  const onBlankClick = () => {
    closeCellEditor(true)
    for (const node of lf.graphModel.nodes) {
      if (!isTableNode(lf, node.id)) continue
      clearTableActiveCell(node.id)
    }
  }

  const onKeyDown = (event: KeyboardEvent): boolean => {
    // 编辑器已打开或正在打开：交给 textarea 自身处理，避免重复 open 产生孤儿编辑框
    if (cellEdit || openingCellEditor) return false

    const nodeId = getSingleSelectedTableId(lf)
    if (!nodeId) return false

    const model = lf.getNodeModelById(nodeId)
    if (!model) return false
    const data = readTableData(model)
    if (!data) return false

    const mod = event.ctrlKey || event.metaKey
    let activeCell = getTableActiveCell(nodeId)
    const printable =
      !mod &&
      !event.altKey &&
      !event.isComposing &&
      event.key.length === 1 &&
      !event.key.startsWith('Arrow') &&
      event.key !== 'Tab'

    if (printable) {
      focusCanvasForKeyboard()
    } else if (isEditableTarget(event.target)) {
      return false
    }

    const arrowDir = !mod && !event.altKey ? ARROW_DIRS[event.key] : undefined

    if (arrowDir) {
      event.preventDefault()
      const current = resolveActiveCell(nodeId, data)
      const next = stepTableCellArrow(data, current.row, current.col, arrowDir)
      focusCell(nodeId, next)
      return true
    }

    if (event.key === 'Tab' && !mod && !event.altKey) {
      event.preventDefault()
      const current = resolveActiveCell(nodeId, data)
      const next = stepTableCell(data, current.row, current.col, event.shiftKey ? 'prev' : 'next')
      if (next.row !== current.row || next.col !== current.col) {
        focusCell(nodeId, next)
      }
      return true
    }

    if ((event.key === 'Enter' || event.key === 'F2') && !mod && !event.altKey) {
      event.preventDefault()
      beginCellEdit(nodeId, data)
      return true
    }

    if (
      !mod &&
      !event.altKey &&
      !event.isComposing &&
      event.key.length === 1
    ) {
      if (printable) {
        if (!activeCell) {
          const last = getLastPointerCell()
          if (last && last.nodeId === nodeId) {
            activeCell = { row: last.row, col: last.col }
          } else {
            activeCell = resolveActiveCell(nodeId, data)
          }
          setTableCellSelection(nodeId, [activeCell], activeCell, { force: true })
          bumpTableView(nodeId)
        }
        event.preventDefault()
        beginCellEditWithChar(nodeId, data, activeCell, event.key)
        return true
      }
    }

    if (
      (event.key === 'Delete' || event.key === 'Backspace') &&
      !mod &&
      !event.altKey &&
      getTableActiveCell(nodeId)
    ) {
      const model = lf.getNodeModelById(nodeId)!
      const data = readTableData(model)
      if (!data) return false
      const active = getTableActiveCell(nodeId)!
      const value = readTableCellValue(data, active.row, active.col)
      if (!value) return false
      event.preventDefault()
      commitTableDataChange(
        nodeId,
        patchTableCell(
          data,
          active.row,
          active.col,
          '',
          toTableCellMeasureStyle(model, active.row === -1),
          model.width,
          model.height
        )
      )
      ports.scheduleGraphChange()
      return true
    }

    return false
  }

  const onPointerMove = (event: PointerEvent) => {
    if (nodeMoveDrag) {
      event.preventDefault()
      const zoom = lf.getTransform().SCALE_X || 1
      const dx = (event.clientX - nodeMoveDrag.startClientX) / zoom
      const dy = (event.clientY - nodeMoveDrag.startClientY) / zoom
      lf.graphModel.moveNode2Coordinate(
        nodeMoveDrag.nodeId,
        nodeMoveDrag.startX + dx,
        nodeMoveDrag.startY + dy,
        true
      )
      ports.scheduleGraphChange()
      return
    }

    if (cellMarquee) {
      const dist = Math.hypot(
        event.clientX - cellMarquee.startClientX,
        event.clientY - cellMarquee.startClientY
      )
      if (!cellMarquee.marqueeActive && dist >= MARQUEE_THRESHOLD_PX) {
        cellMarquee.marqueeActive = true
        try {
          cellMarquee.captureEl.setPointerCapture(cellMarquee.pointerId)
        } catch {
          /* ignore */
        }
      }
      if (cellMarquee.marqueeActive) {
        event.preventDefault()
        const current = resolveCellAtClient(cellMarquee.nodeId, event.clientX, event.clientY)
        if (current) {
          updateMarqueeSelection(cellMarquee.nodeId, cellMarquee.anchor, current)
        }
      }
      return
    }

    if (!dividerDrag) return
    event.preventDefault()
    pendingDividerEvent = event
    if (dividerRafId !== 0) return
    dividerRafId = requestAnimationFrame(applyDividerDragFrame)
  }

  function applyDividerDragFrame() {
    dividerRafId = 0
    if (!dividerDrag || !pendingDividerEvent) return
    const event = pendingDividerEvent
    const model = lf.getNodeModelById(dividerDrag.nodeId)
    if (!model) return
    const zoom = lf.getTransform().SCALE_X || 1
    if (dividerDrag.kind === 'col') {
      const deltaX = (event.clientX - dividerDrag.startClientX) / zoom
      const next = resizeTableColumnDivider(
        dividerDrag.snapshot,
        dividerDrag.index,
        deltaX,
        model.width
      )
      patchTable(lf, dividerDrag.nodeId, next)
      dividerDrag.snapshot = normalizeTableData(next)
      dividerDrag.startClientX = event.clientX
    } else {
      const deltaY = (event.clientY - dividerDrag.startClientY) / zoom
      const next = resizeTableRowDivider(
        dividerDrag.snapshot,
        dividerDrag.index,
        deltaY,
        model.height
      )
      patchTable(lf, dividerDrag.nodeId, next)
      dividerDrag.snapshot = normalizeTableData(next)
      dividerDrag.startClientY = event.clientY
    }
    ports.scheduleGraphChange()
  }

  const onPointerUp = () => {
    if (nodeMoveDrag) {
      endNodeMoveDrag(true)
    }
    if (cellMarquee) {
      endCellMarqueeDrag()
      ports.scheduleGraphChange()
      focusCanvasForKeyboard()
    }
    if (dividerRafId !== 0) {
      cancelAnimationFrame(dividerRafId)
      dividerRafId = 0
      applyDividerDragFrame()
    }
    pendingDividerEvent = null
    if (!dividerDrag) return
    const draggedNodeId = dividerDrag.nodeId
    try {
      dividerDrag.captureEl.releasePointerCapture(dividerDrag.pointerId)
    } catch {
      /* ignore */
    }
    const model = lf.getNodeModelById(dividerDrag.nodeId)
    if (model && dividerDrag.restoreDraggable !== undefined) {
      model.draggable = dividerDrag.restoreDraggable
    }
    dividerDrag = null
    setTableDividerDragging(false)
    setTableActiveDivider(null)
    if (model) {
      const data = readTableData(model)
      if (data) {
        syncTableLayoutToNode(model, data, {
          cellStyle: toTableCellMeasureStyle(model, false),
          headerStyle: toTableCellMeasureStyle(model, true)
        })
      }
    }
    bumpTableView(draggedNodeId)
    ports.commitDragUndoMutation()
    ports.scheduleGraphChange()
  }

  const onToolPointerOver = (event: PointerEvent) => {
    if (shouldHideTableToolbar()) return
    const group = resolveTableToolbarTooltipTarget(event.target)
    if (!group) return
    const text = readTableToolbarTooltipText(group)
    if (text) showTableToolbarTooltip(group, text)
  }

  const onToolPointerOut = (event: PointerEvent) => {
    const from = (event.target as Element | null)?.closest(TABLE_TOOLTIP_TARGET_SELECTOR)
    if (!from) return
    const to = event.relatedTarget as Element | null
    if (to?.closest(TABLE_TOOLTIP_TARGET_SELECTOR)) return
    hideTableToolbarTooltip()
  }

  lf.on('node:click', onTableNodeClick)
  lf.on('blank:click', onBlankClick)
  const teardownKeyboard = registerDiagramKeyboardInterceptor(onKeyDown)
  const teardownResizeStart = onDiagramResizeSessionStart(({ nodeId }) => {
    if (!isTableNode(lf, nodeId)) return
    hideTableToolbarTooltip()
    setTableNodeResizing(true)
    bumpTableView(nodeId)
  })
  const teardownResizeEnd = onDiagramResizeSessionEnd(({ nodeId }) => {
    if (!isTableNode(lf, nodeId)) return
    setTableNodeResizing(false)
    const model = lf.getNodeModelById(nodeId)
    const data = model ? readTableData(model) : null
    if (model && data) {
      syncTableLayoutToNode(model, data, {
        cellStyle: toTableCellMeasureStyle(model, false),
        headerStyle: toTableCellMeasureStyle(model, true)
      })
    }
    bumpTableView(nodeId)
  })
  const onDocumentPointerDown = (event: PointerEvent) => {
    if (!isPointerInsideCanvas(event)) return
    onContainerPointerDown(event)
  }
  const onDocumentDblClick = (event: MouseEvent) => {
    if (!isPointerInsideCanvas(event)) return
    onContainerDblClick(event)
  }
  const onDocumentPointerOver = (event: PointerEvent) => {
    if (!isPointerInsideCanvas(event)) return
    onToolPointerOver(event)
  }
  const onDocumentPointerOut = (event: PointerEvent) => {
    if (!isPointerInsideCanvas(event)) return
    onToolPointerOut(event)
  }

  document.addEventListener('pointerdown', onDocumentPointerDown, true)
  document.addEventListener('dblclick', onDocumentDblClick, true)
  document.addEventListener('pointerover', onDocumentPointerOver, true)
  document.addEventListener('pointerout', onDocumentPointerOut, true)
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
  window.addEventListener('pointercancel', onPointerUp)
  window.addEventListener('blur', onInteractionInterrupt)
  const onVisibilityChange = () => {
    if (document.visibilityState === 'hidden') onInteractionInterrupt()
  }
  document.addEventListener('visibilitychange', onVisibilityChange)

  return () => {
    closeCellEditor(false)
    stopCellEditorSync()
    hideTableToolbarTooltip()
    setTableExternalPatchHandler(null)
    setTableDividerDragging(false)
    setTableActiveDivider(null)
    setTableNodeResizing(false)
    clearAllTableActiveCells()
    disposeTableToolbarTooltipHost()
    lf.off('node:click', onTableNodeClick)
    lf.off('blank:click', onBlankClick)
    teardownKeyboard()
    teardownResizeStart()
    teardownResizeEnd()
    document.removeEventListener('pointerdown', onDocumentPointerDown, true)
    document.removeEventListener('dblclick', onDocumentDblClick, true)
    document.removeEventListener('pointerover', onDocumentPointerOver, true)
    document.removeEventListener('pointerout', onDocumentPointerOut, true)
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
    window.removeEventListener('pointercancel', onPointerUp)
    window.removeEventListener('blur', onInteractionInterrupt)
    document.removeEventListener('visibilitychange', onVisibilityChange)
    if (dividerRafId !== 0) cancelAnimationFrame(dividerRafId)
  }
}
