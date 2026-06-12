import LogicFlow, { OverlapMode } from '@logicflow/core'
import type { CanvasGraphPatch, DiagramViewport, IDiagramEditorPort } from '@modules/library/diagrams/interfaces/IDiagramEditorPort'
import {
  backgroundForPreset,
  logicFlowThemeForPreset,
  resolveThemeFromPreset
} from '@modules/library/diagrams/lib/diagramCanvasPresets'
import {
  DIAGRAM_GRID_SIZE,
  diagramCanvasBackground,
  type DiagramCanvasTheme
} from '@modules/library/diagrams/lib/diagramCanvasTheme'
import {
  mountDiagramMultiSelectResize,
  getMultiSelectOverlayRect,
  countSelectedDiagramNodes,
  type DiagramMultiSelectLayout
} from '@modules/library/diagrams/lib/diagramMultiSelectResize'
import {
  applyEdgeProperties,
  applyNodeProperties,
  normalizeEdgeStyleProperties,
  normalizeNodeStyleProperties,
  readEdgeProperties,
  readNodeProperties,
  syncNodeTextLayout
} from '@modules/library/diagrams/lib/diagramStyleBridge'
import { applyNodeDimensions } from '@modules/library/diagrams/lib/diagramShapeResize'
import { ensureDiagramShapeExtensions } from '@modules/library/diagrams/app/diagramShapeExtensions'
import {
  isDiagramShapePayloadEnvelope,
  patchNodeDgShape,
  syncShapeExtensionNodeAfterLoad
} from '@modules/library/diagrams/domain/shape-extension'
import type { DiagramShapePayloadEnvelope } from '@modules/library/diagrams/domain/shape-extension/types'
import {
  buildDiagramNodeConfig,
  getDiagramShapeById,
  registerAllDiagramShapes
} from '@modules/library/diagrams/lib/diagramShapeRegistry'
import { isPointNearEdgePolyline } from '@modules/library/diagrams/lib/diagramEdgeInsert'
import { setDiagramEdgeAccent } from '@modules/library/diagrams/lib/diagramShapeRegs'
import type {
  DiagramCanvasSettings,
  DiagramEdgeProperties,
  DiagramEditorSelection,
  DiagramNodeProperties
} from '@modules/library/diagrams/lib/diagramSelectionTypes'
import { defaultCanvasSettings } from '@modules/library/diagrams/lib/diagramSelectionTypes'
import { resolveSelectionCapabilities } from '@modules/library/diagrams/domain/selection'
import { DiagramBoxSelectCoordinator } from '@modules/library/diagrams/services/diagramBoxSelectCoordinator'
import { DiagramCanvasViewportController } from '@modules/library/diagrams/services/diagramCanvasViewportController'
import { DiagramEdgeInsertCoordinator } from '@modules/library/diagrams/services/diagramEdgeInsertCoordinator'
import { DiagramGroupFrameCoordinator } from '@modules/library/diagrams/services/diagramGroupFrameCoordinator'
import { bindDiagramCanvasEvents } from '@modules/library/diagrams/services/bindDiagramCanvasEvents'
import { DiagramEditorSelectionBridge } from '@modules/library/diagrams/services/diagramEditorSelectionBridge'
import { DiagramMultiSelectOverlayCoordinator } from '@modules/library/diagrams/services/diagramMultiSelectOverlayCoordinator'
import { DiagramSelectionPointerCapture } from '@modules/library/diagrams/services/diagramSelectionPointerCapture'
import { filterAlignableNodeIds } from '@modules/library/diagrams/lib/diagramSelectionSnapshot'
import {
  alignNodePositions,
  distributeNodePositions,
  selectionBoundsCenter,
  type DiagramAlignMode,
  type DiagramDistributeMode,
  type DiagramNodeBounds
} from '@modules/library/diagrams/lib/diagramNodeLayout'
import {
  DEFAULT_GROUP_STYLE,
  DIAGRAM_GROUP_FRAME_TYPE,
  clearElementGroupId,
  clearGroupFramePointerInside
} from '@modules/library/diagrams/lib/diagramGroupFrame'
import {
  ensureAllGroupFramesAtBottom,
  ensureGroupFrameAtBottom,
  syncGroupFrameBounds,
  syncGroupFramesForNodes
} from '@modules/library/diagrams/lib/diagramGroupBounds'
import {
  analyzeGroupSelection,
  collectOrderedSelectionIds
} from '@modules/library/diagrams/lib/diagramGroupSelection'
import { snapCanvasPoint } from '@modules/library/diagrams/lib/diagramGridSnap'
import { snapCoordinateToGrid } from '@modules/library/diagrams/lib/diagramCanvasTheme'
import {
  clearEdgeStyle,
  clearNodeStyle,
  type DiagramEdgeStyleSnapshot,
  type DiagramFormatPainterKind,
  type DiagramNodeStyleSnapshot,
  readEdgeStyleSnapshot,
  readNodeStyleSnapshot
} from '@modules/library/diagrams/lib/diagramStyleClipboard'

let snapshotPluginReady: Promise<void> | null = null
let miniMapPluginReady: Promise<void> | null = null
let selectionSelectPluginReady: Promise<void> | null = null

export async function ensureSelectionSelectPlugin(): Promise<void> {
  if (!selectionSelectPluginReady) {
    selectionSelectPluginReady = import('@logicflow/extension/es/components/selection-select').then(
      ({ SelectionSelect }) => {
        LogicFlow.use(SelectionSelect)
      }
    )
  }
  await selectionSelectPluginReady
}

export async function ensureSnapshotPlugin(): Promise<void> {
  if (!snapshotPluginReady) {
    snapshotPluginReady = import('@logicflow/extension/es/tools/snapshot').then(({ Snapshot }) => {
      LogicFlow.use(Snapshot)
    })
  }
  await snapshotPluginReady
}

export async function ensureMiniMapPlugin(): Promise<void> {
  if (!miniMapPluginReady) {
    miniMapPluginReady = import('@logicflow/extension/es/components/mini-map').then(({ MiniMap }) => {
      LogicFlow.use(MiniMap)
    })
  }
  await miniMapPluginReady
}

export class LogicFlowDiagramAdapter implements IDiagramEditorPort {
  private lf: LogicFlow | null = null
  private container: HTMLElement | null = null
  private selectionHandler: ((selection: DiagramEditorSelection) => void) | null = null
  private graphChangeHandler: (() => void) | null = null
  private graphChangeRaf: number | null = null
  private selectionEmitRaf: number | null = null
  private resizeSnapTimer: ReturnType<typeof setTimeout> | null = null
  private viewportChangeHandler: (() => void) | null = null
  private resolvedTheme: DiagramCanvasTheme = 'light'
  private canvasSettings: DiagramCanvasSettings = defaultCanvasSettings('light')
  private teardownAxis: (() => void) | null = null
  private teardownMultiSelectResize: (() => void) | null = null
  private refreshMultiSelectResize: (() => void) | null = null
  private refreshMultiSelectResizeNow: (() => DiagramMultiSelectLayout) | null = null
  private overlayLayoutHandler: ((layout: DiagramMultiSelectLayout) => void) | null = null
  private teardownMiddlePan: (() => void) | null = null
  private teardownShiftWheelPan: (() => void) | null = null
  private teardownContextMenu: (() => void) | null = null
  private teardownCanvasEvents: (() => void) | null = null
  private contextMenuHandler:
    | ((detail: {
        event: MouseEvent
        kind: 'node' | 'edge' | 'blank'
        targetId?: string
        nodeIds: string[]
        edgeIds: string[]
      }) => void)
    | null = null
  private teardownSelectionSnapshot: (() => void) | null = null
  private teardownSelectionPointerSync: (() => void) | null = null
  private teardownBoxSelectRubberGuard: (() => void) | null = null
  private readonly viewport = new DiagramCanvasViewportController()
  private readonly groupFrames = new DiagramGroupFrameCoordinator({
    getLf: () => this.lf,
    clientToCanvas: (x, y) => this.clientToCanvas(x, y),
    onPointerMove: (x, y) => this.updateFormatPainterCursor(x, y),
    onPointerLeave: () => this.updateFormatPainterCursor(0, 0)
  })
  private readonly edgeInsert = new DiagramEdgeInsertCoordinator({
    getLf: () => this.lf,
    select: (ids) => this.select(ids),
    scheduleGraphChange: () => this.scheduleGraphChange()
  })
  private readonly selectionPointerCapture = new DiagramSelectionPointerCapture({
    getLf: () => this.lf,
    isMiddlePanning: () => this.viewport.isMiddlePanning(),
    onPointerUpRefresh: () => this.scheduleMultiSelectOverlayRefresh()
  })
  private readonly boxSelect: DiagramBoxSelectCoordinator = new DiagramBoxSelectCoordinator({
    getLf: () => this.lf,
    getContainer: () => this.container,
    getCanvasFrameEl: () => this.getCanvasFrameEl(),
    isMiddlePanning: () => this.viewport.isMiddlePanning(),
    getSelectionFullSnapshot: (pointerId) =>
      this.selectionPointerCapture.getFullSnapshot(pointerId),
    syncSelectionFromGraph: () => this.selectionBridge.syncFromGraph(),
    scheduleGroupFramesToBottom: () => this.groupFrames.scheduleToBottom(),
    scheduleMultiSelectOverlayRefresh: () => this.scheduleMultiSelectOverlayRefresh(),
    publishSelectionFromLiveGraph: () => this.selectionBridge.publishFromLiveGraph(),
    afterSelectionMutation: () => this.selectionBridge.afterSelectionMutation(),
    getLastSelectedNodeIds: () => this.selectionBridge.getLastSelectedNodeIds(),
    getLastSelectedEdgeIds: () => this.selectionBridge.getLastSelectedEdgeIds()
  })
  private readonly multiSelectOverlay: DiagramMultiSelectOverlayCoordinator =
    new DiagramMultiSelectOverlayCoordinator({
      getLf: () => this.lf,
      getCanvasFrameEl: () => this.getCanvasFrameEl(),
      onLayoutChange: (layout) => this.overlayLayoutHandler?.(layout),
      refreshMultiSelectResize: () => this.refreshMultiSelectResize?.(),
      refreshMultiSelectResizeNow: () => this.refreshMultiSelectResizeNow?.()
    })
  private readonly selectionBridge: DiagramEditorSelectionBridge = new DiagramEditorSelectionBridge({
    getLf: () => this.lf,
    getCanvasSettings: () => ({ ...this.canvasSettings }),
    isFormatPainterActive: () => this.isFormatPainterActive(),
    resolveClipboardTargets: (nodeIds, edgeIds) => this.resolveClipboardTargets(nodeIds, edgeIds),
    onSelectionPublished: (selection) => this.selectionHandler?.(selection),
    onRefreshGroupFrames: () => this.groupFrames.refreshDisplay(),
    onAfterUserSelectionPublished: () => {
      this.groupFrames.scheduleToBottom()
      this.scheduleMultiSelectOverlayRefresh()
    },
    onAfterSyncFromGraph: () => this.groupFrames.scheduleToBottom(),
    onMaybeInvalidateFormatPainter: () => this.maybeCancelFormatPainterOnSelectionChange(),
    shouldReconcileBoxCollapse: (): boolean => this.boxSelect.shouldReconcileCollapse(),
    getBoxSelectReconcileContext: () => this.boxSelect.getReconcileContext(),
    onFlushMultiSelectOverlay: () => this.multiSelectOverlay.flushNow(),
    onClearBoxSelectSnapshotsIfAllowed: () => {
      if (!this.boxSelect.isInGracePeriod()) {
        this.boxSelect.clearSnapshots()
      }
    }
  })
  private teardownGroupFrameHover: (() => void) | null = null
  private formatPainterState: {
    active: boolean
    kind: DiagramFormatPainterKind
    sourceId: string
    nodeSnapshot?: DiagramNodeStyleSnapshot
    edgeSnapshot?: DiagramEdgeStyleSnapshot
  } | null = null

