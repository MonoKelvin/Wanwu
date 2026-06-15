import LogicFlow from '@logicflow/core'
import type { CanvasGraphPatch, DiagramViewport, IDiagramEditorPort } from '@modules/library/diagrams/interfaces/IDiagramEditorPort'
import {
  backgroundForPreset
} from '@modules/library/diagrams/lib/diagramCanvasPresets'
import {
  type DiagramCanvasTheme,
  diagramAxisStyle
} from '@modules/library/diagrams/lib/diagramCanvasTheme'
import { mountDiagramAxisOverlay } from '@modules/library/diagrams/lib/diagramAxisOverlay'
import {
  getMultiSelectOverlayRect,
  countSelectedDiagramNodes,
  type DiagramMultiSelectLayout
} from '@modules/library/diagrams/lib/diagramMultiSelectResize'
import {
  applyEdgeProperties,
  applyNodeProperties,
  normalizeEdgeStyleProperties
} from '@modules/library/diagrams/lib/diagramStyleBridge'
import {
  buildDiagramNodeConfig,
  getDiagramShapeById
} from '@modules/library/diagrams/lib/diagramShapeRegistry'
import { setDiagramEdgeAccent } from '@modules/library/diagrams/lib/diagramShapeRegs'
import type {
  DiagramCanvasSettings,
  DiagramEdgeProperties,
  DiagramEditorSelection,
  DiagramNodeProperties
} from '@modules/library/diagrams/lib/diagramSelectionTypes'
import { defaultCanvasSettings } from '@modules/library/diagrams/lib/diagramSelectionTypes'
import { DiagramBoxSelectCoordinator } from '@modules/library/diagrams/services/diagramBoxSelectCoordinator'
import { DiagramCanvasViewportController } from '@modules/library/diagrams/services/diagramCanvasViewportController'
import { DiagramEdgeInsertCoordinator } from '@modules/library/diagrams/services/diagramEdgeInsertCoordinator'
import { DiagramGroupFrameCoordinator } from '@modules/library/diagrams/services/diagramGroupFrameCoordinator'
import type { DiagramCanvasEventBinderPorts } from '@modules/library/diagrams/services/canvas-events/diagramCanvasEventPorts'
import { DiagramEditorMountCoordinator } from '@modules/library/diagrams/services/diagramEditorMountCoordinator'
import { DiagramExportCoordinator } from '@modules/library/diagrams/services/diagramExportCoordinator'
import { DiagramEditorSelectionBridge } from '@modules/library/diagrams/services/diagramEditorSelectionBridge'
import { DiagramFormatPainterCoordinator } from '@modules/library/diagrams/services/diagramFormatPainterCoordinator'
import { DiagramClipboardCoordinator } from '@modules/library/diagrams/services/diagramClipboardCoordinator'
import { suppressGroupFrameSelectionWhenMembersSelected } from '@modules/library/diagrams/lib/diagramCopySelection'
import { DiagramGroupSelectionCoordinator } from '@modules/library/diagrams/services/diagramGroupSelectionCoordinator'
import { DiagramSelectionLayoutCoordinator } from '@modules/library/diagrams/services/diagramSelectionLayoutCoordinator'
import { DiagramSelectionStyleCoordinator } from '@modules/library/diagrams/services/diagramSelectionStyleCoordinator'
import { DiagramGraphLoadCoordinator } from '@modules/library/diagrams/services/diagramGraphLoadCoordinator'
import { DiagramCanvasThemeCoordinator } from '@modules/library/diagrams/services/diagramCanvasThemeCoordinator'
import { DiagramContextMenuCoordinator } from '@modules/library/diagrams/services/diagramContextMenuCoordinator'
import { applyDiagramCanvasGraphPatch } from '@modules/library/diagrams/lib/diagramGraphPatchApply'
import { applyDiagramNodePatch } from '@modules/library/diagrams/lib/diagramNodePatchApply'
import {
  applyDiagramViewport,
  centerDiagramOnContent,
  centerDiagramOnOrigin,
  getDiagramViewport,
  zoomDiagramCanvas
} from '@modules/library/diagrams/lib/diagramViewportOps'
import { DiagramMultiSelectOverlayCoordinator } from '@modules/library/diagrams/services/diagramMultiSelectOverlayCoordinator'
import { DiagramSelectionPointerCapture } from '@modules/library/diagrams/services/diagramSelectionPointerCapture'
import { filterAlignableNodeIds } from '@modules/library/diagrams/lib/diagramSelectionSnapshot'
import type {
  DiagramAlignMode,
  DiagramDistributeMode
} from '@modules/library/diagrams/lib/diagramNodeLayout'
import {
  isGroupFrameModel,
  clearGroupFramePointerInside
} from '@modules/library/diagrams/lib/diagramGroupFrame'
import { finalizeNodeLayoutChange } from '@modules/library/diagrams/lib/diagramNodeLayoutPatch'
import { normalizeDiagramGraph } from '@modules/library/diagrams/lib/diagramGraphLoad'
import type { DiagramSelectionIds } from '@modules/library/diagrams/services/diagramGraphLoadCoordinator'
import { syncGroupFramesForNodes } from '@modules/library/diagrams/lib/diagramGroupBounds'
import { snapCanvasPoint } from '@modules/library/diagrams/lib/diagramGridSnap'
import { cloneForIpc } from '@shared/lib/cloneForIpc'
import type { DiagramDocumentFinishDragParams } from '@modules/library/diagrams/app/command/domain/payloads'
import {
  setDiagramActiveLogicFlow,
  setDiagramCanvasSnapGrid,
  setDiagramViewportChangeNotify
} from '@modules/library/diagrams/lib/diagramCanvasInteractionSettings'

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
  private dragUndoBaseline: Pick<
    DiagramDocumentFinishDragParams,
    'beforeGraph' | 'beforeSelection'
  > | null = null
  private dragUndoRecorder: ((payload: DiagramDocumentFinishDragParams) => void) | null = null
  private undoRedoRestoreDepth = 0
  private readonly viewport = new DiagramCanvasViewportController()
  private readonly formatPainter = new DiagramFormatPainterCoordinator({
    getLf: () => this.lf,
    getCanvasFrameEl: () => this.getCanvasFrameEl(),
    clientToCanvas: (x, y) => this.clientToCanvas(x, y),
    getSelectedNodeIds: () => this.getSelectedNodeIds(),
    getSelectedEdgeIds: () => this.getSelectedEdgeIds(),
    countSelectedNodes: () => this.countSelectedNodes(),
    getPrimaryNodeId: () => this.selectionBridge.getPrimaryNodeId(),
    onSelectionChanged: () => this.selectionBridge.publishSelection()
  })
  private readonly clipboard = new DiagramClipboardCoordinator({
    getLf: () => this.lf,
    getContainer: () => this.container,
    clientToCanvas: (x, y) => this.clientToCanvas(x, y),
    getSnapGrid: () => this.canvasSettings.snapGrid,
    getLastCanvasPointerClient: () => this.getLastCanvasPointerClient(),
    clearBoxSelectSnapshots: () => this.boxSelect.clearSnapshots(),
    collectLiveSelection: () => this.selectionBridge.collectLiveSelectedIds(),
    select: (nodeIds, edgeIds) => this.select(nodeIds, edgeIds),
    prepareSelectionForCopy: () => this.prepareSelectionForCopy(),
    scheduleGraphChange: () => this.scheduleGraphChange()
  })
  private readonly selectionBridge: DiagramEditorSelectionBridge = new DiagramEditorSelectionBridge({
    getLf: () => this.lf,
    getCanvasSettings: () => ({ ...this.canvasSettings }),
    isFormatPainterActive: () => this.formatPainter.isActive(),
    resolveClipboardTargets: (nodeIds, edgeIds) => this.clipboard.resolveTargets(nodeIds, edgeIds),
    onSelectionPublished: (selection) => this.selectionHandler?.(selection),
    onRefreshGroupFrames: () => this.groupFrames.refreshDisplay(),
    onAfterUserSelectionPublished: () => {
      this.groupFrames.scheduleToBottom()
      this.scheduleMultiSelectOverlayRefresh()
    },
    onAfterSyncFromGraph: () => this.groupFrames.scheduleToBottom(),
    onMaybeInvalidateFormatPainter: () => this.formatPainter.maybeCancelOnSelectionChange(),
    shouldReconcileBoxCollapse: (): boolean => this.boxSelect.shouldReconcileCollapse(),
    getBoxSelectReconcileContext: () => this.boxSelect.getReconcileContext(),
    onFlushMultiSelectOverlay: () => this.multiSelectOverlay.flushNow(),
    onClearBoxSelectSnapshotsIfAllowed: () => {
      if (!this.boxSelect.isInGracePeriod()) {
        this.boxSelect.clearSnapshots()
      }
    }
  })
  private readonly groupFrames = new DiagramGroupFrameCoordinator({
    getLf: () => this.lf,
    clientToCanvas: (x, y) => this.clientToCanvas(x, y),
    onPointerMove: (x, y) => this.formatPainter.onPointerMove(x, y),
    onPointerLeave: () => this.formatPainter.onPointerLeave()
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
    publishSelection: () => this.selectionBridge.publishSelection(),
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
  private readonly groupSelectionCoordinator = new DiagramGroupSelectionCoordinator({
    getLf: () => this.lf,
    isGroupFrameId: (nodeId) => this.isGroupFrameId(nodeId),
    resolveClipboardTargets: (nodeIds, edgeIds) => this.clipboard.resolveTargets(nodeIds, edgeIds),
    selectionBridge: this.selectionBridge,
    boxSelect: this.boxSelect,
    groupFrames: this.groupFrames,
    cancelPendingSelectionSync: () => this.cancelPendingSelectionSync(),
    notifyEditorSelection: () => this.notifyEditorSelection(),
    scheduleGraphChange: () => this.scheduleGraphChange(),
    refreshMultiSelectOverlay: () => this.refreshMultiSelectResize?.(),
    scheduleOverlayLayout: () => this.scheduleOverlayLayout()
  })
  private readonly selectionLayout = new DiagramSelectionLayoutCoordinator({
    getLf: () => this.lf,
    getSnapGrid: () => this.canvasSettings.snapGrid,
    getSelectedNodeIds: () => this.getSelectedNodeIds(),
    isGroupFrameId: (nodeId) => this.isGroupFrameId(nodeId),
    syncGroupFramesForNodeIds: (nodeIds) => this.groupFrames.syncForNodeIds(nodeIds),
    selectionBridge: this.selectionBridge,
    scheduleGraphChange: () => this.scheduleGraphChange(),
    refreshMultiSelectOverlay: () => this.refreshMultiSelectResize?.(),
    scheduleOverlayLayout: () => this.scheduleOverlayLayout()
  })
  private readonly selectionStyle = new DiagramSelectionStyleCoordinator({
    getLf: () => this.lf,
    getResolvedTheme: () => this.resolvedTheme,
    getSelectedNodeIds: () => this.getSelectedNodeIds(),
    getSelectedEdgeIds: () => this.getSelectedEdgeIds(),
    syncGroupFramesForNodes: (nodeIds) => syncGroupFramesForNodes(this.lf!, nodeIds),
    refreshGroupFramesDisplay: () => this.groupFrames.refreshDisplay(),
    scheduleGraphChange: () => this.scheduleGraphChange(),
    publishSelection: () => this.selectionBridge.publishSelection()
  })
  private readonly canvasTheme = new DiagramCanvasThemeCoordinator({
    getLf: () => this.lf,
    getContainer: () => this.container,
    getCanvasSettings: () => this.canvasSettings,
    setCanvasSettings: (settings) => {
      this.canvasSettings = settings
    },
    getResolvedTheme: () => this.resolvedTheme,
    setResolvedTheme: (theme) => {
      this.resolvedTheme = theme
    },
    publishSelection: () => this.selectionBridge.publishSelection(),
    refreshAxisOverlay: () => this.refreshAxisOverlay(),
    refreshMultiSelectOverlay: () => this.refreshMultiSelectResize?.()
  })
  private readonly graphLoad = new DiagramGraphLoadCoordinator({
    getLf: () => this.lf,
    selectionBridge: this.selectionBridge,
    refreshAxisOverlay: () => this.refreshAxisOverlay(),
    refreshMultiSelectOverlay: () => this.refreshMultiSelectResize?.(),
    scheduleResize: () => this.resize()
  })
  private readonly contextMenu = new DiagramContextMenuCoordinator({
    getLf: () => this.lf,
    getHandler: () => this.contextMenuHandler,
    cancelFormatPainter: () => this.formatPainter.cancel(),
    boxSelect: this.boxSelect,
    selectionBridge: this.selectionBridge,
    clientToCanvas: (x, y) => this.clientToCanvas(x, y),
    recordCanvasPointer: (x, y) => this.recordCanvasPointer(x, y)
  })
  private readonly editorMount = new DiagramEditorMountCoordinator()
  private readonly exportCoordinator = new DiagramExportCoordinator({
    getLf: () => this.lf,
    getBackgroundColor: () => this.canvasTheme.getBackgroundColorForExport(),
    ensureSnapshotPlugin
  })
  private teardownGroupFrameHover: (() => void) | null = null
  private teardownCanvasPointer: (() => void) | null = null
  private lastCanvasPointerClient: { x: number; y: number } | null = null

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

  /** 单图元缩放结束：仅同步组合框，不吸附中心点（吸附会偏移对角锚定位置） */
  private scheduleResizeFollowUp(nodeId: string): void {
    if (this.resizeSnapTimer) clearTimeout(this.resizeSnapTimer)
    this.resizeSnapTimer = setTimeout(() => {
      this.resizeSnapTimer = null
      if (!this.lf) return
      finalizeNodeLayoutChange(this.lf, [nodeId])
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
    const mounted = this.editorMount.mount(el, {
      getContainer: () => this.container,
      setContainer: (container) => {
        this.container = container
      },
      getCanvasSettings: () => this.canvasSettings,
      getResolvedTheme: () => this.resolvedTheme,
      canvasTheme: this.canvasTheme,
      boxSelect: this.boxSelect,
      viewport: this.viewport,
      groupFrames: this.groupFrames,
      edgeInsert: this.edgeInsert,
      selectionBridge: this.selectionBridge,
      selectionPointerCapture: this.selectionPointerCapture,
      formatPainter: this.formatPainter,
      contextMenu: this.contextMenu,
      multiSelectOverlay: this.multiSelectOverlay,
      buildCanvasEventPorts: (lf) => this.buildCanvasEventPorts(lf),
      bindSelectionPointerSync: (container) => this.bindSelectionPointerSync(container),
      centerContent: () => this.centerContent(),
      onViewportChange: () => this.viewportChangeHandler?.(),
      getSelectedContentNodeIds: () => this.getSelectedContentNodeIds(),
      scheduleGraphChange: () => this.scheduleGraphChange(),
      refreshAxisOverlay: () => this.refreshAxisOverlay()
    })

    this.lf = mounted.lf
    setDiagramActiveLogicFlow(this.lf)
    setDiagramCanvasSnapGrid(this.canvasSettings.snapGrid)
    this.teardownCanvasEvents = mounted.teardownCanvasEvents
    this.teardownMiddlePan = mounted.teardownMiddlePan
    this.teardownShiftWheelPan = mounted.teardownShiftWheelPan
    this.teardownContextMenu = mounted.teardownContextMenu
    this.teardownGroupFrameHover = mounted.teardownGroupFrameHover
    this.teardownCanvasPointer = this.bindCanvasPointerTracking(el)
    this.teardownSelectionSnapshot = mounted.teardownSelectionSnapshot
    this.teardownSelectionPointerSync = mounted.teardownSelectionPointerSync
    this.teardownBoxSelectRubberGuard = mounted.teardownBoxSelectRubberGuard
    this.teardownMultiSelectResize = mounted.teardownMultiSelectResize
    this.refreshMultiSelectResize = mounted.refreshMultiSelectResize
    this.refreshMultiSelectResizeNow = mounted.refreshMultiSelectResizeNow
  }

  private buildCanvasEventPorts(lf: LogicFlow): DiagramCanvasEventBinderPorts {
    return {
      getLf: () => lf,
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
      scheduleMultiSelectOverlayRefresh: () => this.scheduleMultiSelectOverlayRefresh(),
      scheduleOverlayLayout: () => this.scheduleOverlayLayout(),
      refreshMultiSelectResize: () => this.refreshMultiSelectResize?.(),
      scheduleResizeFollowUp: (nodeId) => this.scheduleResizeFollowUp(nodeId),
      countSelectedNodes: () => this.countSelectedNodes(),
      getSelectedNodeIds: () => this.getSelectedNodeIds(),
      getSelectedContentNodeIds: () => this.getSelectedContentNodeIds(),
      isGroupFrameId: (id) => this.isGroupFrameId(id),
      formatPainter: this.formatPainter,
      applyDefaultEdgeStyle: (id) => this.canvasTheme.applyDefaultEdgeStyle(id),
      patchBackgroundDom: (color) => this.canvasTheme.patchBackgroundDom(color),
      onViewportChange: () => this.viewportChangeHandler?.(),
      onFormatPainterNodeApplied: (nodeId) => {
        syncGroupFramesForNodes(lf, [nodeId])
        this.groupFrames.refreshDisplay()
      },
      captureDragUndoBaseline: () => this.captureDragUndoBaseline(),
      commitDragUndoMutation: () => this.commitDragUndoMutation()
    }
  }

  setDragUndoRecorder(
    recorder: ((payload: DiagramDocumentFinishDragParams) => void) | null
  ): void {
    this.dragUndoRecorder = recorder
    if (!recorder) this.dragUndoBaseline = null
  }

  getLogicFlow(): LogicFlow | null {
    return this.lf
  }

  isUndoRedoRestoreActive(): boolean {
    return this.undoRedoRestoreDepth > 0
  }

  withUndoRedoRestore<T>(fn: () => T): T {
    this.selectionBridge.cancelPostMutationCommits()
    this.selectionBridge.cancelPendingSync()
    this.selectionBridge.beginMutationSuppress()
    this.undoRedoRestoreDepth += 1
    try {
      return fn()
    } finally {
      this.undoRedoRestoreDepth -= 1
      this.selectionBridge.endMutationSuppress()
      this.selectionBridge.syncFromGraph(true)
      this.refreshMultiSelectResize?.()
      this.scheduleOverlayLayout()
    }
  }

  async withUndoRedoRestoreAsync<T>(fn: () => Promise<T>): Promise<T> {
    this.selectionBridge.cancelPostMutationCommits()
    this.selectionBridge.cancelPendingSync()
    this.selectionBridge.beginMutationSuppress()
    this.undoRedoRestoreDepth += 1
    try {
      return await fn()
    } finally {
      this.undoRedoRestoreDepth -= 1
      this.selectionBridge.endMutationSuppress()
      this.selectionBridge.syncFromGraph(true)
      this.refreshMultiSelectResize?.()
      this.scheduleOverlayLayout()
    }
  }

  captureSelectionIds(): DiagramSelectionIds {
    if (!this.lf) return { nodeIds: [], edgeIds: [] }
    const selected = this.lf.getSelectElements(true)
    return {
      nodeIds: selected.nodes.map((n) => n.id),
      edgeIds: selected.edges.map((e) => e.id)
    }
  }

  loadGraphForUndoRedo(data: unknown, restoreSelection: DiagramSelectionIds): void {
    const load = () => {
      this.graphLoad.loadGraph(data, { restoreSelection })
    }
    if (this.undoRedoRestoreDepth > 0) load()
    else this.withUndoRedoRestore(load)
  }

  captureDragUndoBaseline(): void {
    if (!this.dragUndoRecorder || !this.lf) return
    this.dragUndoBaseline = {
      beforeGraph: cloneForIpc(this.getGraph()),
      beforeSelection: this.captureSelectionIds()
    }
  }

  commitDragUndoMutation(): void {
    if (!this.dragUndoRecorder || !this.dragUndoBaseline || !this.lf) return
    const afterGraph = cloneForIpc(this.getGraph())
    const afterSelection = this.captureSelectionIds()
    const baseline = this.dragUndoBaseline
    this.dragUndoBaseline = null
    this.dragUndoRecorder({
      beforeGraph: baseline.beforeGraph,
      afterGraph,
      beforeSelection: baseline.beforeSelection,
      afterSelection
    })
  }

  private cancelPendingSelectionSync(): void {
    this.selectionBridge.cancelPendingSync()
  }

  private bindSelectionPointerSync(el: HTMLElement): () => void {
    return this.selectionBridge.bindPointerUpSync(el, {
      shouldSkip: () => !this.lf || this.boxSelect.shouldSkipPointerSync(),
      isMiddlePanning: () => this.viewport.isMiddlePanning()
    })
  }

  /** 点击修饰键点选时使用的「点击前」选区快照 */
  private getClickSelectionSnapshot(e?: MouseEvent | PointerEvent | null): string[] {
    return this.selectionPointerCapture.getClickSelectionSnapshot(
      e,
      this.selectionBridge.getLastSelectedNodeIds()
    )
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
    setDiagramViewportChangeNotify(handler)
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

  private getSelectedContentNodeIds(): string[] {
    return this.getSelectedNodeIds().filter((id) => !this.isGroupFrameId(id))
  }

  focusCanvas(): void {
    this.container?.focus({ preventScroll: true })
  }

  getSelectedNodeIds(): string[] {
    return this.selectionBridge.collectLiveSelectedIds().nodeIds
  }

  getSelectedEdgeIds(): string[] {
    return this.selectionBridge.collectLiveSelectedIds().edgeIds
  }

  hasClipboard(): boolean {
    return this.clipboard.hasClipboard()
  }

  private isGroupFrameId(nodeId: string): boolean {
    return isGroupFrameModel(this.lf?.getNodeModelById(nodeId))
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

  alignNodes(mode: DiagramAlignMode, nodeIds?: string[]): void {
    this.selectionLayout.alignNodes(mode, nodeIds)
  }

  distributeNodes(mode: DiagramDistributeMode, nodeIds?: string[]): void {
    this.selectionLayout.distributeNodes(mode, nodeIds)
  }

  nudgeSelection(dx: number, dy: number, nodeIds?: string[]): void {
    this.selectionLayout.nudgeSelection(dx, dy, nodeIds)
  }

  bringNodesToFront(nodeIds?: string[]): void {
    this.selectionLayout.bringNodesToFront(nodeIds)
  }

  sendNodesToBack(nodeIds?: string[]): void {
    this.selectionLayout.sendNodesToBack(nodeIds)
  }

  getSelection(): DiagramEditorSelection {
    return this.selectionBridge.getSelection()
  }

  batchUpdateNodeProperties(
    nodeProps: Partial<DiagramNodeProperties>,
    nodeIds?: string[]
  ): void {
    if (!this.lf) return
    const ids = filterAlignableNodeIds(this.lf!, nodeIds?.length ? nodeIds : this.getSelectedNodeIds())
    const affectsLayout =
      nodeProps.x != null ||
      nodeProps.y != null ||
      nodeProps.width != null ||
      nodeProps.height != null ||
      (nodeProps as { left?: number; top?: number }).left != null ||
      (nodeProps as { left?: number; top?: number }).top != null
    for (const id of ids) {
      applyNodeProperties(this.lf, { id, ...nodeProps })
    }
    if (affectsLayout) {
      finalizeNodeLayoutChange(this.lf, ids)
      this.refreshMultiSelectResize?.()
      this.scheduleOverlayLayout()
    }
    this.scheduleGraphChange()
    this.selectionBridge.publishSelection()
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
    this.selectionBridge.publishSelection()
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
    return this.formatPainter.isActive()
  }

  startFormatPainter(): boolean {
    return this.formatPainter.start()
  }

  cancelFormatPainter(): void {
    this.formatPainter.cancel()
  }

  clearSelectionStyles(): void {
    this.selectionStyle.clearSelectionStyles()
  }

  recordCanvasPointer(clientX: number, clientY: number): void {
    if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) return
    this.lastCanvasPointerClient = { x: clientX, y: clientY }
  }

  getLastCanvasPointerClient(): { x: number; y: number } | null {
    return this.lastCanvasPointerClient ? { ...this.lastCanvasPointerClient } : null
  }

  /** 复制前选区规范化（快捷键 / 右键菜单共用，不调用 syncFromGraph 避免框选快照扩选） */
  private prepareSelectionForCopy(): void {
    const lf = this.lf
    if (!lf) return
    this.boxSelect.clearSnapshots()
    this.selectionBridge.scrubOrphanGroupLinks()
    suppressGroupFrameSelectionWhenMembersSelected(lf)
  }

  private bindCanvasPointerTracking(el: HTMLElement): () => void {
    const record = (event: PointerEvent) => {
      this.recordCanvasPointer(event.clientX, event.clientY)
    }
    el.addEventListener('pointerdown', record, true)
    el.addEventListener('pointermove', record, { passive: true, capture: true })
    return () => {
      el.removeEventListener('pointerdown', record, true)
      el.removeEventListener('pointermove', record, true)
    }
  }

  private getCanvasFrameEl(): HTMLElement | null {
    return this.container?.closest('.dg-canvas-frame') ?? null
  }

  destroy(): void {
    this.formatPainter.dispose()
    this.clipboard.clear()
    this.edgeInsert.dispose()
    this.groupFrames.dispose()
    this.canvasTheme.hideMiniMap()
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
    this.teardownCanvasPointer?.()
    this.teardownCanvasPointer = null
    this.lastCanvasPointerClient = null
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
    if (this.resizeSnapTimer) {
      clearTimeout(this.resizeSnapTimer)
      this.resizeSnapTimer = null
    }
    this.viewportChangeHandler = null
    setDiagramViewportChangeNotify(null)
    setDiagramActiveLogicFlow(null)
    this.selectionBridge.setPrimarySelection(null, null)
  }

  loadGraph(data: unknown): void {
    this.graphLoad.loadGraph(data)
  }

  getGraph(): unknown {
    return normalizeDiagramGraph(this.lf?.getGraphData() ?? { nodes: [], edges: [] })
  }

  applyPatch(patch: CanvasGraphPatch): void {
    if (!this.lf) return
    applyDiagramCanvasGraphPatch(this.lf, patch)
  }

  setTheme(resolved: 'light' | 'dark'): void {
    setDiagramEdgeAccent(resolved)
    this.canvasTheme.setTheme(resolved)
  }

  getCanvasSettings(): DiagramCanvasSettings {
    return { ...this.canvasSettings }
  }

  loadCanvasSettings(settings: DiagramCanvasSettings | undefined): void {
    this.canvasTheme.loadCanvasSettings(settings)
    setDiagramCanvasSnapGrid(this.canvasSettings.snapGrid)
  }

  applyCanvasSettings(settings: Partial<DiagramCanvasSettings>): void {
    this.canvasTheme.applyCanvasSettings(settings)
    setDiagramCanvasSnapGrid(this.canvasSettings.snapGrid)
  }

  updateNodeProperties(props: Partial<DiagramNodeProperties> & { id: string }): void {
    if (!this.lf) return
    const layoutProps = props as Partial<DiagramNodeProperties> & { left?: number; top?: number }
    const affectsLayout =
      layoutProps.x != null ||
      layoutProps.y != null ||
      layoutProps.left != null ||
      layoutProps.top != null ||
      layoutProps.width != null ||
      layoutProps.height != null
    applyNodeProperties(this.lf, props)
    if (affectsLayout) {
      finalizeNodeLayoutChange(this.lf, [props.id])
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
    this.selectionBridge.publishSelectionIfSelected({ edgeId: props.id })
  }

  private refreshAxisOverlay(): void {
    this.teardownAxis?.()
    this.teardownAxis = null
    const lf = this.lf
    const container = this.container
    container?.classList.remove('dg-center-axis-visible')
    if (!lf || !this.canvasSettings.centerAxisVisible) return

    this.teardownAxis = mountDiagramAxisOverlay(lf, () => diagramAxisStyle(this.resolvedTheme))
    container?.classList.add('dg-center-axis-visible')
  }

  async exportPng(): Promise<Blob> {
    return this.exportCoordinator.exportPng()
  }

  async exportSvg(): Promise<string> {
    return this.exportCoordinator.exportSvg()
  }

  undo(): void {
    this.lf?.undo()
  }

  redo(): void {
    this.lf?.redo()
  }

  zoom(delta?: number, scale?: number): void {
    if (!this.lf) return
    zoomDiagramCanvas(this.lf, delta, scale)
    this.viewportChangeHandler?.()
  }

  zoomToFit(): void {
    this.lf?.fitView()
    this.viewportChangeHandler?.()
  }

  zoomReset(): void {
    if (!this.lf) return
    zoomDiagramCanvas(this.lf, undefined, 1)
    this.viewportChangeHandler?.()
  }

  centerContent(): void {
    if (!this.lf) return
    if (!centerDiagramOnContent(this.lf)) {
      this.centerOrigin()
      return
    }
    this.viewportChangeHandler?.()
  }

  centerOrigin(): void {
    if (!this.lf) return
    centerDiagramOnOrigin(this.lf)
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
    this.canvasTheme.patchBackgroundDom(bg)
  }

  getViewport(): DiagramViewport {
    if (!this.lf) return { x: 0, y: 0, zoom: 1 }
    return getDiagramViewport(this.lf)
  }

  applyViewport(viewport: DiagramViewport): void {
    if (!this.lf) return
    try {
      this.resize()
      applyDiagramViewport(this.lf, viewport)
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
    this.selectionBridge.publishSelection()
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
    this.selectionBridge.publishSelection()
  }

  deleteSelection(nodeIds?: string[], edgeIds?: string[]): Promise<void> {
    return this.groupSelectionCoordinator.deleteSelection(nodeIds, edgeIds)
  }

  copy(): void {
    this.clipboard.copy()
  }

  paste(clientX?: number, clientY?: number): void {
    this.clipboard.paste(clientX, clientY)
    requestAnimationFrame(() => {
      this.selectionBridge.syncFromGraph()
      this.groupFrames.refreshDisplay()
      this.refreshMultiSelectResize?.()
      this.scheduleOverlayLayout()
    })
  }

  canUngroupSelection(): boolean {
    return this.groupSelectionCoordinator.canUngroupSelection()
  }

  canGroupSelection(): boolean {
    return this.groupSelectionCoordinator.canGroupSelection()
  }

  groupSelection(nodeIds?: string[], edgeIds?: string[]): void {
    this.groupSelectionCoordinator.groupSelection(nodeIds, edgeIds)
  }

  ungroupSelection(): void {
    this.groupSelectionCoordinator.ungroupSelection()
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
    if (!applyDiagramNodePatch(this.lf, nodeId, patch)) return
    this.scheduleGraphChange()
    this.refreshSelectionIfNodeInSelection(nodeId)
  }

  /** 属性变更后刷新选区快照（仅当选中目标包含该节点，避免覆盖用户已切换的选区） */
  private refreshSelectionIfNodeInSelection(nodeId: string): void {
    this.selectionBridge.publishSelectionIfSelected({ nodeId })
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