  mount(el: HTMLElement): void {
    if (this.lf && this.container === el) return
    if (this.lf && this.container && this.container !== el) {
      while (this.container.firstChild) {
        el.appendChild(this.container.firstChild)
      }
      this.container = el
      this.resize()
      return
    }
    if (this.lf) return
    this.container = el
    this.initLogicFlow(el)
  }

  private scheduleGraphChange(): void {
    if (this.graphChangeRaf != null) return
    this.graphChangeRaf = requestAnimationFrame(() => {
      this.graphChangeRaf = null
      this.graphChangeHandler?.()
    })
  }

  private scheduleEmitSelection(): void {
    if (this.selectionEmitRaf != null) {
      cancelAnimationFrame(this.selectionEmitRaf)
    }
    this.selectionEmitRaf = requestAnimationFrame(() => {
      this.selectionEmitRaf = null
      this.selectionBridge.emitSelection()
    })
  }

  /** 单图元缩放结束：仅同步组合框，不吸附中心点（吸附会偏移对角锚定位置） */
  private scheduleResizeFollowUp(nodeId: string): void {
    if (this.resizeSnapTimer) clearTimeout(this.resizeSnapTimer)
    this.resizeSnapTimer = setTimeout(() => {
      this.resizeSnapTimer = null
      if (!this.lf) return
      syncGroupFramesForNodes(this.lf, [nodeId])
      this.refreshMultiSelectResize?.()
      this.multiSelectOverlay.scheduleLayout()
      this.scheduleGraphChange()
    }, 120)
  }

  private scheduleOverlayLayout(layout?: DiagramMultiSelectLayout): void {
    this.multiSelectOverlay.scheduleLayout(layout)
  }

  private scheduleMultiSelectOverlayRefresh(): void {
    this.multiSelectOverlay.scheduleRefresh()
  }

  private initLogicFlow(el: HTMLElement): void {
    this.lf = new LogicFlow({
      container: el,
      grid: { size: DIAGRAM_GRID_SIZE, visible: true, type: 'mesh' },
      // 关闭 LogicFlow 内置强吸附（每帧 round 导致不跟手），改用轻吸附 + 松手对齐
      snapGrid: false,
      snapline: true,
      snaplineEpsilon: 6,
      keyboard: { enabled: false },
      edgeType: 'polyline',
      adjustEdgeStartAndEnd: true,
      multipleSelectKey: 'ctrl',
      stopMoveGraph: true,
      allowResize: true,
      overlapMode: OverlapMode.INCREASE
    })
    registerAllDiagramShapes(this.lf)
    ensureDiagramShapeExtensions().registerExtensionRenderers(this.lf)
    this.applyCanvasSettings(this.canvasSettings)
    this.lf.render({ nodes: [], edges: [] })
    this.applyLogicFlowBackgroundColor(
      this.canvasSettings.backgroundColor || diagramCanvasBackground(this.resolvedTheme)
    )
    this.refreshAxisOverlay()
    this.teardownCanvasEvents = bindDiagramCanvasEvents({
      getLf: () => this.lf!,
      getContainer: () => this.container,
      getCanvasSettings: () => this.canvasSettings,
      getResolvedTheme: () => this.resolvedTheme,
      boxSelect: this.boxSelect,
      viewport: this.viewport,
      groupFrames: this.groupFrames,
      edgeInsert: this.edgeInsert,
      selectionBridge: this.selectionBridge,
      getClickSelectionSnapshot: (e) => this.getClickSelectionSnapshot(e),
      scheduleGraphChange: () => this.scheduleGraphChange(),
      scheduleEmitSelection: () => this.scheduleEmitSelection(),
      scheduleMultiSelectOverlayRefresh: () => this.scheduleMultiSelectOverlayRefresh(),
      scheduleOverlayLayout: () => this.scheduleOverlayLayout(),
      refreshMultiSelectResize: () => this.refreshMultiSelectResize?.(),
      scheduleResizeFollowUp: (nodeId) => this.scheduleResizeFollowUp(nodeId),
      countSelectedNodes: () => this.countSelectedNodes(),
      getSelectedNodeIds: () => this.getSelectedNodeIds(),
      getSelectedContentNodeIds: () => this.getSelectedContentNodeIds(),
      isGroupFrameId: (id) => this.isGroupFrameId(id),
      getFormatPainterState: () => this.formatPainterState,
      cancelFormatPainter: () => this.cancelFormatPainter(),
      applyDefaultEdgeStyle: (id) => this.applyDefaultEdgeStyle(id),
      patchBackgroundDom: (color) => this.patchBackgroundDom(color),
      onViewportChange: () => this.viewportChangeHandler?.(),
      onFormatPainterNodeApplied: (nodeId) => {
        syncGroupFramesForNodes(this.lf!, [nodeId])
        this.groupFrames.refreshDisplay()
      }
    })
    this.boxSelect.enableBoxSelection()
    const viewportPorts = {
      getLf: () => this.lf,
      onViewportChange: () => this.viewportChangeHandler?.(),
      onMiddlePanActiveChange: (active: boolean) => this.boxSelect.setPaused(active),
      centerContent: () => this.centerContent()
    }
    this.teardownMiddlePan = this.viewport.bindMiddleMousePan(el, viewportPorts)
    this.teardownShiftWheelPan = this.viewport.bindShiftWheelPan(el, viewportPorts)
    this.teardownContextMenu = this.bindContextMenu(el)
    this.teardownGroupFrameHover = this.groupFrames.bindPointerHover(el)
    this.teardownSelectionSnapshot = this.selectionPointerCapture.bind(el)
    this.teardownSelectionPointerSync = this.bindSelectionPointerSync(el)
    this.teardownBoxSelectRubberGuard = this.boxSelect.bindRubberBandGuard(el)
    const multiSelectResize = mountDiagramMultiSelectResize(
      this.lf,
      () => {
        this.groupFrames.syncForNodeIds(this.getSelectedContentNodeIds())
        this.scheduleGraphChange()
        this.selectionBridge.publishFromLiveGraph()
      },
      (layout) => {
        this.multiSelectOverlay.syncDomFlags(layout.nodeCount)
        this.multiSelectOverlay.flushLayout(layout)
      },
      () => this.groupFrames.scheduleSyncDuringDrag(),
      el
    )
    this.teardownMultiSelectResize = multiSelectResize.destroy
    this.refreshMultiSelectResize = multiSelectResize.refresh
    this.refreshMultiSelectResizeNow = multiSelectResize.refreshNow
  }

  private cancelPendingSelectionSync(): void {
    this.selectionBridge.cancelPendingSync()
    if (this.selectionEmitRaf != null) {
      cancelAnimationFrame(this.selectionEmitRaf)
      this.selectionEmitRaf = null
    }
  }

  private bindSelectionPointerSync(el: HTMLElement): () => void {
    return this.selectionBridge.bindPointerUpSync(el, {
      shouldSkip: () => !this.lf || this.boxSelect.shouldSkipPointerSync(),
      isMiddlePanning: () => this.viewport.isMiddlePanning()
    })
  }

  private applyLogicFlowBackgroundColor(color: string): void {
    if (!this.lf) return
    // LF 主题用 background 简写，仅传 backgroundColor 时边缘会露出主题默认色（#FBFCFE / #33353A）
    this.lf.graphModel.updateBackgroundOptions({ background: color, backgroundColor: color })
    this.patchBackgroundDom(color)
  }

  /** 直接写 DOM，覆盖 LF setTheme 写入的内联 background */
  private patchBackgroundDom(color: string): void {
    const root = this.container
    if (!root) return
    const apply = (el: HTMLElement) => {
      el.style.setProperty('background', color, 'important')
      el.style.setProperty('background-color', color, 'important')
      el.style.setProperty('border', 'none', 'important')
      el.style.setProperty('outline', 'none', 'important')
      el.style.setProperty('box-shadow', 'none', 'important')
    }
    apply(root)
    root.querySelectorAll<HTMLElement>('.lf-background-area, .lf-graph, .lf-grid, .lf-background').forEach(apply)
  }

  /** 点击修饰键点选时使用的「点击前」选区快照 */
  private getClickSelectionSnapshot(e?: MouseEvent | PointerEvent | null): string[] {
    return this.selectionPointerCapture.getClickSelectionSnapshot(
      e,
      this.selectionBridge.getLastSelectedNodeIds()
    )
  }

  /** 格式刷仅支持单图元或单连线；多选时自动关闭 */
  private maybeCancelFormatPainterOnSelectionChange(): void {
    if (!this.formatPainterState?.active) return
    const nodeCount = this.countSelectedNodes()
    const edgeCount = this.getSelectedEdgeIds().length
    const singleNode = nodeCount === 1 && edgeCount === 0
    const singleEdge = nodeCount === 0 && edgeCount === 1
    if (!singleNode && !singleEdge) {
      this.formatPainterState = null
      this.syncFormatPainterCursor()
    }
  }

  private getSelectedContentNodeIds(): string[] {
    return this.getSelectedNodeIds().filter((id) => !this.isGroupFrameId(id))
  }

  /** 命令或批量变更结束后强制同步并推送选区（组合/拆组等） */
  notifyEditorSelection(): void {
    this.cancelPendingSelectionSync()
    this.selectionBridge.notifyEditorSelection()
  }

  onEditorSelectionChange(handler: (selection: DiagramEditorSelection) => void): void {
    this.selectionHandler = handler
  }

  onGraphChange(handler: () => void): void {
    this.graphChangeHandler = handler
  }

  onViewportChange(handler: () => void): void {
    this.viewportChangeHandler = handler
  }

  onOverlayLayoutChange(handler: (layout: DiagramMultiSelectLayout) => void): void {
    this.overlayLayoutHandler = handler
  }

  getMultiSelectOverlayRect(): {
    left: number
    top: number
    width: number
    height: number
  } | null {
    if (!this.lf) return null
    return getMultiSelectOverlayRect(this.lf)
  }

  onContextMenu(
    handler: (detail: {
      event: MouseEvent
      kind: 'node' | 'edge' | 'blank'
      targetId?: string
      nodeIds: string[]
      edgeIds: string[]
    }) => void
  ): void {
    this.contextMenuHandler = handler
  }

  focusCanvas(): void {
    this.container?.focus({ preventScroll: true })
  }

  private pickElementFromDom(target: EventTarget | null): {
    kind: 'node' | 'edge'
    targetId: string
  } | null {
    if (!this.lf) return null
    const el = target as Element | null
    const group = el?.closest?.('g[id]') as SVGGElement | null
    const id = group?.id
    if (!id) return null
    if (this.lf.getNodeModelById(id)) return { kind: 'node', targetId: id }
    if (this.lf.getEdgeModelById(id)) return { kind: 'edge', targetId: id }
    return null
  }

  private pickElementAt(clientX: number, clientY: number): {
    kind: 'node' | 'edge' | 'blank'
    targetId?: string
  } {
    if (!this.lf) return { kind: 'blank' }
    const { x, y } = this.clientToCanvas(clientX, clientY)
    const contentNodes = this.lf.graphModel.nodes.filter(
      (model) => model.type !== DIAGRAM_GROUP_FRAME_TYPE
    )
    for (const model of [...contentNodes].reverse()) {
      const halfW = model.width / 2
      const halfH = model.height / 2
      if (x >= model.x - halfW && x <= model.x + halfW && y >= model.y - halfH && y <= model.y + halfH) {
        return { kind: 'node', targetId: model.id }
      }
    }
    const groupFrames = this.lf.graphModel.nodes.filter(
      (model) => model.type === DIAGRAM_GROUP_FRAME_TYPE
    )
    for (const model of [...groupFrames].reverse()) {
      const halfW = model.width / 2
      const halfH = model.height / 2
      if (x >= model.x - halfW && x <= model.x + halfW && y >= model.y - halfH && y <= model.y + halfH) {
        return { kind: 'node', targetId: model.id }
      }
    }
    const edges = [...this.lf.graphModel.edges].reverse()
    for (const model of edges) {
      if (this.isPointNearEdge(model, x, y)) {
        return { kind: 'edge', targetId: model.id }
      }
    }
    return { kind: 'blank' }
  }

  private isPointNearEdge(
    model: { pointsList?: Array<{ x: number; y: number }> },
    x: number,
    y: number,
    threshold = 8
  ): boolean {
    return isPointNearEdgePolyline(model.pointsList, x, y, threshold)
  }

  private applyContextMenuSelection(
    picked: { kind: 'node' | 'edge'; targetId: string },
    event: MouseEvent
  ): void {
    if (!this.lf) return
    this.boxSelect.restoreCollapsedBoxSelection()
    const live = this.selectionBridge.collectLiveSelectedIds()
    const nodeIds = live.nodeIds
    const edgeIds = live.edgeIds
    const totalSelected = nodeIds.length + edgeIds.length
    const alreadySelected =
      picked.kind === 'node'
        ? nodeIds.includes(picked.targetId)
        : edgeIds.includes(picked.targetId)
    const append = Boolean(event.ctrlKey || event.metaKey || event.shiftKey)

    // 多选时右键已选图元/连线：保持选区，与左键行为一致
    if (totalSelected > 1 && alreadySelected && !append) return

    if (append && alreadySelected) {
      this.lf.deselectElementById(picked.targetId)
      return
    }

    if (!append) {
      this.lf.clearSelectElements()
    }
    this.lf.selectElementById(picked.targetId, append && totalSelected > 0)
  }

  private bindContextMenu(el: HTMLElement): () => void {
    const onContextMenu = (event: MouseEvent) => {
      if (!this.lf || !this.contextMenuHandler) return
      event.preventDefault()
      event.stopPropagation()
      this.cancelFormatPainter()
      this.boxSelect.restoreCollapsedBoxSelection()
      const domPick = this.pickElementFromDom(event.target)
      const picked = domPick ?? this.pickElementAt(event.clientX, event.clientY)
      if ((picked.kind === 'node' || picked.kind === 'edge') && picked.targetId) {
        this.applyContextMenuSelection(
          { kind: picked.kind, targetId: picked.targetId },
          event
        )
      } else if (picked.kind === 'blank') {
        // 保留框选/多选结果；仅空白且无选中时清空
        const live = this.selectionBridge.collectLiveSelectedIds()
        if (!live.nodeIds.length && !live.edgeIds.length) {
          this.lf.clearSelectElements()
        }
      }
      this.selectionBridge.syncFromGraph()
      const live = this.selectionBridge.collectLiveSelectedIds()
      this.contextMenuHandler({
        event,
        kind: picked.kind,
        targetId: picked.targetId,
        nodeIds: live.nodeIds,
        edgeIds: live.edgeIds
      })
    }
    el.addEventListener('contextmenu', onContextMenu, true)
    return () => el.removeEventListener('contextmenu', onContextMenu, true)
  }

  getSelectedNodeIds(): string[] {
    return this.selectionBridge.collectLiveSelectedIds().nodeIds
  }

  getSelectedEdgeIds(): string[] {
    return this.selectionBridge.collectLiveSelectedIds().edgeIds
  }

  hasClipboard(): boolean {
    const clip = (this as { _clipboard?: { nodes?: unknown[]; edges?: unknown[] } })._clipboard
    return Boolean(clip?.nodes?.length || clip?.edges?.length)
  }

  private isGroupFrameId(nodeId: string): boolean {
    return this.lf?.getNodeModelById(nodeId)?.type === DIAGRAM_GROUP_FRAME_TYPE
  }

  private countSelectedNodes(): number {
    if (!this.lf) return 0
    const fromOverlay = countSelectedDiagramNodes(this.lf.graphModel, this.lf)
    if (fromOverlay > 0) return fromOverlay
    const ids = this.getSelectedNodeIds()
    const content = this.lf ? filterAlignableNodeIds(this.lf, ids) : []
    if (content.length) return content.length
    return ids.some((id) => this.isGroupFrameId(id)) ? 1 : 0
  }

  private readNodeBounds(nodeId: string): DiagramNodeBounds | null {
    const model = this.lf?.getNodeModelById(nodeId)
    if (!model) return null
    return {
      id: nodeId,
      x: model.x,
      y: model.y,
      width: model.width,
      height: model.height
    }
  }

  alignNodes(mode: DiagramAlignMode, nodeIds?: string[]): void {
    const ids = filterAlignableNodeIds(this.lf!, nodeIds?.length ? nodeIds : this.getSelectedNodeIds())
    if (ids.length < 2) return
    const bounds = ids.map((id) => this.readNodeBounds(id)).filter(Boolean) as DiagramNodeBounds[]
    const patches = alignNodePositions(bounds, mode)
    this.applyNodePositionPatches(patches)
  }

  distributeNodes(mode: DiagramDistributeMode, nodeIds?: string[]): void {
    const ids = filterAlignableNodeIds(this.lf!, nodeIds?.length ? nodeIds : this.getSelectedNodeIds())
    if (ids.length < 3) return
    const bounds = ids.map((id) => this.readNodeBounds(id)).filter(Boolean) as DiagramNodeBounds[]
    const patches = distributeNodePositions(bounds, mode)
    this.applyNodePositionPatches(patches)
  }

  nudgeSelection(dx: number, dy: number, nodeIds?: string[]): void {
    if (!this.lf || (dx === 0 && dy === 0)) return
    const selected = nodeIds?.length ? nodeIds : this.getSelectedNodeIds()
    if (!selected.length) return

    const toMove: string[] = []
    const seen = new Set<string>()
    const add = (id: string) => {
      if (seen.has(id) || !this.lf!.getNodeModelById(id)) return
      seen.add(id)
      toMove.push(id)
    }

    for (const id of selected) {
      const model = this.lf.getNodeModelById(id)
      if (!model) continue

      if (model.type === DIAGRAM_GROUP_FRAME_TYPE) {
        add(id)
        for (const memberId of (model.properties?.dgGroupMembers as string[] | undefined) ?? []) {
          add(memberId)
        }
        continue
      }

      const inSelectedGroup = selected.some((groupId) => {
        const group = this.lf!.getNodeModelById(groupId)
        if (group?.type !== DIAGRAM_GROUP_FRAME_TYPE) return false
        return ((group.properties?.dgGroupMembers as string[] | undefined) ?? []).includes(id)
      })
      if (!inSelectedGroup) add(id)
    }

    if (!toMove.length) return
    this.lf.graphModel.moveNodes(toMove, dx, dy, true)
    this.groupFrames.syncForNodeIds(toMove.filter((id) => !this.isGroupFrameId(id)))
    this.scheduleGraphChange()
    this.selectionBridge.syncFromGraph()
    this.refreshMultiSelectResize?.()
    this.scheduleOverlayLayout()
  }

  bringNodesToFront(nodeIds?: string[]): void {
    if (!this.lf) return
    const ids = (nodeIds?.length ? nodeIds : this.getSelectedNodeIds()).filter((id) =>
      Boolean(this.lf!.getNodeModelById(id))
    )
    if (!ids.length) return
    let maxZ = this.getGraphZIndexBounds().max
    for (const id of ids) {
      maxZ += 1
      this.lf.setElementZIndex(id, maxZ)
    }
    ensureAllGroupFramesAtBottom(this.lf)
    this.scheduleGraphChange()
  }

  sendNodesToBack(nodeIds?: string[]): void {
    if (!this.lf) return
    const ids = (nodeIds?.length ? nodeIds : this.getSelectedNodeIds()).filter((id) =>
      Boolean(this.lf!.getNodeModelById(id))
    )
    if (!ids.length) return
    let minZ = this.getGraphZIndexBounds().min
    for (let i = ids.length - 1; i >= 0; i--) {
      minZ -= 1
      this.lf.setElementZIndex(ids[i], minZ)
    }
    ensureAllGroupFramesAtBottom(this.lf)
    this.scheduleGraphChange()
  }

  /** 取画布上全部图元（节点 + 边）的 zIndex 范围，用于显式层级调整 */
  private getGraphZIndexBounds(): { min: number; max: number } {
    if (!this.lf) return { min: 0, max: 0 }
    const elements = [...this.lf.graphModel.nodes, ...this.lf.graphModel.edges]
    if (!elements.length) return { min: 0, max: 0 }
    const indexes = elements.map((element) => element.zIndex)
    return { min: Math.min(...indexes), max: Math.max(...indexes) }
  }

  private applyNodePositionPatches(patches: Array<{ id: string; x: number; y: number }>): void {
    if (!this.lf || !patches.length) return
    const snap = this.canvasSettings.snapGrid
    for (const patch of patches) {
      const model = this.lf.getNodeModelById(patch.id)
      if (!model) continue
      let { x, y } = patch
      if (snap) {
        x = snapCoordinateToGrid(x)
        y = snapCoordinateToGrid(y)
      }
      const dx = x - model.x
      const dy = y - model.y
      if (dx !== 0 || dy !== 0) {
        this.lf.graphModel.moveNode(patch.id, dx, dy, true)
      }
    }
    this.groupFrames.syncForNodeIds(patches.map((p) => p.id))
    this.scheduleGraphChange()
    this.selectionBridge.syncFromGraph()
    this.refreshMultiSelectResize?.()
    this.scheduleOverlayLayout()
  }

  getSelection(): DiagramEditorSelection {
    return this.selectionBridge.getSelection()
  }

  private applyDefaultEdgeStyle(edgeId: string): void {
    if (!this.lf) return
    const model = this.lf.getEdgeModelById(edgeId)
    if (!model) return
    const props = (model.properties ?? {}) as Record<string, unknown>
    const style = (props.style ?? {}) as Record<string, unknown>
    if (
      style.stroke != null ||
      style.strokeWidth != null ||
      style.strokeDasharray != null ||
      props.stroke != null ||
      props.strokeWidth != null
    ) {
      return
    }
    const d = this.canvasSettings.defaultEdge
    applyEdgeProperties(this.lf, {
      id: edgeId,
      type: d.type,
      stroke: d.stroke,
      strokeWidth: d.strokeWidth,
      strokeDasharray: d.strokeDasharray,
      startArrowType: d.startArrowType,
      endArrowType: d.endArrowType
    })
  }

  batchUpdateNodeProperties(
    nodeProps: Partial<DiagramNodeProperties>,
    nodeIds?: string[]
  ): void {
    if (!this.lf) return
    const ids = filterAlignableNodeIds(this.lf!, nodeIds?.length ? nodeIds : this.getSelectedNodeIds())
    for (const id of ids) {
      applyNodeProperties(this.lf, { id, ...nodeProps })
    }
    syncGroupFramesForNodes(this.lf, ids)
    this.scheduleGraphChange()
    this.selectionBridge.emitSelection()
  }

  batchUpdateEdgeProperties(
    edgeProps: Partial<DiagramEdgeProperties>,
    edgeIds?: string[]
  ): void {
    if (!this.lf) return
    const ids = edgeIds?.length ? edgeIds : this.getSelectedEdgeIds()
    for (const id of ids) {
      applyEdgeProperties(this.lf, { id, ...edgeProps })
    }
    this.scheduleGraphChange()
    this.selectionBridge.emitSelection()
  }

  clientToCanvas(clientX: number, clientY: number): { x: number; y: number } {
    if (!this.lf) return { x: 0, y: 0 }
    const point = this.lf.getPointByClient({ x: clientX, y: clientY })
    return point.canvasOverlayPosition
  }

  /** 画布落点坐标，开启吸附时对齐网格 */
  canvasDropPoint(clientX: number, clientY: number): { x: number; y: number } {
    const point = this.clientToCanvas(clientX, clientY)
    return snapCanvasPoint(point.x, point.y, this.canvasSettings.snapGrid)
  }

  /** 拖放预览点（容器内坐标），开启吸附时对齐网格 */
  dropIndicatorPosition(
    clientX: number,
    clientY: number
  ): { x: number; y: number; snapped: boolean } {
    if (!this.lf) return { x: 0, y: 0, snapped: false }
    const point = this.lf.getPointByClient({ x: clientX, y: clientY })
    const canvas = point.canvasOverlayPosition
    const dom = point.domOverlayPosition
    if (!this.canvasSettings.snapGrid) {
      return { x: dom.x, y: dom.y, snapped: false }
    }
    const snapped = snapCanvasPoint(canvas.x, canvas.y, true)
    const scale = this.lf.getTransform().SCALE_X
    return {
      x: dom.x + (snapped.x - canvas.x) * scale,
      y: dom.y + (snapped.y - canvas.y) * scale,
      snapped: snapped.x !== canvas.x || snapped.y !== canvas.y
    }
  }

  isFormatPainterActive(): boolean {
    return Boolean(this.formatPainterState?.active)
  }

  startFormatPainter(): boolean {
    if (!this.lf) return false
    const nodeIds = this.getSelectedNodeIds()
    const edgeIds = this.getSelectedEdgeIds()
    const nodeCount = this.countSelectedNodes()
    const edgeCount = edgeIds.length

    if (nodeCount === 1 && edgeCount === 0) {
      const nodeId = this.selectionBridge.getPrimaryNodeId() ?? nodeIds[0]
      if (!nodeId) return false
      const snapshot = readNodeStyleSnapshot(this.lf, nodeId)
      if (!snapshot) return false
      this.formatPainterState = {
        active: true,
        kind: 'node',
        sourceId: nodeId,
        nodeSnapshot: snapshot
      }
      this.syncFormatPainterCursor()
      this.selectionBridge.emitSelection()
      return true
    }

    if (edgeCount === 1 && nodeCount === 0) {
      const edgeId = edgeIds[0]
      const snapshot = readEdgeStyleSnapshot(this.lf, edgeId)
      if (!snapshot) return false
      this.formatPainterState = {
        active: true,
        kind: 'edge',
        sourceId: edgeId,
        edgeSnapshot: snapshot
      }
      this.syncFormatPainterCursor()
      this.selectionBridge.emitSelection()
      return true
    }

    return false
  }

  cancelFormatPainter(): void {
    if (!this.formatPainterState?.active) return
    this.formatPainterState = null
    this.syncFormatPainterCursor()
    this.selectionBridge.emitSelection()
  }

  clearSelectionStyles(): void {
    if (!this.lf) return
    const nodeIds = this.getSelectedNodeIds()
    const edgeIds = this.getSelectedEdgeIds()
    for (const id of nodeIds) {
      clearNodeStyle(this.lf, id, this.resolvedTheme)
    }
    if (nodeIds.length) {
      syncGroupFramesForNodes(this.lf, nodeIds)
    }
    for (const id of edgeIds) {
      clearEdgeStyle(this.lf, id, this.resolvedTheme)
    }
    this.groupFrames.refreshDisplay()
    this.scheduleGraphChange()
    this.selectionBridge.emitSelection()
  }

  private getCanvasFrameEl(): HTMLElement | null {
    return this.container?.closest('.dg-canvas-frame') ?? null
  }

  private syncFormatPainterCursor(): void {
    const frame = this.getCanvasFrameEl()
    if (!frame) return
    frame.classList.toggle('dg-canvas-frame--format-painter', this.isFormatPainterActive())
    frame.classList.remove('dg-canvas-frame--format-painter-blocked')
  }

  private updateFormatPainterCursor(clientX: number, clientY: number): void {
    const frame = this.getCanvasFrameEl()
    if (!frame) return
    if (!this.formatPainterState?.active) {
      frame.classList.remove('dg-canvas-frame--format-painter', 'dg-canvas-frame--format-painter-blocked')
      return
    }
    frame.classList.add('dg-canvas-frame--format-painter')
    if (clientX === 0 && clientY === 0) {
      frame.classList.remove('dg-canvas-frame--format-painter-blocked')
      return
    }
    const picked = this.pickElementAt(clientX, clientY)
    const blocked =
      (this.formatPainterState.kind === 'node' && picked.kind === 'edge') ||
      (this.formatPainterState.kind === 'edge' && picked.kind === 'node')
    frame.classList.toggle('dg-canvas-frame--format-painter-blocked', blocked)
  }

  destroy(): void {
    this.cancelFormatPainter()
    this.edgeInsert.dispose()
    this.groupFrames.dispose()
    this.hideMiniMap()
    this.teardownMiddlePan?.()
    this.teardownMiddlePan = null
    this.teardownShiftWheelPan?.()
    this.teardownShiftWheelPan = null
    this.teardownSelectionSnapshot?.()
    this.teardownSelectionSnapshot = null
    this.teardownSelectionPointerSync?.()
    this.teardownSelectionPointerSync = null
    this.teardownBoxSelectRubberGuard?.()
    this.teardownBoxSelectRubberGuard = null
    this.teardownCanvasEvents?.()
    this.teardownCanvasEvents = null
    this.multiSelectOverlay.dispose()
    this.selectionBridge.cancelPendingSync()
    this.teardownContextMenu?.()
    this.teardownContextMenu = null
    this.teardownGroupFrameHover?.()
    this.teardownGroupFrameHover = null
    clearGroupFramePointerInside()
    this.contextMenuHandler = null
    this.teardownAxis?.()
    this.teardownAxis = null
    this.teardownMultiSelectResize?.()
    this.teardownMultiSelectResize = null
    this.refreshMultiSelectResize = null
    this.refreshMultiSelectResizeNow = null
    this.overlayLayoutHandler = null
    this.lf?.destroy()
    this.lf = null
    this.container = null
    this.selectionHandler = null
    this.graphChangeHandler = null
    if (this.graphChangeRaf != null) {
      cancelAnimationFrame(this.graphChangeRaf)
      this.graphChangeRaf = null
    }
    if (this.selectionEmitRaf != null) {
      cancelAnimationFrame(this.selectionEmitRaf)
      this.selectionEmitRaf = null
    }
    if (this.resizeSnapTimer) {
      clearTimeout(this.resizeSnapTimer)
      this.resizeSnapTimer = null
    }
    this.viewportChangeHandler = null
    this.selectionBridge.setPrimarySelection(null, null)
    delete (this as { _clipboard?: unknown })._clipboard
  }

  loadGraph(data: unknown): void {
    const graph = normalizeGraph(data)
    const registry = ensureDiagramShapeExtensions()
    const rawNodes = (graph.nodes ?? []) as Array<Record<string, unknown>>
    if (rawNodes.length) {
      graph.nodes = registry.migrateLegacyNodes(rawNodes as never)
    }
    this.lf?.render(graph as never)
    this.reapplyLoadedGraphStyles(graph)
    this.syncShapeExtensionsAfterLoad(graph)
    this.refreshAxisOverlay()
    this.refreshMultiSelectResize?.()
    this.selectionBridge.setPrimarySelection(null, null)
    this.selectionBridge.emitSelection()
    requestAnimationFrame(() => this.resize())
    ensureAllGroupFramesAtBottom(this.lf!)
  }

  /** 加载后为带 dgShape 的节点同步布局与文本 */
  private syncShapeExtensionsAfterLoad(sourceGraph?: { nodes?: unknown[] }): void {
    if (!this.lf) return
    const rawNodes = (sourceGraph?.nodes ?? []) as Array<{
      id: string
      properties?: Record<string, unknown>
    }>
    for (const raw of rawNodes) {
      if (!isDiagramShapePayloadEnvelope(raw.properties?.dgShape)) continue
      syncShapeExtensionNodeAfterLoad(this.lf, raw.id)
    }
  }

  private reapplyLoadedGraphStyles(sourceGraph?: { nodes?: unknown[]; edges?: unknown[] }): void {
    if (!this.lf) return
    const rawNodes = (sourceGraph?.nodes ?? []) as Array<{
      id: string
      width?: number
      height?: number
      properties?: Record<string, unknown>
    }>
    for (const raw of rawNodes) {
      const props = raw.properties ?? {}
      const normalized = normalizeNodeStyleProperties(props)
      if (JSON.stringify(normalized) !== JSON.stringify(props)) {
        this.lf.setProperties(raw.id, normalized)
      }
    }
    const rawEdges = (sourceGraph?.edges ?? []) as Array<{
      id: string
      properties?: Record<string, unknown>
    }>
    for (const raw of rawEdges) {
      const props = raw.properties ?? {}
      const normalized = normalizeEdgeStyleProperties(props)
      if (JSON.stringify(normalized) !== JSON.stringify(props)) {
        this.lf.setProperties(raw.id, normalized)
      }
    }
    for (const raw of rawNodes) {
      const model = this.lf.getNodeModelById(raw.id)
      if (!model) continue
      const props = raw.properties ?? {}
      const nodeSize = props.nodeSize as Record<string, unknown> | undefined
      const rx = Number(nodeSize?.rx ?? props.rx)
      const ry = Number(nodeSize?.ry ?? props.ry)
      if (Number.isFinite(rx) && rx > 0 && Number.isFinite(ry) && ry > 0) {
        applyNodeDimensions(
          model as Parameters<typeof applyNodeDimensions>[0],
          Math.round(rx * 2),
          Math.round(ry * 2)
        )
      } else {
        const w = Number(raw.width ?? props.width ?? nodeSize?.width)
        const h = Number(raw.height ?? props.height ?? nodeSize?.height)
        if (Number.isFinite(w) && w > 0 && Number.isFinite(h) && h > 0) {
          applyNodeDimensions(
            model as Parameters<typeof applyNodeDimensions>[0],
            Math.round(w),
            Math.round(h)
          )
        }
      }
      const readProps = readNodeProperties(this.lf, raw.id)
      if (readProps) applyNodeProperties(this.lf, readProps)
    }
    const edges = (sourceGraph?.edges ?? []) as Array<{ id: string }>
    for (const edge of edges) {
      const props = readEdgeProperties(this.lf, edge.id)
      if (props) applyEdgeProperties(this.lf, props)
    }
  }

  getGraph(): unknown {
    return this.lf?.getGraphData() ?? { nodes: [], edges: [] }
  }

  applyPatch(patch: CanvasGraphPatch): void {
    if (!this.lf) return
    for (const node of patch.addNodes ?? []) {
      this.lf.addNode(node as never)
    }
    for (const item of patch.updateNodes ?? []) {
      const dgShape = item.patch.dgShape
      if (isDiagramShapePayloadEnvelope(dgShape)) {
        patchNodeDgShape(this.lf, item.id, dgShape as DiagramShapePayloadEnvelope)
        const { dgShape: _dgShape, ...rest } = item.patch
        if (Object.keys(rest).length > 0) {
          this.lf.setProperties(item.id, rest)
        }
      } else {
        this.lf.setProperties(item.id, item.patch)
      }
    }
    for (const id of patch.deleteNodeIds ?? []) {
      this.lf.deleteNode(id)
    }
    for (const edge of patch.addEdges ?? []) {
      this.lf.addEdge(edge as never)
    }
    for (const item of patch.updateEdges ?? []) {
      const edge = this.lf.getEdgeModelById(item.id)
      if (edge) Object.assign(edge, item.patch)
    }
    for (const id of patch.deleteEdgeIds ?? []) {
      this.lf.deleteEdge(id)
    }
  }

  setTheme(resolved: 'light' | 'dark'): void {
    this.resolvedTheme = resolved
    setDiagramEdgeAccent(resolved)
    const preset = this.canvasSettings.themePreset
    if (preset === 'classic-light' || preset === 'classic-dark') {
      this.canvasSettings = {
        ...this.canvasSettings,
        themePreset: resolved === 'dark' ? 'classic-dark' : 'classic-light',
        backgroundColor: diagramCanvasBackground(resolved)
      }
    }
    this.applyTheme()
    this.refreshAxisOverlay()
    this.refreshMultiSelectResize?.()
  }

  private applyTheme(): void {
    if (!this.lf) return
    const preset = this.canvasSettings.themePreset
    const resolved = resolveThemeFromPreset(preset, this.resolvedTheme)
    const theme = logicFlowThemeForPreset(preset, resolved)
    this.lf.setTheme(theme as never, resolved === 'dark' ? 'dark' : 'default')

    const bg = this.canvasSettings.backgroundColor || backgroundForPreset(preset, resolved)
    this.applyLogicFlowBackgroundColor(bg)
    this.refreshEdgeLabelViews()
  }

  /** 主题切换后 LogicFlow 不会自动重绘连线标签，需触发刷新 */
  private refreshEdgeLabelViews(): void {
    if (!this.lf) return
    for (const edge of this.lf.graphModel.edges) {
      const value = typeof edge.text === 'object' && edge.text && 'value' in edge.text
        ? String((edge.text as { value?: string }).value ?? '')
        : ''
      if (value) edge.updateText(value)
    }
  }

  getCanvasSettings(): DiagramCanvasSettings {
    return { ...this.canvasSettings }
  }

  loadCanvasSettings(settings: DiagramCanvasSettings | undefined): void {
    const base = defaultCanvasSettings(this.resolvedTheme)
    if (settings) {
      this.canvasSettings = {
        ...base,
        ...settings,
        defaultEdge: { ...base.defaultEdge, ...(settings.defaultEdge ?? {}) }
      }
    }
    if (this.lf) {
      this.applyCanvasSettings(this.canvasSettings)
    }
  }

  applyCanvasSettings(settings: Partial<DiagramCanvasSettings>): void {
    const nextDefaultEdge = settings.defaultEdge
      ? { ...this.canvasSettings.defaultEdge, ...settings.defaultEdge }
      : this.canvasSettings.defaultEdge
    this.canvasSettings = { ...this.canvasSettings, ...settings, defaultEdge: nextDefaultEdge }
    if (!this.lf) return

    const { gridVisible, backgroundColor, miniMapVisible, themePreset } = this.canvasSettings

    // snapGrid 由本适配器处理：拖拽轻吸附 + 松手对齐，不交给 LogicFlow 全程强吸附
    this.lf.updateEditConfig({ snapGrid: false })
    if (!this.canvasSettings.snapGrid) {
      this.lf.removeNodeSnapLine()
    }
    const theme = this.lf.getTheme()
    this.lf.setTheme({
      ...theme,
      grid: { ...(theme.grid as object), visible: gridVisible }
    })

    if (themePreset) {
      this.applyTheme()
    } else if (backgroundColor) {
      this.applyLogicFlowBackgroundColor(backgroundColor)
    }

    if (miniMapVisible) this.showMiniMap()
    else this.hideMiniMap()

    if (settings.themePreset) {
      this.refreshAxisOverlay()
      this.refreshMultiSelectResize?.()
    }

    this.selectionBridge.emitSelection()
  }

  private showMiniMap(): void {
    const ext = this.lf?.extension?.miniMap as
      | { show?: () => void; isShow?: boolean; setShowEdge?: (show: boolean) => void }
      | undefined
    ext?.setShowEdge?.(true)
    if (ext?.show && !ext.isShow) {
      ext.show()
    }
  }

  private hideMiniMap(): void {
    const ext = this.lf?.extension?.miniMap as { hide?: () => void } | undefined
    ext?.hide?.()
  }

  updateNodeProperties(props: Partial<DiagramNodeProperties> & { id: string }): void {
    if (!this.lf) return
    const affectsLayout =
      props.x != null || props.y != null || props.width != null || props.height != null
    applyNodeProperties(this.lf, props)
    if (affectsLayout) {
      syncGroupFramesForNodes(this.lf, [props.id])
      this.refreshMultiSelectResize?.()
      this.scheduleOverlayLayout()
    }
    this.scheduleGraphChange()
    this.refreshSelectionIfNodeInSelection(props.id)
  }

  updateEdgeProperties(props: Partial<DiagramEdgeProperties> & { id: string }): void {
    if (!this.lf) return
    applyEdgeProperties(this.lf, props)
    this.scheduleGraphChange()
    const live = this.selectionBridge.readLiveSelection()
    if (live.selectedEdgeIds.includes(props.id)) {
      this.selectionBridge.publishFromLiveGraph()
    }
  }

  private refreshAxisOverlay(): void {
    this.teardownAxis?.()
    this.teardownAxis = null
    // 坐标轴在视口边缘会形成类似「画布边框」的十字线，默认不绘制
  }

  async exportPng(): Promise<Blob> {
    await ensureSnapshotPlugin()
    const lf = this.lf
    if (!lf) throw new Error('画布未挂载')
    if (!lf.extension.snapshot) throw new Error('快照插件未就绪')
    const ext = lf.extension.snapshot as unknown as {
      getSnapshot: (name?: string, opts?: { fileType?: string; backgroundColor?: string }) => Promise<string>
    }
    const dataUrl = await ext.getSnapshot('diagram', {
      fileType: 'png',
      backgroundColor: this.canvasSettings.backgroundColor || diagramCanvasBackground(this.resolvedTheme)
    })
    const res = await fetch(dataUrl)
    return res.blob()
  }

  async exportSvg(): Promise<string> {
    await ensureSnapshotPlugin()
    const lf = this.lf
    if (!lf) throw new Error('画布未挂载')
    if (!lf.extension.snapshot) throw new Error('快照插件未就绪')
    const ext = lf.extension.snapshot as unknown as {
      getSnapshot: (name?: string, opts?: { fileType?: string }) => Promise<string>
    }
    return ext.getSnapshot('diagram', { fileType: 'svg' })
  }

  undo(): void {
    this.lf?.undo()
  }

  redo(): void {
    this.lf?.redo()
  }

  zoom(delta?: number, scale?: number): void {
    if (!this.lf) return
    if (typeof scale === 'number') {
      this.lf.zoom(scale)
    } else {
      const d = delta ?? 0.1
      const current = this.lf.getTransform().SCALE_X
      this.lf.zoom(current + d)
    }
    this.viewportChangeHandler?.()
  }

  zoomToFit(): void {
    this.lf?.fitView()
    this.viewportChangeHandler?.()
  }

  zoomReset(): void {
    this.lf?.resetZoom()
    this.viewportChangeHandler?.()
  }

  centerContent(): void {
    if (!this.lf) return

    let minX = Infinity
    let maxX = -Infinity
    let minY = Infinity
    let maxY = -Infinity

    for (const model of this.lf.graphModel.nodes) {
      minX = Math.min(minX, model.x - model.width / 2)
      maxX = Math.max(maxX, model.x + model.width / 2)
      minY = Math.min(minY, model.y - model.height / 2)
      maxY = Math.max(maxY, model.y + model.height / 2)
    }
    for (const edge of this.lf.graphModel.edges) {
      for (const pt of edge.pointsList ?? []) {
        minX = Math.min(minX, pt.x)
        maxX = Math.max(maxX, pt.x)
        minY = Math.min(minY, pt.y)
        maxY = Math.max(maxY, pt.y)
      }
    }

    if (!Number.isFinite(minX)) {
      this.centerOrigin()
      return
    }

    this.lf.focusOn({
      x: (minX + maxX) / 2,
      y: (minY + maxY) / 2
    })
    this.viewportChangeHandler?.()
  }

  centerOrigin(): void {
    if (!this.lf) return
    this.lf.focusOn({ x: 0, y: 0 })
    this.viewportChangeHandler?.()
  }

  resize(): void {
    if (!this.lf || !this.container) return
    let { clientWidth, clientHeight } = this.container
    if (clientWidth <= 0 || clientHeight <= 0) {
      const parent = this.container.parentElement
      if (parent) {
        clientWidth = parent.clientWidth
        clientHeight = parent.clientHeight
      }
    }
    if (clientWidth > 0 && clientHeight > 0) {
      this.lf.resize(clientWidth, clientHeight)
    }
    const bg =
      this.canvasSettings.backgroundColor ||
      backgroundForPreset(this.canvasSettings.themePreset, this.resolvedTheme)
    this.patchBackgroundDom(bg)
  }

  getViewport(): DiagramViewport {
    if (!this.lf) return { x: 0, y: 0, zoom: 1 }
    const { TRANSLATE_X, TRANSLATE_Y, SCALE_X } = this.lf.getTransform()
    return { x: TRANSLATE_X, y: TRANSLATE_Y, zoom: SCALE_X }
  }

  applyViewport(viewport: DiagramViewport): void {
    if (!this.lf) return
    try {
      this.resize()
      this.lf.resetZoom()
      this.lf.resetTranslate()
      if (Math.abs(viewport.zoom - 1) > 0.001) {
        this.lf.zoom(viewport.zoom)
      }
      const isDefault =
        Math.abs(viewport.x) < 0.5 &&
        Math.abs(viewport.y) < 0.5 &&
        Math.abs(viewport.zoom - 1) < 0.001
      if (isDefault) {
        this.centerOrigin()
        return
      }
      this.lf.translate(viewport.x, viewport.y)
    } catch {
      this.resize()
      this.centerOrigin()
    }
  }

  setGrid(visible: boolean, snap?: boolean): void {
    this.applyCanvasSettings({ gridVisible: visible, snapGrid: snap ?? this.canvasSettings.snapGrid })
  }

  selectAll(): void {
    if (!this.lf) return
    this.lf.clearSelectElements()
    const graph = this.lf.getGraphData() as { nodes?: Array<{ id: string }>; edges?: Array<{ id: string }> }
    for (const [index, node] of (graph.nodes ?? []).entries()) {
      this.lf.selectElementById(node.id, index > 0)
    }
    for (const edge of graph.edges ?? []) {
      this.lf.selectElementById(edge.id, true)
    }
    this.selectionBridge.syncFromGraph()
  }

  clearSelection(): void {
    this.lf?.clearSelectElements()
    this.selectionBridge.publishFromLiveGraph()
    this.refreshMultiSelectResize?.()
    this.scheduleOverlayLayout()
  }

  select(nodeIds: string[], edgeIds?: string[], append?: boolean): void {
    if (!this.lf) return
    if (!append) this.lf.clearSelectElements()
    let multi = append
    for (const id of nodeIds) {
      this.lf.selectElementById(id, multi)
      multi = true
    }
    for (const id of edgeIds ?? []) {
      this.lf.selectElementById(id, true)
    }
    this.selectionBridge.publishFromLiveGraph()
  }

  deleteSelection(nodeIds?: string[], edgeIds?: string[]): void {
    if (!this.lf) return
    const targets =
      nodeIds?.length || edgeIds?.length
        ? {
            nodes: (nodeIds ?? []).map((id) => ({ id })),
            edges: (edgeIds ?? []).map((id) => ({ id }))
          }
        : this.lf.getSelectElements(true)
    for (const node of targets.nodes) {
      const model = this.lf.getNodeModelById(node.id)
      if (model?.type === DIAGRAM_GROUP_FRAME_TYPE) {
        this.releaseGroupFrame(node.id)
        continue
      }
      this.detachNodeFromGroup(node.id)
      this.lf.deleteNode(node.id)
    }
    for (const edge of targets.edges) {
      this.detachEdgeFromGroup(edge.id)
      this.lf.deleteEdge(edge.id)
    }
    this.selectionBridge.setPrimarySelection(null, null)
    this.groupFrames.refreshDisplay()
    this.selectionBridge.emitSelection()
    this.scheduleGraphChange()
  }

  copy(): void {
    if (!this.lf) return
    const clip = this.buildClipboardSnapshot()
    if (!clip) return
    ;(this as { _clipboard?: unknown })._clipboard = clip
  }

  private resolveClipboardTargets(
    nodeIds?: string[],
    edgeIds?: string[]
  ): { nodeIds: string[]; edgeIds: string[] } {
    if (!this.lf) return { nodeIds: [], edgeIds: [] }

    const live = this.selectionBridge.collectLiveSelectedIds()
    const rawNodeIds = nodeIds?.length ? nodeIds : live.nodeIds
    const rawEdgeIds = edgeIds?.length ? edgeIds : live.edgeIds

    const expandedNodeIds: string[] = []
    const expandedEdgeIds = new Set(rawEdgeIds)

    for (const id of rawNodeIds) {
      const model = this.lf.getNodeModelById(id)
      if (!model) continue
      if (model.type === DIAGRAM_GROUP_FRAME_TYPE) {
        const members = (model.properties?.dgGroupMembers as string[] | undefined) ?? []
        const groupEdges = (model.properties?.dgGroupEdges as string[] | undefined) ?? []
        for (const memberId of members) expandedNodeIds.push(memberId)
        for (const edgeId of groupEdges) expandedEdgeIds.add(edgeId)
        continue
      }
      expandedNodeIds.push(id)
    }

    const nodeIdSet = new Set<string>()
    for (const id of expandedNodeIds) {
      const model = this.lf.getNodeModelById(id)
      if (model && model.type !== DIAGRAM_GROUP_FRAME_TYPE) {
        nodeIdSet.add(id)
      }
    }

    return {
      nodeIds: [...nodeIdSet],
      edgeIds: [...expandedEdgeIds]
    }
  }

  private buildClipboardSnapshot(
    nodeIds?: string[],
    edgeIds?: string[]
  ):
    | {
        nodes: Array<{
          id: string
          type: string
          x: number
          y: number
          width?: number
          height?: number
          text?: string
          properties?: Record<string, unknown>
        }>
        edges: Array<{
          type: string
          sourceNodeId: string
          targetNodeId: string
          text?: string
          properties?: Record<string, unknown>
        }>
      }
    | null {
    if (!this.lf) return null
    const targets = this.resolveClipboardTargets(nodeIds, edgeIds)
    if (!targets.nodeIds.length && !targets.edgeIds.length) return null

    const nodes = targets.nodeIds
      .map((id) => {
        const model = this.lf!.getNodeModelById(id)
        if (!model || model.type === DIAGRAM_GROUP_FRAME_TYPE) return null
        return {
          id: model.id,
          type: String(model.type),
          x: model.x,
          y: model.y,
          width: model.width,
          height: model.height,
          text: this.clipboardTextValue(model.text),
          properties: (() => {
            const p = structuredClone(model.properties ?? {}) as Record<string, unknown>
            delete p.dgGroupId
            return p
          })()
        }
      })
      .filter(Boolean) as Array<{
      id: string
      type: string
      x: number
      y: number
      width?: number
      height?: number
      text?: string
      properties?: Record<string, unknown>
    }>

    const edges = targets.edgeIds
      .map((edgeId) => {
        const model = this.lf!.getEdgeModelById(edgeId)
        if (!model) return null
        return {
          type: String(model.type),
          sourceNodeId: model.sourceNodeId,
          targetNodeId: model.targetNodeId,
          text: this.clipboardTextValue(model.text),
          properties: structuredClone(model.properties ?? {}) as Record<string, unknown>
        }
      })
      .filter(Boolean) as Array<{
      type: string
      sourceNodeId: string
      targetNodeId: string
      text?: string
      properties?: Record<string, unknown>
    }>

    return { nodes, edges }
  }

  private clipboardTextValue(text: unknown): string | undefined {
    if (typeof text === 'string') return text || undefined
    if (text && typeof text === 'object' && 'value' in text) {
      const value = String((text as { value?: string }).value ?? '')
      return value || undefined
    }
    return undefined
  }

  paste(clientX?: number, clientY?: number): void {
    this.pasteClipboard(clientX, clientY)
  }

  duplicate(
    offsetX = 20,
    offsetY = 20,
    nodeIds?: string[],
    edgeIds?: string[]
  ): void {
    const clip = this.buildClipboardSnapshot(nodeIds, edgeIds)
    if (!clip || (!clip.nodes.length && !clip.edges.length)) return
    ;(this as { _clipboard?: unknown })._clipboard = clip
    this.pasteClipboard(undefined, undefined, offsetX, offsetY)
    this.selectionBridge.syncFromGraph()
    this.refreshMultiSelectResize?.()
    this.scheduleOverlayLayout()
  }

  canUngroupSelection(): boolean {
    if (!this.lf) return false
    const { nodeIds, edgeIds } = this.selectionBridge.collectLiveSelectedIds()
    return resolveSelectionCapabilities(this.lf, nodeIds, edgeIds, {
      resolveClipboardTargets: (ids, eids) => this.resolveClipboardTargets([...ids], [...eids])
    }).canUngroup
  }

  canGroupSelection(): boolean {
    if (!this.lf) return false
    const live = this.selectionBridge.collectLiveSelectedIds()
    return resolveSelectionCapabilities(this.lf, live.nodeIds, live.edgeIds, {
      resolveClipboardTargets: (ids, eids) => this.resolveClipboardTargets([...ids], [...eids])
    }).canGroup
  }

  /** 将未组合图元/连线并入已有组合框 */
  private mergeUngroupedIntoGroup(
    groupId: string,
    nodeIds: string[],
    edgeIds: string[]
  ): void {
    if (!this.lf) return
    const group = this.lf.getNodeModelById(groupId)
    if (!group || group.type !== DIAGRAM_GROUP_FRAME_TYPE) return

    const memberSet = new Set((group.properties?.dgGroupMembers as string[] | undefined) ?? [])
    const edgeSet = new Set((group.properties?.dgGroupEdges as string[] | undefined) ?? [])

    for (const id of nodeIds) {
      const model = this.lf.getNodeModelById(id)
      if (!model || model.type === DIAGRAM_GROUP_FRAME_TYPE) continue
      memberSet.add(id)
      this.lf.setProperties(id, { dgGroupId: groupId })
    }
    for (const id of edgeIds) {
      if (!this.lf.getEdgeModelById(id)) continue
      edgeSet.add(id)
      this.lf.setProperties(id, { dgGroupId: groupId })
    }

    this.lf.setProperties(groupId, {
      dgGroupMembers: [...memberSet],
      dgGroupEdges: [...edgeSet]
    })
    syncGroupFrameBounds(this.lf, groupId)
  }

  /** 为未组合图元/连线创建新组合框 */
  private createGroupFrame(nodeIds: string[], edgeIds: string[]): void {
    if (!this.lf || nodeIds.length + edgeIds.length < 2) return

    let minX = Infinity
    let maxX = -Infinity
    let minY = Infinity
    let maxY = -Infinity
    for (const id of nodeIds) {
      const bounds = this.readNodeBounds(id)
      if (!bounds) continue
      minX = Math.min(minX, bounds.x - bounds.width / 2)
      maxX = Math.max(maxX, bounds.x + bounds.width / 2)
      minY = Math.min(minY, bounds.y - bounds.height / 2)
      maxY = Math.max(maxY, bounds.y + bounds.height / 2)
    }
    if (!nodeIds.length) {
      for (const edgeId of edgeIds) {
        const model = this.lf.getEdgeModelById(edgeId)
        for (const pt of model?.pointsList ?? []) {
          minX = Math.min(minX, pt.x)
          maxX = Math.max(maxX, pt.x)
          minY = Math.min(minY, pt.y)
          maxY = Math.max(maxY, pt.y)
        }
      }
    }
    const pad = 12
    if (!Number.isFinite(minX)) {
      minX = 0
      maxX = 120
      minY = 0
      maxY = 80
    }
    const cx = (minX + maxX) / 2
    const cy = (minY + maxY) / 2
    const w = Math.max(maxX - minX + pad * 2, 80)
    const h = Math.max(maxY - minY + pad * 2, 60)

    const groupId = `${DIAGRAM_GROUP_FRAME_TYPE}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    this.lf.addNode({
      id: groupId,
      type: DIAGRAM_GROUP_FRAME_TYPE,
      x: cx,
      y: cy,
      properties: {
        dgGroupMembers: nodeIds,
        dgGroupEdges: edgeIds,
        dgGroupStyle: { ...DEFAULT_GROUP_STYLE }
      }
    })
    const groupModel = this.lf.getNodeModelById(groupId)
    if (groupModel) {
      groupModel.width = w
      groupModel.height = h
    }
    for (const id of nodeIds) {
      this.lf.setProperties(id, { dgGroupId: groupId })
    }
    for (const id of edgeIds) {
      this.lf.setProperties(id, { dgGroupId: groupId })
    }
    ensureGroupFrameAtBottom(this.lf, groupId)
    this.lf.selectElementById(groupId)
  }

  groupSelection(nodeIds?: string[], edgeIds?: string[]): void {
    if (!this.lf) return
    const analysis = analyzeGroupSelection(this.lf, nodeIds, edgeIds)
    if (analysis.totalElementCount < 2) return

    this.cancelPendingSelectionSync()
    this.selectionBridge.beginMutationSuppress()
    let postGroupNodeIds: string[] = []
    let postGroupEdgeIds: string[] = []
    try {
      if (analysis.primaryGroupId) {
        if (!analysis.ungroupedNodeIds.length && !analysis.ungroupedEdgeIds.length) return
        this.mergeUngroupedIntoGroup(
          analysis.primaryGroupId,
          analysis.ungroupedNodeIds,
          analysis.ungroupedEdgeIds
        )
        postGroupNodeIds = [analysis.primaryGroupId]
      } else {
        const nodes = analysis.ungroupedNodeIds
        const edges = analysis.ungroupedEdgeIds
        if (nodes.length + edges.length < 2) return
        this.createGroupFrame(nodes, edges)
        const groupId = this.selectionBridge.collectLiveSelectedIds().nodeIds.find((id) =>
          this.isGroupFrameId(id)
        )
        postGroupNodeIds = groupId ? [groupId] : []
      }
      this.boxSelect.clearSnapshots()
      this.selectionBridge.scrubOrphanGroupLinks()
      this.groupFrames.refreshDisplay()
    } finally {
      this.selectionBridge.endMutationSuppress()
      if (postGroupNodeIds.length) {
        this.selectionBridge.schedulePostMutationCommit(postGroupNodeIds, postGroupEdgeIds)
      } else {
        this.notifyEditorSelection()
      }
      this.scheduleGraphChange()
    }
  }

  ungroupSelection(): void {
    if (!this.lf) return
    const { nodeIds, edgeIds } = this.selectionBridge.collectLiveSelectedIds()
    const groupIds = new Set<string>()
    const collectGroupId = (gid: unknown) => {
      if (typeof gid === 'string' && gid) groupIds.add(gid)
    }
    for (const id of nodeIds) {
      const model = this.lf.getNodeModelById(id)
      if (model?.type === DIAGRAM_GROUP_FRAME_TYPE) {
        groupIds.add(id)
        continue
      }
      collectGroupId(model?.properties?.dgGroupId)
    }
    for (const id of edgeIds) {
      collectGroupId(this.lf.getEdgeModelById(id)?.properties?.dgGroupId)
    }
    const resolved = this.resolveClipboardTargets(nodeIds, edgeIds)
    for (const id of resolved.nodeIds) {
      collectGroupId(this.lf.getNodeModelById(id)?.properties?.dgGroupId)
    }
    for (const id of resolved.edgeIds) {
      collectGroupId(this.lf.getEdgeModelById(id)?.properties?.dgGroupId)
    }
    if (!groupIds.size) return

    const releasedNodeIds: string[] = []
    const releasedEdgeIds: string[] = []
    for (const groupId of groupIds) {
      const model = this.lf.getNodeModelById(groupId)
      if (!model || model.type !== DIAGRAM_GROUP_FRAME_TYPE) continue
      const members = (model.properties?.dgGroupMembers as string[] | undefined) ?? []
      const edges = (model.properties?.dgGroupEdges as string[] | undefined) ?? []
      releasedNodeIds.push(...members)
      releasedEdgeIds.push(...edges)
    }

    this.cancelPendingSelectionSync()
    this.selectionBridge.beginMutationSuppress()
    try {
      this.lf.clearSelectElements()
      for (const groupId of groupIds) {
        this.releaseGroupFrame(groupId)
      }
      this.selectionBridge.scrubOrphanGroupLinks()
      this.boxSelect.clearSnapshots()
      this.groupFrames.refreshDisplay()
      this.refreshMultiSelectResize?.()
      this.scheduleOverlayLayout()
    } finally {
      this.selectionBridge.endMutationSuppress()
    }

    const uniqueNodeIds = [...new Set(releasedNodeIds)].filter((id) =>
      Boolean(this.lf!.getNodeModelById(id))
    )
    const uniqueEdgeIds = [...new Set(releasedEdgeIds)].filter((id) =>
      Boolean(this.lf!.getEdgeModelById(id))
    )

    if (uniqueNodeIds.length || uniqueEdgeIds.length) {
      this.selectionBridge.schedulePostMutationCommit(uniqueNodeIds, uniqueEdgeIds)
    } else {
      this.lf.clearSelectElements()
      this.selectionBridge.commitForIds([], [])
    }
    this.scheduleGraphChange()
  }

  private detachNodeFromGroup(nodeId: string): void {
    if (!this.lf) return
    const model = this.lf.getNodeModelById(nodeId)
    const groupId = model?.properties?.dgGroupId
    if (typeof groupId !== 'string' || !groupId) return
    const group = this.lf.getNodeModelById(groupId)
    if (!group || group.type !== DIAGRAM_GROUP_FRAME_TYPE) {
      clearElementGroupId(this.lf, nodeId)
      return
    }
    const members = ((group.properties?.dgGroupMembers as string[] | undefined) ?? []).filter(
      (id) => id !== nodeId
    )
    this.lf.setProperties(groupId, { dgGroupMembers: members })
    clearElementGroupId(this.lf, nodeId)
    if (!members.length && !((group.properties?.dgGroupEdges as string[] | undefined) ?? []).length) {
      this.lf.deleteNode(groupId)
    } else {
      syncGroupFrameBounds(this.lf, groupId)
    }
  }

  private detachEdgeFromGroup(edgeId: string): void {
    if (!this.lf) return
    const model = this.lf.getEdgeModelById(edgeId)
    const groupId = model?.properties?.dgGroupId
    if (typeof groupId !== 'string' || !groupId) return
    const group = this.lf.getNodeModelById(groupId)
    if (!group || group.type !== DIAGRAM_GROUP_FRAME_TYPE) {
      clearElementGroupId(this.lf, edgeId)
      return
    }
    const edges = ((group.properties?.dgGroupEdges as string[] | undefined) ?? []).filter(
      (id) => id !== edgeId
    )
    this.lf.setProperties(groupId, { dgGroupEdges: edges })
    clearElementGroupId(this.lf, edgeId)
    if (!edges.length && !((group.properties?.dgGroupMembers as string[] | undefined) ?? []).length) {
      this.lf.deleteNode(groupId)
    } else {
      syncGroupFrameBounds(this.lf, groupId)
    }
  }

  private releaseGroupFrame(groupId: string): void {
    if (!this.lf) return
    const model = this.lf.getNodeModelById(groupId)
    const members = (model?.properties?.dgGroupMembers as string[] | undefined) ?? []
    const edgeMembers = (model?.properties?.dgGroupEdges as string[] | undefined) ?? []

    for (const memberId of members) {
      clearElementGroupId(this.lf, memberId)
    }
    for (const edgeId of edgeMembers) {
      clearElementGroupId(this.lf, edgeId)
    }
    for (const node of this.lf.graphModel.nodes) {
      if (node.properties?.dgGroupId === groupId) {
        clearElementGroupId(this.lf, node.id)
      }
    }
    for (const edge of this.lf.graphModel.edges) {
      if (edge.properties?.dgGroupId === groupId) {
        clearElementGroupId(this.lf, edge.id)
      }
    }
    if (model?.type === DIAGRAM_GROUP_FRAME_TYPE) {
      if (this.lf.getNodeModelById(groupId)?.isSelected) {
        this.lf.deselectElementById(groupId)
      }
      this.lf.deleteNode(groupId)
    }
  }

  private pasteClipboard(
    clientX?: number,
    clientY?: number,
    fixedOffsetX?: number,
    fixedOffsetY?: number
  ): void {
    const clip = (this as {
      _clipboard?: {
        nodes: Array<{
          id: string
          type: string
          x: number
          y: number
          width?: number
          height?: number
          text?: string
          properties?: Record<string, unknown>
        }>
        edges?: Array<{
          type: string
          sourceNodeId: string
          targetNodeId: string
          text?: string
          properties?: Record<string, unknown>
        }>
      }
    })._clipboard
    if (!clip || !this.lf) return
    if (!clip.nodes.length && !clip.edges?.length) return
    let offsetX = 20
    let offsetY = 20
    if (clip.nodes.length) {
      const { x: centerX, y: centerY } = selectionBoundsCenter(clip.nodes)
      if (fixedOffsetX != null && fixedOffsetY != null) {
        offsetX = fixedOffsetX
        offsetY = fixedOffsetY
      } else if (clientX != null && clientY != null) {
        const { x: cx, y: cy } = this.clientToCanvas(clientX, clientY)
        offsetX = cx - centerX
        offsetY = cy - centerY
      } else if (this.container) {
        const rect = this.container.getBoundingClientRect()
        const { x: cx, y: cy } = this.clientToCanvas(
          rect.left + rect.width / 2,
          rect.top + rect.height / 2
        )
        offsetX = cx - centerX
        offsetY = cy - centerY
      }
    }
    const idMap = new Map<string, string>()
    const newNodeIds: string[] = []
    const newEdgeIds: string[] = []
    const stamp = Date.now()
    let seq = 0
    for (const node of clip.nodes) {
      const newId = `${node.type}_${stamp}_${seq++}_${Math.random().toString(36).slice(2, 6)}`
      idMap.set(node.id, newId)
      newNodeIds.push(newId)
      const nodeProperties = structuredClone(node.properties ?? {}) as Record<string, unknown>
      delete nodeProperties.dgGroupId
      this.lf.addNode({
        id: newId,
        type: node.type,
        x: node.x + offsetX,
        y: node.y + offsetY,
        text: node.text,
        properties: nodeProperties
      })
      const model = this.lf.getNodeModelById(newId)
      if (model && (node.width != null || node.height != null)) {
        applyNodeDimensions(
          model as Parameters<typeof applyNodeDimensions>[0],
          node.width ?? Math.round(model.width),
          node.height ?? Math.round(model.height)
        )
      }
    }
    for (const edge of clip.edges ?? []) {
      const sourceNodeId = idMap.get(edge.sourceNodeId) ?? edge.sourceNodeId
      const targetNodeId = idMap.get(edge.targetNodeId) ?? edge.targetNodeId
      if (!this.lf.getNodeModelById(sourceNodeId) || !this.lf.getNodeModelById(targetNodeId)) continue
      const newId = `${edge.type}_${stamp}_${seq++}_${Math.random().toString(36).slice(2, 6)}`
      newEdgeIds.push(newId)
      this.lf.addEdge({
        id: newId,
        type: edge.type,
        sourceNodeId,
        targetNodeId,
        text: edge.text,
        properties: structuredClone(edge.properties ?? {})
      })
      const edgeProps = readEdgeProperties(this.lf, newId)
      if (edgeProps) applyEdgeProperties(this.lf, edgeProps)
    }
    if (newNodeIds.length) {
      this.select(newNodeIds)
      if (this.canvasSettings.snapGrid) {
        snapNodesAfterDrag(this.lf, newNodeIds, true, newNodeIds[0])
        syncGroupFramesForNodes(this.lf, newNodeIds)
      }
    } else if (newEdgeIds.length) {
      this.select([], newEdgeIds)
    }
    this.scheduleGraphChange()
  }

  addNode(shape: string, x: number, y: number, text?: string, style?: Record<string, unknown>): string {
    if (!this.lf) throw new Error('画布未挂载')
    ;({ x, y } = snapCanvasPoint(x, y, this.canvasSettings.snapGrid))
    const shapeId = resolveDiagramShapeId(shape)
    const meta = getDiagramShapeById(shapeId)
    const lfType = meta?.lfType ?? shapeId
    const id = `${lfType}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    const config = buildDiagramNodeConfig(shapeId, x, y, text, style)
    this.lf.addNode({ ...config, id })
    return id
  }

  findEdgeAtCanvasPoint(
    x: number,
    y: number,
    threshold = 14,
    options?: { excludeNodeIds?: string[] }
  ): string | null {
    return this.edgeInsert.findEdgeAtCanvasPoint(x, y, threshold, options)
  }

  setEdgeInsertHighlight(edgeId: string | null): void {
    this.edgeInsert.setHighlight(edgeId)
  }

  insertExistingNodeOnEdge(nodeId: string, edgeId: string): boolean {
    return this.edgeInsert.insertExistingNodeOnEdge(nodeId, edgeId)
  }

  addNodeOnEdge(
    shape: string,
    x: number,
    y: number,
    edgeId: string,
    text?: string,
    style?: Record<string, unknown>
  ): string {
    if (!this.lf) throw new Error('画布未挂载')
    const edge = this.lf.getEdgeModelById(edgeId)
    if (!edge) return this.addNode(shape, x, y, text, style)

    const sourceNodeId = edge.sourceNodeId
    const targetNodeId = edge.targetNodeId
    if (!sourceNodeId || !targetNodeId || sourceNodeId === targetNodeId) {
      return this.addNode(shape, x, y, text, style)
    }

    const sourceModel = this.lf.getNodeModelById(sourceNodeId)
    const targetModel = this.lf.getNodeModelById(targetNodeId)
    if (!sourceModel || !targetModel) return this.addNode(shape, x, y, text, style)

    const newNodeId = this.addNode(shape, x, y, text, style)
    if (!this.insertExistingNodeOnEdge(newNodeId, edgeId)) {
      return newNodeId
    }
    return newNodeId
  }

  connect(sourceNodeId: string, targetNodeId: string, style?: Record<string, unknown>): string {
    if (!this.lf) throw new Error('画布未挂载')
    const d = this.canvasSettings.defaultEdge
    const properties = style ? normalizeEdgeStyleProperties(style) : undefined
    const edge = this.lf.addEdge({
      type: d.type,
      sourceNodeId,
      targetNodeId,
      ...(properties ? { properties } : {})
    })
    this.select([], [edge.id])
    return edge.id
  }

  updateNode(nodeId: string, patch: Record<string, unknown>): void {
    if (patch.nodeProps) {
      this.updateNodeProperties({ id: nodeId, ...(patch.nodeProps as Partial<DiagramNodeProperties>) })
      return
    }
    if (!this.lf) return
    const model = this.lf.getNodeModelById(nodeId)
    if (!model) return
    if (typeof patch.lfType === 'string' && patch.lfType !== model.type) {
      ;(model as { type: string }).type = patch.lfType
      if ('setAttributes' in model && typeof model.setAttributes === 'function') {
        ;(model as { setAttributes: () => void }).setAttributes()
      }
    }
    if ('text' in patch && typeof patch.text === 'string') {
      model.updateText(patch.text)
    }
    if ('x' in patch || 'y' in patch) {
      const nx = typeof patch.x === 'number' ? patch.x : model.x
      const ny = typeof patch.y === 'number' ? patch.y : model.y
      const dx = nx - model.x
      const dy = ny - model.y
      if (dx !== 0 || dy !== 0) this.lf.graphModel.moveNode(nodeId, dx, dy, true)
    }
    const props = patch.properties ?? patch.style
    if (props && typeof props === 'object') {
      const incoming = { ...(props as Record<string, unknown>) }
      if (incoming.dgGroupStyle && model.properties?.dgGroupStyle) {
        incoming.dgGroupStyle = {
          ...(model.properties.dgGroupStyle as Record<string, unknown>),
          ...(incoming.dgGroupStyle as Record<string, unknown>)
        }
      }

      const dgShapePatch = incoming.dgShape
      if (isDiagramShapePayloadEnvelope(dgShapePatch)) {
        patchNodeDgShape(this.lf, nodeId, dgShapePatch as DiagramShapePayloadEnvelope)
        const { dgShape: _dgShape, ...rest } = incoming
        if (Object.keys(rest).length > 0) {
          this.lf.setProperties(nodeId, rest)
        }
      } else {
        this.lf.setProperties(nodeId, incoming)
      }

      if (model.type === DIAGRAM_GROUP_FRAME_TYPE) {
        ensureGroupFrameAtBottom(this.lf, nodeId)
      }
    }
    this.scheduleGraphChange()
    this.refreshSelectionIfNodeInSelection(nodeId)
  }

  /** 属性变更后刷新选区快照（仅当选中目标包含该节点，避免覆盖用户已切换的选区） */
  private refreshSelectionIfNodeInSelection(nodeId: string): void {
    if (!this.lf) return
    const live = this.selectionBridge.readLiveSelection()
    if (!live.selectedNodeIds.includes(nodeId)) return
    this.selectionBridge.publishFromLiveGraph()
  }

  updateEdge(edgeId: string, patch: Record<string, unknown>): void {
    if (patch.edgeProps) {
      this.updateEdgeProperties({ id: edgeId, ...(patch.edgeProps as Partial<DiagramEdgeProperties>) })
      return
    }
    const edge = this.lf?.getEdgeModelById(edgeId)
    if (!edge) return
    Object.assign(edge, patch)
  }
}

const LEGACY_SHAPE_IDS: Record<string, string> = {
  rect: 'dg-rect',
  circle: 'dg-circle',
  diamond: 'dg-decision',
  ellipse: 'dg-ellipse'
}

function resolveDiagramShapeId(shape: string): string {
  if (getDiagramShapeById(shape)) return shape
  return LEGACY_SHAPE_IDS[shape] ?? shape
}

function normalizeGraph(data: unknown): { nodes: unknown[]; edges: unknown[] } {
  if (!data || typeof data !== 'object') return { nodes: [], edges: [] }
  const g = data as { nodes?: unknown[]; edges?: unknown[] }
  return { nodes: g.nodes ?? [], edges: g.edges ?? [] }
}
