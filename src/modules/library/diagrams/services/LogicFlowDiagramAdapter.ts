import LogicFlow, { OverlapMode } from '@logicflow/core'
import type { CanvasGraphPatch, DiagramViewport, IDiagramEditorPort } from '@modules/library/diagrams/interfaces/IDiagramEditorPort'
import {
  backgroundForPreset,
  logicFlowThemeForPreset,
  resolveThemeFromPreset
} from '@modules/library/diagrams/lib/diagramCanvasPresets'
import {
  DIAGRAM_GRID_SIZE,
  diagramAxisStyle,
  diagramCanvasBackground,
  type DiagramCanvasTheme
} from '@modules/library/diagrams/lib/diagramCanvasTheme'
import { mountDiagramAxisOverlay } from '@modules/library/diagrams/lib/diagramAxisOverlay'
import { mountDiagramMultiSelectResize, getMultiSelectOverlayRect } from '@modules/library/diagrams/lib/diagramMultiSelectResize'
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
import { readNodeShapeExtension } from '@modules/library/diagrams/domain/shape-extension/diagramShapeBridge'
import {
  DG_SHAPE_HIT_EVENT,
  type DiagramShapeHitPayload
} from '@modules/library/diagrams/domain/shape-extension/types'
import {
  isEdgeInSelectionBox,
  isForwardBoxSelect,
  isNodeInSelectionBox
} from '@modules/library/diagrams/lib/diagramBoxSelection'
import {
  buildSplitEdgeConfigs,
  findNearestEdgeIdAtPoint,
  isPointInsideNode,
  isPointNearEdgePolyline
} from '@modules/library/diagrams/lib/diagramEdgeInsert'
import { setDiagramEdgeAccent, setEdgeInsertHighlightId } from '@modules/library/diagrams/lib/diagramShapeRegs'
import type {
  DiagramCanvasSettings,
  DiagramEdgeProperties,
  DiagramEditorSelection,
  DiagramNodeProperties
} from '@modules/library/diagrams/lib/diagramSelectionTypes'
import { defaultCanvasSettings } from '@modules/library/diagrams/lib/diagramSelectionTypes'
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
  clearGroupFramePointerInside,
  resolveGroupFrameIdForElement,
  setGroupFramePointerInside,
  syncGroupFramePointerHover
} from '@modules/library/diagrams/lib/diagramGroupFrame'
import {
  collectGroupIdsForNodes,
  ensureAllGroupFramesAtBottom,
  ensureGroupFrameAtBottom,
  syncGroupFramesForNodes
} from '@modules/library/diagrams/lib/diagramGroupBounds'
import {
  refreshSnapAlignGuide,
  snapCanvasPoint,
  snapNodesAfterDrag,
  softSnapNodesDuringDrag
} from '@modules/library/diagrams/lib/diagramGridSnap'
import { snapCoordinateToGrid } from '@modules/library/diagrams/lib/diagramCanvasTheme'
import {
  activateEdgeEndpointPriority,
  finishAdjustPointDrag,
  refreshEdgeEndpointPriorityFromPointer,
  resetEdgeEndpointPriority,
  setAdjustPointDragging,
  suppressNodeAnchorIfEdgePriority
} from '@modules/library/diagrams/lib/diagramEdgeEndpointPriority'
import {
  cancelAllPendingUmlClassifierHitClicks
} from '@modules/library/diagrams/extensions/uml/kinds/umlClassifierRegs'
import {
  applyEdgeStyleSnapshot,
  applyNodeStyleSnapshot,
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
  private edgeInsertDragRaf: number | null = null
  private groupSyncDragRaf: number | null = null
  private resizeSnapTimer: ReturnType<typeof setTimeout> | null = null
  private viewportChangeHandler: (() => void) | null = null
  private resolvedTheme: DiagramCanvasTheme = 'light'
  private canvasSettings: DiagramCanvasSettings = defaultCanvasSettings('light')
  private selectedNodeId: string | null = null
  private selectedEdgeId: string | null = null
  private teardownAxis: (() => void) | null = null
  private teardownMultiSelectResize: (() => void) | null = null
  private refreshMultiSelectResize: (() => void) | null = null
  private overlayLayoutHandler: (() => void) | null = null
  private teardownMiddlePan: (() => void) | null = null
  private teardownContextMenu: (() => void) | null = null
  private teardownEdgeEndpointPriority: (() => void) | null = null
  private contextMenuHandler:
    | ((detail: {
        event: MouseEvent
        kind: 'node' | 'edge' | 'blank'
        targetId?: string
        nodeIds: string[]
        edgeIds: string[]
      }) => void)
    | null = null
  private shapePanelFocusHandler: ((request: DiagramShapeHitPayload) => void) | null = null
  private teardownShapeHit: (() => void) | null = null
  private middlePanning = false
  private boxSelectOverlayStart: { x: number; y: number } | null = null
  private boxSelectOverlayEnd: { x: number; y: number } | null = null
  private boxSelectTeardown: (() => void) | null = null
  private groupDragLastPos = new Map<string, { x: number; y: number }>()
  private lastSelectedNodeIds: string[] = []
  private lastSelectedEdgeIds: string[] = []
  private edgeInsertHighlightId: string | null = null
  private edgeInsertDragNodeIds: string[] = []
  private groupFramesBottomRaf: number | null = null
  private groupFrameHoverRaf = 0
  private teardownGroupFrameHover: (() => void) | null = null
  private lastPointerClient = { x: 0, y: 0 }
  private formatPainterState: {
    active: boolean
    kind: DiagramFormatPainterKind
    sourceId: string
    nodeSnapshot?: DiagramNodeStyleSnapshot
    edgeSnapshot?: DiagramEdgeStyleSnapshot
  } | null = null

  mount(el: HTMLElement): void {
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
      this.emitSelection()
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
      this.scheduleOverlayLayout()
      this.scheduleGraphChange()
    }, 120)
  }

  private overlayLayoutRaf: number | null = null

  private scheduleOverlayLayout(): void {
    if (this.overlayLayoutRaf != null) return
    this.overlayLayoutRaf = requestAnimationFrame(() => {
      this.overlayLayoutRaf = null
      this.overlayLayoutHandler?.()
    })
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
    this.refreshAxisOverlay()
    this.bindEvents()
    this.enableBoxSelection()
    this.teardownMiddlePan = this.bindMiddleMousePan(el)
    this.teardownContextMenu = this.bindContextMenu(el)
    this.teardownGroupFrameHover = this.bindGroupFramePointerHover(el)
    const multiSelectResize = mountDiagramMultiSelectResize(
      this.lf,
      () => {
        this.syncGroupFramesForSelectedNodes(this.getSelectedContentNodeIds())
        this.scheduleGraphChange()
        this.syncSelectionFromGraph()
      },
      () => this.scheduleOverlayLayout(),
      () => this.scheduleGroupFrameSyncDuringDrag()
    )
    this.teardownMultiSelectResize = multiSelectResize.destroy
    this.refreshMultiSelectResize = multiSelectResize.refresh
  }

  /** 左键框选：禁用左键拖动画布后由 SelectionSelect 接管空白区拖拽 */
  private enableBoxSelection(): void {
    if (!this.lf) return
    const ext = this.lf.extension?.selectionSelect as
      | {
          openSelectionSelect?: () => void
          setExclusiveMode?: (exclusive?: boolean) => void
          setSelectionSense?: (isWholeEdge?: boolean, isWholeNode?: boolean) => void
        }
      | undefined
    ext?.setExclusiveMode?.(false)
    // 正向框选要求整节点/整边落入选区；反向框选由 selection:selected 中按方向覆盖
    ext?.setSelectionSense?.(true, true)
    ext?.openSelectionSelect?.()
    const lfWithSelect = this.lf as LogicFlow & { openSelectionSelect?: () => void }
    lfWithSelect.openSelectionSelect?.()
  }

  private setBoxSelectionPaused(paused: boolean): void {
    if (!this.lf) return
    const ext = this.lf.extension?.selectionSelect as
      | { closeSelectionSelect?: () => void; openSelectionSelect?: () => void }
      | undefined
    if (paused) {
      ext?.closeSelectionSelect?.()
      this.cleanupActiveBoxSelect()
    } else {
      ext?.openSelectionSelect?.()
    }
  }

  private cleanupActiveBoxSelect(): void {
    this.boxSelectOverlayStart = null
    this.boxSelectOverlayEnd = null
    this.boxSelectTeardown?.()
    this.boxSelectTeardown = null
  }

  private updateBoxSelectVisual(isContain: boolean): void {
    const wrap = this.container?.querySelector('.lf-selection-select')
    if (!wrap) return
    wrap.classList.toggle('dg-selection-box--contain', isContain)
    wrap.classList.toggle('dg-selection-box--intersect', !isContain)
  }

  private armBoxSelectOverlay(e: MouseEvent): void {
    if (!this.lf || e.button !== 0 || this.middlePanning || this.boxSelectTeardown) return
    const pt = this.lf.getPointByClient({ x: e.clientX, y: e.clientY }).domOverlayPosition
    this.boxSelectOverlayStart = { x: pt.x, y: pt.y }
    this.boxSelectOverlayEnd = { x: pt.x, y: pt.y }

    const onMove = (ev: PointerEvent) => {
      const endPt = this.lf!.getPointByClient({ x: ev.clientX, y: ev.clientY }).domOverlayPosition
      this.boxSelectOverlayEnd = { x: endPt.x, y: endPt.y }
      this.updateBoxSelectVisual(isForwardBoxSelect(pt.x, pt.y, endPt.x, endPt.y))
    }
    const onUp = (ev: PointerEvent) => {
      if (ev.button !== 0) return
      const endPt = this.lf!.getPointByClient({ x: ev.clientX, y: ev.clientY }).domOverlayPosition
      this.boxSelectOverlayEnd = { x: endPt.x, y: endPt.y }
      document.removeEventListener('pointermove', onMove, true)
      document.removeEventListener('pointerup', onUp, true)
      this.boxSelectTeardown = null
    }
    document.addEventListener('pointermove', onMove, true)
    document.addEventListener('pointerup', onUp, true)
    this.boxSelectTeardown = () => {
      document.removeEventListener('pointermove', onMove, true)
      document.removeEventListener('pointerup', onUp, true)
    }
  }

  private domSelectionBoxToCanvas(
    leftTop: [number, number],
    rightBottom: [number, number]
  ): { leftTop: [number, number]; rightBottom: [number, number] } {
    if (!this.lf) {
      return { leftTop, rightBottom }
    }
    const minX = Math.min(leftTop[0], rightBottom[0])
    const minY = Math.min(leftTop[1], rightBottom[1])
    const maxX = Math.max(leftTop[0], rightBottom[0])
    const maxY = Math.max(leftTop[1], rightBottom[1])
    const tl = this.lf.graphModel.transformModel.HtmlPointToCanvasPoint([minX, minY])
    const rb = this.lf.graphModel.transformModel.HtmlPointToCanvasPoint([maxX, maxY])
    return { leftTop: [tl[0], tl[1]], rightBottom: [rb[0], rb[1]] }
  }

  /** 中键平移视图（捕获阶段拦截，避免 LogicFlow blank pointerup 误清选区） */
  private bindMiddleMousePan(el: HTMLElement): () => void {
    let panning = false
    let lastX = 0
    let lastY = 0
    let lastMiddleDownAt = 0
    let lastMiddleDownX = 0
    let lastMiddleDownY = 0

    const blockMiddlePointer = (event: PointerEvent) => {
      if (event.button !== 1) return
      event.preventDefault()
      event.stopImmediatePropagation()
    }

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 1) return
      blockMiddlePointer(event)

      const now = Date.now()
      const isDoubleClick =
        now - lastMiddleDownAt < 400 &&
        Math.hypot(event.clientX - lastMiddleDownX, event.clientY - lastMiddleDownY) < 6

      if (isDoubleClick) {
        lastMiddleDownAt = 0
        this.centerContent()
        return
      }

      lastMiddleDownAt = now
      lastMiddleDownX = event.clientX
      lastMiddleDownY = event.clientY

      panning = true
      this.middlePanning = true
      this.setBoxSelectionPaused(true)
      lastX = event.clientX
      lastY = event.clientY
      el.style.cursor = 'grabbing'
    }

    const onPointerMove = (event: PointerEvent) => {
      if (!panning || !this.lf) return
      const dx = event.clientX - lastX
      const dy = event.clientY - lastY
      lastX = event.clientX
      lastY = event.clientY
      this.lf.translate(dx, dy)
    }

    const endPan = () => {
      if (!panning) return
      panning = false
      this.middlePanning = false
      this.setBoxSelectionPaused(false)
      el.style.cursor = ''
      this.viewportChangeHandler?.()
    }

    const onPointerUp = (event: PointerEvent) => {
      if (event.button !== 1) return
      blockMiddlePointer(event)
      endPan()
    }

    const onAuxClick = (event: MouseEvent) => {
      if (event.button !== 1) return
      event.preventDefault()
      event.stopImmediatePropagation()
    }

    el.addEventListener('pointerdown', onPointerDown, true)
    el.addEventListener('pointerup', onPointerUp, true)
    el.addEventListener('auxclick', onAuxClick, true)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)

    return () => {
      el.removeEventListener('pointerdown', onPointerDown, true)
      el.removeEventListener('pointerup', onPointerUp, true)
      el.removeEventListener('auxclick', onAuxClick, true)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      el.style.cursor = ''
      this.middlePanning = false
    }
  }

  private bindEvents(): void {
    if (!this.lf) return

    this.lf.on('node:click', ({ data, e }) => {
      if (this.lf) cancelAllPendingUmlClassifierHitClicks(this.lf)
      const append = Boolean(e?.ctrlKey || e?.metaKey || e?.shiftKey)
      if (!append && this.lf) {
        for (const edge of this.lf.getSelectElements(true).edges) {
          this.lf.deselectElementById(edge.id)
        }
      }
      if (this.formatPainterState?.active && this.formatPainterState.kind === 'node' && this.lf) {
        applyNodeStyleSnapshot(this.lf, data.id, this.formatPainterState.nodeSnapshot!)
        syncGroupFramesForNodes(this.lf, [data.id])
        this.refreshGroupFrameDisplay()
        this.scheduleGraphChange()
      }
      this.syncSelectionFromGraph()
      this.scheduleGroupFramesToBottom()
    })

    const onShapeHit = (payload: DiagramShapeHitPayload) => {
      this.handleShapeExtensionHit(payload)
    }
    this.lf.graphModel.eventCenter.on(DG_SHAPE_HIT_EVENT, onShapeHit)
    this.teardownShapeHit = () => {
      this.lf?.graphModel.eventCenter.off(DG_SHAPE_HIT_EVENT, onShapeHit)
    }

    this.lf.on('edge:click', ({ data, e }) => {
      if (this.lf) cancelAllPendingUmlClassifierHitClicks(this.lf)
      if (this.formatPainterState?.active && this.formatPainterState.kind === 'edge' && this.lf) {
        applyEdgeStyleSnapshot(this.lf, data.id, this.formatPainterState.edgeSnapshot!)
        this.scheduleGraphChange()
      }
      const append = Boolean(e?.ctrlKey || e?.metaKey || e?.shiftKey)
      if (!append && this.lf) {
        for (const node of this.lf.getSelectElements(true).nodes) {
          this.lf.deselectElementById(node.id)
        }
      }
      if (append && this.lastSelectedEdgeIds.includes(data.id)) {
        this.lf?.deselectElementById(data.id)
      }
      activateEdgeEndpointPriority(this.lf!, data.id, this.container)
      this.syncSelectionFromGraph()
    })

    this.lf.on('edge:add', ({ data }) => {
      this.applyDefaultEdgeStyle(data.id)
      this.selectedEdgeId = data.id
      this.selectedNodeId = null
      this.scheduleGraphChange()
      this.emitSelection()
    })

    this.lf.on('edge:delete', () => {
      resetEdgeEndpointPriority(this.lf, this.container)
    })

    this.lf.on('blank:click', ({ e }) => {
      if (this.middlePanning) return
      const button = (e as MouseEvent | PointerEvent | undefined)?.button
      if (button !== undefined && button !== 0) return
      if (this.lf) cancelAllPendingUmlClassifierHitClicks(this.lf)
      this.cancelFormatPainter()
      this.lf?.clearSelectElements()
      this.lf?.removeNodeSnapLine()
      this.cleanupActiveBoxSelect()
      resetEdgeEndpointPriority(this.lf, this.container)
      this.syncSelectionFromGraph()
      this.refreshMultiSelectResize?.()
      this.scheduleOverlayLayout()
    })

    this.lf.on('blank:mousedown', ({ e }) => {
      this.armBoxSelectOverlay(e)
    })

    this.lf.on('selection:mousedown', ({ e }) => {
      this.armBoxSelectOverlay(e)
    })

    this.lf.on('selection:selected', (payload: {
      leftTopPoint: [number, number]
      rightBottomPoint: [number, number]
    }) => {
      if (!this.lf) return
      const sx = this.boxSelectOverlayStart?.x
      const sy = this.boxSelectOverlayStart?.y
      const ex = this.boxSelectOverlayEnd?.x ?? payload.rightBottomPoint[0]
      const ey = this.boxSelectOverlayEnd?.y ?? payload.rightBottomPoint[1]
      const isContain = sx == null || sy == null ? true : isForwardBoxSelect(sx, sy, ex, ey)
      const canvasBox = this.domSelectionBoxToCanvas(payload.leftTopPoint, payload.rightBottomPoint)

      this.lf.clearSelectElements()
      for (const model of this.lf.graphModel.nodes) {
        if (model.type === DIAGRAM_GROUP_FRAME_TYPE) continue
        if (!isNodeInSelectionBox(model, canvasBox.leftTop, canvasBox.rightBottom, isContain)) continue
        this.lf.selectElementById(model.id, true)
      }
      for (const model of this.lf.graphModel.edges) {
        if (!isEdgeInSelectionBox(model, canvasBox.leftTop, canvasBox.rightBottom, isContain)) continue
        this.lf.selectElementById(model.id, true)
      }
      this.cleanupActiveBoxSelect()
      this.syncSelectionFromGraph()
      this.scheduleGroupFramesToBottom()
    })

    this.lf.on('node:mouseup', ({ data }) => {
      if (this.isGroupFrameId(data.id)) {
        this.scheduleGroupFramesToBottom()
      }
    })

    this.lf.on('selection:mouseup', () => {
      this.syncSelectionFromGraph()
    })

    this.lf.on('node:dragstart', ({ data }) => {
      const model = this.lf?.getNodeModelById(data.id)
      this.edgeInsertDragNodeIds = this.getSelectedNodeIds().includes(data.id)
        ? this.getSelectedNodeIds().filter((id) => {
            const node = this.lf?.getNodeModelById(id)
            return node && node.type !== DIAGRAM_GROUP_FRAME_TYPE
          })
        : [data.id]
      if (model?.type === DIAGRAM_GROUP_FRAME_TYPE) {
        this.groupDragLastPos.set(data.id, { x: model.x, y: model.y })
      }
    })

    this.lf.on('node:drag', ({ data }) => {
      if (!this.lf) return
      const model = this.lf.getNodeModelById(data.id)
      if (model && model.type !== DIAGRAM_GROUP_FRAME_TYPE) {
        const inGroup =
          typeof model.properties?.dgGroupId === 'string' && Boolean(model.properties.dgGroupId)
        if (inGroup || this.countSelectedNodes() >= 2) {
          this.scheduleGroupFrameSyncDuringDrag(data.id)
        }
        if (this.edgeInsertDragRaf == null) {
          const nodeId = data.id
          const dragIds = this.edgeInsertDragNodeIds
          this.edgeInsertDragRaf = requestAnimationFrame(() => {
            this.edgeInsertDragRaf = null
            if (!this.lf) return
            const dragged = this.lf.getNodeModelById(nodeId)
            if (!dragged) return
            const edgeId = this.findEdgeAtCanvasPoint(dragged.x, dragged.y, 16, {
              excludeNodeIds: dragIds
            })
            this.setEdgeInsertHighlight(edgeId)
          })
        }
      }
      if (model?.type === DIAGRAM_GROUP_FRAME_TYPE) {
        const last = this.groupDragLastPos.get(data.id)
        if (!last) return
        const dx = model.x - last.x
        const dy = model.y - last.y
        if (dx === 0 && dy === 0) return
        const members = (model.properties?.dgGroupMembers as string[] | undefined) ?? []
        if (members.length) {
          this.lf.graphModel.moveNodes(members, dx, dy, true)
        }
        this.groupDragLastPos.set(data.id, { x: model.x, y: model.y })
      }
      if (this.countSelectedNodes() === 1 && this.selectedNodeId === data.id) {
        this.scheduleEmitSelection()
      }
      if (this.canvasSettings.snapGrid) {
        const affected = this.getSelectedNodeIds()
        const snapTargets = affected.includes(data.id) ? affected : [data.id]
        softSnapNodesDuringDrag(this.lf, snapTargets, true, data.id)
        refreshSnapAlignGuide(this.lf, data.id, true)
      }
      if (this.countSelectedNodes() >= 2) {
        this.refreshMultiSelectResize?.()
        this.scheduleOverlayLayout()
      }
    })

    // LogicFlow 多选框拖拽走 selection:drag，不走 node:drag
    this.lf.on('selection:drag', () => {
      this.scheduleGroupFrameSyncDuringDrag()
      this.refreshMultiSelectResize?.()
      this.scheduleOverlayLayout()
    })

    this.lf.on('selection:drop', () => {
      this.syncGroupFramesForSelectedNodes(this.getSelectedContentNodeIds())
      this.refreshMultiSelectResize?.()
      this.scheduleOverlayLayout()
      this.syncSelectionFromGraph()
    })

    this.lf.on('node:drop', ({ data }) => {
      const highlightEdgeId = this.edgeInsertHighlightId
      const dragNodeIds = [...this.edgeInsertDragNodeIds]
      this.edgeInsertDragNodeIds = []
      this.groupDragLastPos.delete(data.id)
      if (!this.lf) return
      if (highlightEdgeId && dragNodeIds.length === 1) {
        this.insertExistingNodeOnEdge(dragNodeIds[0], highlightEdgeId)
      } else {
        this.setEdgeInsertHighlight(null)
      }
      this.lf.removeNodeSnapLine()
      const affected = this.getSelectedNodeIds()
      const snapTargets = affected.includes(data.id) ? affected : [data.id]
      snapNodesAfterDrag(this.lf, snapTargets, this.canvasSettings.snapGrid, data.id)
      const syncIds = (affected.includes(data.id) ? affected : [data.id]).filter(
        (id) => !this.isGroupFrameId(id)
      )
      this.syncGroupFramesForSelectedNodes(syncIds)
      this.scheduleOverlayLayout()
      this.refreshMultiSelectResize?.()
    })

    for (const evt of [
      'node:add',
      'node:delete',
      'edge:delete',
      'node:drop',
      'node:resize',
      'node:rotate',
      'node:properties-change',
      'edge:adjust',
      'history:change'
    ] as const) {
      this.lf.on(evt, (arg: unknown) => {
        this.scheduleGraphChange()
        if (evt === 'node:drop') {
          for (const id of this.getSelectedNodeIds()) {
            const model = this.lf?.getNodeModelById(id)
            if (model) syncNodeTextLayout(model)
          }
        }
        if (evt === 'node:resize' && this.lf) {
          const payload = arg as { data?: { id: string }; model?: { id: string } } | undefined
          const nodeId = payload?.data?.id ?? payload?.model?.id
          const model = nodeId ? this.lf.getNodeModelById(nodeId) : undefined
          if (model) {
            syncNodeTextLayout(model)
            this.scheduleResizeFollowUp(model.id)
          }
        }
        if (evt === 'node:drop' || evt === 'node:resize' || evt === 'history:change') {
          this.syncSelectionFromGraph()
          this.scheduleGroupFramesToBottom()
        }
      })
    }

    this.lf.on('text:update', () => {
      this.scheduleGraphChange()
      this.syncSelectionFromGraph()
    })

    this.lf.on('graph:transform', () => {
      this.viewportChangeHandler?.()
      if (this.countSelectedNodes() >= 2) {
        this.scheduleOverlayLayout()
        this.refreshMultiSelectResize?.()
      }
    })

    this.bindEdgeEndpointPriority()
  }

  private bindEdgeEndpointPriority(): void {
    if (!this.lf || !this.container) return
    const lf = this.lf
    const container = this.container
    let pointerRaf = 0

    const onEdgeMouseEnter = ({ data }: { data: { id: string } }) => {
      activateEdgeEndpointPriority(lf, data.id, container)
    }

    const onNodeMouseEnter = ({ data }: { data: { id: string } }) => {
      suppressNodeAnchorIfEdgePriority(lf, data.id)
    }

    const onAdjustDragStart = ({ data }: { data?: { edgeData?: { id?: string } } }) => {
      setAdjustPointDragging(true)
      const edgeId = data?.edgeData?.id
      if (edgeId) {
        activateEdgeEndpointPriority(lf, edgeId, container)
      }
    }

    const onAdjustDrag = () => {
      this.scheduleGraphChange()
      this.scheduleOverlayLayout()
      this.refreshMultiSelectResize?.()
    }

    const onAdjustDragEnd = () => {
      finishAdjustPointDrag(lf, container)
      this.scheduleGraphChange()
    }

    const onPointerMove = (e: PointerEvent) => {
      if (pointerRaf) return
      pointerRaf = requestAnimationFrame(() => {
        pointerRaf = 0
        refreshEdgeEndpointPriorityFromPointer(lf, e.clientX, e.clientY, container)
      })
    }

    lf.on('edge:mouseenter', onEdgeMouseEnter)
    lf.on('node:mouseenter', onNodeMouseEnter)
    lf.on('adjustPoint:dragstart', onAdjustDragStart)
    lf.on('adjustPoint:drag', onAdjustDrag)
    lf.on('adjustPoint:dragend', onAdjustDragEnd)
    container.addEventListener('pointermove', onPointerMove, { passive: true })

    this.teardownEdgeEndpointPriority = () => {
      if (pointerRaf) cancelAnimationFrame(pointerRaf)
      lf.off('edge:mouseenter', onEdgeMouseEnter)
      lf.off('node:mouseenter', onNodeMouseEnter)
      lf.off('adjustPoint:dragstart', onAdjustDragStart)
      lf.off('adjustPoint:drag', onAdjustDrag)
      lf.off('adjustPoint:dragend', onAdjustDragEnd)
      container.removeEventListener('pointermove', onPointerMove)
      resetEdgeEndpointPriority(lf, container)
    }
  }

  /** 从 LogicFlow 当前选区读取主节点/连线（属性面板须以此为准，勿用陈旧缓存） */
  private readLiveSelection(): {
    selectedNodeIds: string[]
    selectedEdgeIds: string[]
    primaryNodeId: string | null
    primaryEdgeId: string | null
  } {
    if (!this.lf) {
      return {
        selectedNodeIds: [],
        selectedEdgeIds: [],
        primaryNodeId: null,
        primaryEdgeId: null
      }
    }
    const selected = this.lf.getSelectElements(true)
    const selectedNodeIds = selected.nodes.map((n) => n.id)
    const selectedEdgeIds = selected.edges.map((e) => e.id)
    const primaryNode =
      selected.nodes.find((n) => !this.isGroupFrameId(n.id)) ??
      selected.nodes.find((n) => this.isGroupFrameId(n.id))
    return {
      selectedNodeIds,
      selectedEdgeIds,
      primaryNodeId: primaryNode?.id ?? null,
      primaryEdgeId: selected.edges[0]?.id ?? null
    }
  }

  private syncSelectionFromGraph(): void {
    if (!this.lf) return
    const live = this.readLiveSelection()
    this.lastSelectedNodeIds = live.selectedNodeIds
    this.lastSelectedEdgeIds = live.selectedEdgeIds
    this.selectedNodeId = live.primaryNodeId
    this.selectedEdgeId = live.primaryEdgeId
    this.refreshGroupFrameDisplay()
    this.scheduleEmitSelection()
    this.scheduleGroupFramesToBottom()
  }

  /** LogicFlow overlapMode 会把选中节点置顶，组合框需在下一帧强制置底 */
  private scheduleGroupFramesToBottom(): void {
    if (!this.lf || this.groupFramesBottomRaf != null) return
    this.groupFramesBottomRaf = requestAnimationFrame(() => {
      this.groupFramesBottomRaf = requestAnimationFrame(() => {
        this.groupFramesBottomRaf = null
        if (this.lf) ensureAllGroupFramesAtBottom(this.lf)
      })
    })
  }

  private bindGroupFramePointerHover(el: HTMLElement): () => void {
    const lf = this.lf
    let pending: PointerEvent | null = null
    const scheduleHoverUpdate = (clientX: number, clientY: number) => {
      this.lastPointerClient = { x: clientX, y: clientY }
      if (this.groupFrameHoverRaf) return
      this.groupFrameHoverRaf = requestAnimationFrame(() => {
        this.groupFrameHoverRaf = 0
        this.updateGroupFramePointerHover(this.lastPointerClient.x, this.lastPointerClient.y)
        this.updateFormatPainterCursor(this.lastPointerClient.x, this.lastPointerClient.y)
      })
    }
    const onMove = (event: PointerEvent) => {
      pending = event
      scheduleHoverUpdate(event.clientX, event.clientY)
    }
    const onEnter = (event: PointerEvent) => {
      scheduleHoverUpdate(event.clientX, event.clientY)
    }
    const onLeave = () => {
      pending = null
      clearGroupFramePointerInside()
      this.refreshGroupFrameDisplay()
      this.updateFormatPainterCursor(0, 0)
    }
    const onNodeEnter = ({ data }: { data: { id: string } }) => {
      this.markGroupFrameHoverFromElement(data.id, 'node')
    }
    const onEdgeEnter = ({ data }: { data: { id: string } }) => {
      this.markGroupFrameHoverFromElement(data.id, 'edge')
    }
    el.addEventListener('pointermove', onMove, { passive: true })
    el.addEventListener('pointerenter', onEnter)
    el.addEventListener('pointerleave', onLeave)
    lf?.on('node:mouseenter', onNodeEnter)
    lf?.on('edge:mouseenter', onEdgeEnter)
    return () => {
      if (this.groupFrameHoverRaf) cancelAnimationFrame(this.groupFrameHoverRaf)
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerenter', onEnter)
      el.removeEventListener('pointerleave', onLeave)
      lf?.off('node:mouseenter', onNodeEnter)
      lf?.off('edge:mouseenter', onEdgeEnter)
      clearGroupFramePointerInside()
    }
  }

  private markGroupFrameHoverFromElement(elementId: string, kind: 'node' | 'edge'): void {
    if (!this.lf) return
    const groupId = resolveGroupFrameIdForElement(this.lf, elementId, kind)
    if (groupId) {
      for (const model of this.lf.graphModel.nodes) {
        if (model.type !== DIAGRAM_GROUP_FRAME_TYPE) continue
        setGroupFramePointerInside(model.id, model.id === groupId)
      }
      this.refreshGroupFrameDisplay()
      return
    }
    this.updateGroupFramePointerHover(this.lastPointerClient.x, this.lastPointerClient.y)
  }

  private updateGroupFramePointerHover(clientX: number, clientY: number): void {
    if (!this.lf) return
    this.lastPointerClient = { x: clientX, y: clientY }
    const { x, y } = this.clientToCanvas(clientX, clientY)
    syncGroupFramePointerHover(this.lf, x, y)
    this.refreshGroupFrameDisplay()
  }

  /** 成员选中时刷新组合框描边/填充显示 */
  private refreshGroupFrameDisplay(): void {
    if (!this.lf) return
    for (const model of this.lf.graphModel.nodes) {
      if (model.type !== DIAGRAM_GROUP_FRAME_TYPE) continue
      if ('setAttributes' in model && typeof model.setAttributes === 'function') {
        ;(model as { setAttributes: () => void }).setAttributes()
      }
    }
  }

  private getSelectedContentNodeIds(): string[] {
    return this.getSelectedNodeIds().filter((id) => !this.isGroupFrameId(id))
  }

  private syncGroupFramesForSelectedNodes(nodeIds: string[]): void {
    if (!this.lf || !nodeIds.length) return
    syncGroupFramesForNodes(this.lf, nodeIds)
    this.refreshGroupFrameDisplay()
  }

  /** 拖拽过程中按帧同步组合框（单选组成员 / 多选 / LogicFlow 选区拖拽） */
  private scheduleGroupFrameSyncDuringDrag(triggerNodeId?: string): void {
    if (this.groupSyncDragRaf != null) return
    this.groupSyncDragRaf = requestAnimationFrame(() => {
      this.groupSyncDragRaf = null
      if (!this.lf) return
      const contentSelected = this.getSelectedContentNodeIds()
      let syncIds: string[]
      if (contentSelected.length >= 2) {
        syncIds = contentSelected
      } else if (triggerNodeId) {
        syncIds = [triggerNodeId]
      } else {
        syncIds = contentSelected
      }
      if (!syncIds.length) return
      this.syncGroupFramesForSelectedNodes(syncIds)
    })
  }

  private emitSelection(): void {
    this.selectionHandler?.(this.getSelection())
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

  onOverlayLayoutChange(handler: () => void): void {
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

  onShapePanelFocus(handler: ((request: DiagramShapeHitPayload) => void) | null): void {
    this.shapePanelFocusHandler = handler
  }

  /** @deprecated 使用 onShapePanelFocus */
  onUmlPanelFocus(handler: ((request: DiagramShapeHitPayload) => void) | null): void {
    this.onShapePanelFocus(handler)
  }

  private handleShapeExtensionHit(payload: DiagramShapeHitPayload): void {
    if (!this.lf) return
    const model = this.lf.getNodeModelById(payload.nodeId)
    if (!model) return
    const ext = readNodeShapeExtension(model.properties as Record<string, unknown>)
    if (!ext || ext.kind !== payload.kind) return
    if (!model.isSelected) {
      this.lf.selectElementById(payload.nodeId)
      this.syncSelectionFromGraph()
    }
    this.shapePanelFocusHandler?.(payload)
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
    const selected = this.lf.getSelectElements(true)
    const nodeIds = selected.nodes.map((n) => n.id)
    const edgeIds = selected.edges.map((e) => e.id)
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
      this.cancelFormatPainter()
      const domPick = this.pickElementFromDom(event.target)
      const picked = domPick ?? this.pickElementAt(event.clientX, event.clientY)
      if ((picked.kind === 'node' || picked.kind === 'edge') && picked.targetId) {
        this.applyContextMenuSelection(
          { kind: picked.kind, targetId: picked.targetId },
          event
        )
      } else if (picked.kind === 'blank') {
        // 保留框选结果；仅点击空白且无选中时清空
        const selected = this.lf.getSelectElements(true)
        if (!selected.nodes.length && !selected.edges.length) {
          this.lf.clearSelectElements()
        }
      }
      this.syncSelectionFromGraph()
      const selected = this.lf.getSelectElements(true)
      this.contextMenuHandler({
        event,
        kind: picked.kind,
        targetId: picked.targetId,
        nodeIds: selected.nodes.map((n) => n.id),
        edgeIds: selected.edges.map((e) => e.id)
      })
    }
    el.addEventListener('contextmenu', onContextMenu)
    return () => el.removeEventListener('contextmenu', onContextMenu)
  }

  getSelectedNodeIds(): string[] {
    if (!this.lf) return []
    return this.lf.getSelectElements(true).nodes.map((n) => n.id)
  }

  getSelectedEdgeIds(): string[] {
    if (!this.lf) return []
    return this.lf.getSelectElements(true).edges.map((e) => e.id)
  }

  hasClipboard(): boolean {
    const clip = (this as { _clipboard?: { nodes?: unknown[]; edges?: unknown[] } })._clipboard
    return Boolean(clip?.nodes?.length || clip?.edges?.length)
  }

  private isGroupFrameId(nodeId: string): boolean {
    return this.lf?.getNodeModelById(nodeId)?.type === DIAGRAM_GROUP_FRAME_TYPE
  }

  private filterAlignableNodeIds(nodeIds: string[]): string[] {
    return nodeIds.filter((id) => {
      const model = this.lf?.getNodeModelById(id)
      return model && model.type !== DIAGRAM_GROUP_FRAME_TYPE
    })
  }

  private countSelectedNodes(): number {
    const ids = this.getSelectedNodeIds()
    const content = this.filterAlignableNodeIds(ids)
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
    const ids = this.filterAlignableNodeIds(nodeIds?.length ? nodeIds : this.getSelectedNodeIds())
    if (ids.length < 2) return
    const bounds = ids.map((id) => this.readNodeBounds(id)).filter(Boolean) as DiagramNodeBounds[]
    const patches = alignNodePositions(bounds, mode)
    this.applyNodePositionPatches(patches)
  }

  distributeNodes(mode: DiagramDistributeMode, nodeIds?: string[]): void {
    const ids = this.filterAlignableNodeIds(nodeIds?.length ? nodeIds : this.getSelectedNodeIds())
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
    this.syncGroupFramesForSelectedNodes(toMove.filter((id) => !this.isGroupFrameId(id)))
    this.scheduleGraphChange()
    this.syncSelectionFromGraph()
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
    this.syncGroupFramesForSelectedNodes(patches.map((p) => p.id))
    this.scheduleGraphChange()
    this.syncSelectionFromGraph()
    this.refreshMultiSelectResize?.()
    this.scheduleOverlayLayout()
  }

  getSelection(): DiagramEditorSelection {
    const lf = this.lf
    const canvas = { ...this.canvasSettings }

    const formatPainterActive = this.isFormatPainterActive()

    if (!lf) {
      return {
        kind: 'canvas',
        node: null,
        edge: null,
        canvas,
        selectedNodeCount: 0,
        selectedEdgeCount: 0,
        selectedNodeIds: [],
        selectedEdgeIds: [],
        mixedNodeFields: [],
        formatPainterActive
      }
    }

    const live = this.readLiveSelection()
    const selectedNodeIds = live.selectedNodeIds
    const selectedEdgeIds = live.selectedEdgeIds
    const selectedNodeCount = this.countSelectedNodes()
    const selectedEdgeCount = selectedEdgeIds.length
    const alignableIds = this.filterAlignableNodeIds(selectedNodeIds)
    const mixedNodeFields =
      alignableIds.length >= 2 ? computeMixedNodeFields(lf, alignableIds) : []

    if (selectedNodeCount > 0) {
      const primaryNodeId = live.primaryNodeId
      const primaryEdgeId =
        live.primaryEdgeId && selectedEdgeIds.includes(live.primaryEdgeId)
          ? live.primaryEdgeId
          : null
      return {
        kind: 'node',
        node: primaryNodeId ? readNodeProperties(lf, primaryNodeId) : null,
        edge: primaryEdgeId ? readEdgeProperties(lf, primaryEdgeId) : null,
        canvas,
        selectedNodeCount,
        selectedEdgeCount,
        selectedNodeIds,
        selectedEdgeIds,
        mixedNodeFields,
        formatPainterActive
      }
    }

    if (selectedEdgeCount > 0) {
      const primaryEdgeId = live.primaryEdgeId ?? selectedEdgeIds[0] ?? null
      return {
        kind: 'edge',
        node: null,
        edge: primaryEdgeId ? readEdgeProperties(lf, primaryEdgeId) : null,
        canvas,
        selectedNodeCount,
        selectedEdgeCount,
        selectedNodeIds,
        selectedEdgeIds,
        mixedNodeFields,
        formatPainterActive
      }
    }

    return {
      kind: 'canvas',
      node: null,
      edge: null,
      canvas,
      selectedNodeCount: 0,
      selectedEdgeCount: 0,
      selectedNodeIds: [],
      selectedEdgeIds: [],
      mixedNodeFields: [],
      formatPainterActive
    }
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
    const ids = this.filterAlignableNodeIds(nodeIds?.length ? nodeIds : this.getSelectedNodeIds())
    for (const id of ids) {
      applyNodeProperties(this.lf, { id, ...nodeProps })
    }
    syncGroupFramesForNodes(this.lf, ids)
    this.scheduleGraphChange()
    this.emitSelection()
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
    this.emitSelection()
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
      const nodeId = this.selectedNodeId ?? nodeIds[0]
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
      this.emitSelection()
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
      this.emitSelection()
      return true
    }

    return false
  }

  cancelFormatPainter(): void {
    if (!this.formatPainterState?.active) return
    this.formatPainterState = null
    this.syncFormatPainterCursor()
    this.emitSelection()
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
    this.refreshGroupFrameDisplay()
    this.scheduleGraphChange()
    this.emitSelection()
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
    this.setEdgeInsertHighlight(null)
    this.hideMiniMap()
    this.teardownMiddlePan?.()
    this.teardownMiddlePan = null
    this.teardownContextMenu?.()
    this.teardownContextMenu = null
    this.teardownShapeHit?.()
    this.teardownShapeHit = null
    this.shapePanelFocusHandler = null
    this.teardownGroupFrameHover?.()
    this.teardownGroupFrameHover = null
    clearGroupFramePointerInside()
    this.contextMenuHandler = null
    this.teardownAxis?.()
    this.teardownAxis = null
    this.teardownMultiSelectResize?.()
    this.teardownMultiSelectResize = null
    this.refreshMultiSelectResize = null
    this.teardownEdgeEndpointPriority?.()
    this.teardownEdgeEndpointPriority = null
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
    if (this.overlayLayoutRaf != null) {
      cancelAnimationFrame(this.overlayLayoutRaf)
      this.overlayLayoutRaf = null
    }
    if (this.selectionEmitRaf != null) {
      cancelAnimationFrame(this.selectionEmitRaf)
      this.selectionEmitRaf = null
    }
    if (this.groupFramesBottomRaf != null) {
      cancelAnimationFrame(this.groupFramesBottomRaf)
      this.groupFramesBottomRaf = null
    }
    if (this.edgeInsertDragRaf != null) {
      cancelAnimationFrame(this.edgeInsertDragRaf)
      this.edgeInsertDragRaf = null
    }
    if (this.groupSyncDragRaf != null) {
      cancelAnimationFrame(this.groupSyncDragRaf)
      this.groupSyncDragRaf = null
    }
    if (this.resizeSnapTimer) {
      clearTimeout(this.resizeSnapTimer)
      this.resizeSnapTimer = null
    }
    this.groupDragLastPos.clear()
    this.viewportChangeHandler = null
    this.selectedNodeId = null
    this.selectedEdgeId = null
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
    this.selectedNodeId = null
    this.selectedEdgeId = null
    this.emitSelection()
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
    this.lf.graphModel.updateBackgroundOptions({ backgroundColor: bg })
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
      this.lf.graphModel.updateBackgroundOptions({ backgroundColor })
    }

    if (miniMapVisible) this.showMiniMap()
    else this.hideMiniMap()

    if (settings.themePreset) {
      this.refreshAxisOverlay()
      this.refreshMultiSelectResize?.()
    }

    this.emitSelection()
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
    this.emitSelection()
  }

  updateEdgeProperties(props: Partial<DiagramEdgeProperties> & { id: string }): void {
    if (!this.lf) return
    applyEdgeProperties(this.lf, props)
    this.scheduleGraphChange()
    this.emitSelection()
  }

  private refreshAxisOverlay(): void {
    if (!this.lf) return
    this.teardownAxis?.()
    const preset = this.canvasSettings.themePreset
    const resolved = resolveThemeFromPreset(preset, this.resolvedTheme)
    this.teardownAxis = mountDiagramAxisOverlay(this.lf, () => diagramAxisStyle(resolved))
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
    this.syncSelectionFromGraph()
  }

  clearSelection(): void {
    if (this.lf) cancelAllPendingUmlClassifierHitClicks(this.lf)
    this.lf?.clearSelectElements()
    this.syncSelectionFromGraph()
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
    this.syncSelectionFromGraph()
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
    this.selectedNodeId = null
    this.selectedEdgeId = null
    this.refreshGroupFrameDisplay()
    this.emitSelection()
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

    const rawNodeIds = nodeIds?.length
      ? nodeIds
      : this.lastSelectedNodeIds.length
        ? this.lastSelectedNodeIds
        : this.getSelectedNodeIds()
    const rawEdgeIds = edgeIds?.length
      ? edgeIds
      : this.lastSelectedEdgeIds.length
        ? this.lastSelectedEdgeIds
        : this.getSelectedEdgeIds()

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

  private isEntireExistingGroupSelected(nodeIds: string[], edgeIds: string[]): boolean {
    if (!this.lf || nodeIds.length + edgeIds.length < 2) return false
    const groupIds = collectGroupIdsForNodes(this.lf, nodeIds)
    for (const id of edgeIds) {
      const gid = this.lf.getEdgeModelById(id)?.properties?.dgGroupId
      if (typeof gid === 'string' && gid) groupIds.add(gid)
    }
    if (groupIds.size !== 1) return false
    const groupId = [...groupIds][0]
    const group = this.lf.getNodeModelById(groupId)
    if (!group || group.type !== DIAGRAM_GROUP_FRAME_TYPE) return false
    const members = (group.properties?.dgGroupMembers as string[] | undefined) ?? []
    const groupEdges = (group.properties?.dgGroupEdges as string[] | undefined) ?? []
    const nodeSet = new Set(nodeIds)
    const edgeSet = new Set(edgeIds)
    if (members.length !== nodeSet.size || groupEdges.length !== edgeSet.size) return false
    return (
      members.every((id) => nodeSet.has(id)) &&
      groupEdges.every((id) => edgeSet.has(id))
    )
  }

  /** 组合前：展开选区并从旧组合中拆出待组合图元 */
  private prepareGroupSelectionTargets(
    nodeIds?: string[],
    edgeIds?: string[]
  ): { nodes: string[]; edges: string[] } {
    if (!this.lf) return { nodes: [], edges: [] }
    const { nodeIds: resolvedNodes, edgeIds: resolvedEdges } = this.resolveClipboardTargets(
      nodeIds,
      edgeIds
    )
    const nodeSet = new Set(resolvedNodes)
    const edgeSet = new Set(resolvedEdges)
    const groupIds = collectGroupIdsForNodes(this.lf, resolvedNodes)
    for (const id of resolvedEdges) {
      const gid = this.lf.getEdgeModelById(id)?.properties?.dgGroupId
      if (typeof gid === 'string' && gid) groupIds.add(gid)
    }

    for (const groupId of groupIds) {
      const model = this.lf.getNodeModelById(groupId)
      if (!model || model.type !== DIAGRAM_GROUP_FRAME_TYPE) continue
      const members = (model.properties?.dgGroupMembers as string[] | undefined) ?? []
      const groupEdges = (model.properties?.dgGroupEdges as string[] | undefined) ?? []
      const dissolvingEntireGroup =
        members.every((id) => nodeSet.has(id)) && groupEdges.every((id) => edgeSet.has(id))

      if (dissolvingEntireGroup && (members.length || groupEdges.length)) {
        this.releaseGroupFrame(groupId)
        continue
      }

      for (const id of members) {
        if (nodeSet.has(id)) this.detachNodeFromGroup(id)
      }
      for (const id of groupEdges) {
        if (edgeSet.has(id)) this.detachEdgeFromGroup(id)
      }
    }

    return { nodes: [...nodeSet], edges: [...edgeSet] }
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
    this.syncSelectionFromGraph()
    this.refreshMultiSelectResize?.()
    this.scheduleOverlayLayout()
  }

  canUngroupSelection(): boolean {
    if (!this.lf) return false
    const selected = this.lf.getSelectElements(true)
    if (
      selected.nodes.some((n) => this.lf!.getNodeModelById(n.id)?.type === DIAGRAM_GROUP_FRAME_TYPE)
    ) {
      return true
    }
    if (
      selected.nodes.some((n) =>
        Boolean(this.lf!.getNodeModelById(n.id)?.properties?.dgGroupId)
      )
    ) {
      return true
    }
    return selected.edges.some((e) =>
      Boolean(this.lf!.getEdgeModelById(e.id)?.properties?.dgGroupId)
    )
  }

  canGroupSelection(): boolean {
    if (!this.lf) return false
    const { nodeIds, edgeIds } = this.resolveClipboardTargets()
    if (nodeIds.length + edgeIds.length < 2) return false
    if (this.isEntireExistingGroupSelected(nodeIds, edgeIds)) return false
    return true
  }

  groupSelection(nodeIds?: string[], edgeIds?: string[]): void {
    if (!this.lf) return
    const { nodes, edges } = this.prepareGroupSelectionTargets(nodeIds, edgeIds)
    if (nodes.length + edges.length < 2) return

    let minX = Infinity
    let maxX = -Infinity
    let minY = Infinity
    let maxY = -Infinity
    for (const id of nodes) {
      const bounds = this.readNodeBounds(id)
      if (!bounds) continue
      minX = Math.min(minX, bounds.x - bounds.width / 2)
      maxX = Math.max(maxX, bounds.x + bounds.width / 2)
      minY = Math.min(minY, bounds.y - bounds.height / 2)
      maxY = Math.max(maxY, bounds.y + bounds.height / 2)
    }
    if (!nodes.length) {
      for (const edgeId of edges) {
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
        dgGroupMembers: nodes,
        dgGroupEdges: edges,
        dgGroupStyle: { ...DEFAULT_GROUP_STYLE }
      }
    })
    const groupModel = this.lf.getNodeModelById(groupId)
    if (groupModel) {
      groupModel.width = w
      groupModel.height = h
    }
    for (const id of nodes) {
      this.lf.setProperties(id, { dgGroupId: groupId })
    }
    for (const id of edges) {
      this.lf.setProperties(id, { dgGroupId: groupId })
    }
    ensureGroupFrameAtBottom(this.lf, groupId)
    this.lf.selectElementById(groupId)
    this.syncSelectionFromGraph()
    this.scheduleGraphChange()
  }

  ungroupSelection(): void {
    if (!this.lf) return
    const selected = this.lf.getSelectElements(true)
    const groupIds = new Set<string>()
    for (const node of selected.nodes) {
      const model = this.lf.getNodeModelById(node.id)
      if (model?.type === DIAGRAM_GROUP_FRAME_TYPE) {
        groupIds.add(node.id)
        continue
      }
      const parentId = model?.properties?.dgGroupId
      if (typeof parentId === 'string' && parentId) groupIds.add(parentId)
    }
    for (const edge of selected.edges) {
      const parentId = this.lf.getEdgeModelById(edge.id)?.properties?.dgGroupId
      if (typeof parentId === 'string' && parentId) groupIds.add(parentId)
    }
    const releasedNodeIds: string[] = []
    const releasedEdgeIds: string[] = []
    for (const groupId of groupIds) {
      const model = this.lf.getNodeModelById(groupId)
      if (!model || model.type !== DIAGRAM_GROUP_FRAME_TYPE) continue
      const members = (model.properties?.dgGroupMembers as string[] | undefined) ?? []
      const edges = (model.properties?.dgGroupEdges as string[] | undefined) ?? []
      releasedNodeIds.push(...members)
      releasedEdgeIds.push(...edges)
      this.releaseGroupFrame(groupId)
    }
    if (releasedNodeIds.length || releasedEdgeIds.length) {
      this.lf.clearSelectElements()
      let append = false
      for (const id of releasedNodeIds) {
        if (this.lf.getNodeModelById(id)) {
          this.lf.selectElementById(id, append)
          append = true
        }
      }
      for (const id of releasedEdgeIds) {
        if (this.lf.getEdgeModelById(id)) {
          this.lf.selectElementById(id, true)
        }
      }
    }
    this.syncSelectionFromGraph()
    this.scheduleGraphChange()
    this.refreshMultiSelectResize?.()
    this.scheduleOverlayLayout()
  }

  private detachNodeFromGroup(nodeId: string): void {
    if (!this.lf) return
    const model = this.lf.getNodeModelById(nodeId)
    const groupId = model?.properties?.dgGroupId
    if (typeof groupId !== 'string' || !groupId) return
    const group = this.lf.getNodeModelById(groupId)
    if (!group || group.type !== DIAGRAM_GROUP_FRAME_TYPE) {
      this.lf.setProperties(nodeId, { dgGroupId: undefined })
      return
    }
    const members = ((group.properties?.dgGroupMembers as string[] | undefined) ?? []).filter(
      (id) => id !== nodeId
    )
    this.lf.setProperties(groupId, { dgGroupMembers: members })
    this.lf.setProperties(nodeId, { dgGroupId: undefined })
    if (!members.length && !((group.properties?.dgGroupEdges as string[] | undefined) ?? []).length) {
      this.lf.deleteNode(groupId)
    }
  }

  private detachEdgeFromGroup(edgeId: string): void {
    if (!this.lf) return
    const model = this.lf.getEdgeModelById(edgeId)
    const groupId = model?.properties?.dgGroupId
    if (typeof groupId !== 'string' || !groupId) return
    const group = this.lf.getNodeModelById(groupId)
    if (!group || group.type !== DIAGRAM_GROUP_FRAME_TYPE) {
      this.lf.setProperties(edgeId, { dgGroupId: undefined })
      return
    }
    const edges = ((group.properties?.dgGroupEdges as string[] | undefined) ?? []).filter(
      (id) => id !== edgeId
    )
    this.lf.setProperties(groupId, { dgGroupEdges: edges })
    this.lf.setProperties(edgeId, { dgGroupId: undefined })
    if (!edges.length && !((group.properties?.dgGroupMembers as string[] | undefined) ?? []).length) {
      this.lf.deleteNode(groupId)
    }
  }

  private releaseGroupFrame(groupId: string): void {
    if (!this.lf) return
    const model = this.lf.getNodeModelById(groupId)
    if (!model || model.type !== DIAGRAM_GROUP_FRAME_TYPE) return
    const members = (model.properties?.dgGroupMembers as string[] | undefined) ?? []
    const edgeMembers = (model.properties?.dgGroupEdges as string[] | undefined) ?? []
    for (const memberId of members) {
      this.lf.setProperties(memberId, { dgGroupId: undefined })
    }
    for (const edgeId of edgeMembers) {
      this.lf.setProperties(edgeId, { dgGroupId: undefined })
    }
    this.lf.deleteNode(groupId)
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
    if (!this.lf) return null
    const exclude = new Set(options?.excludeNodeIds ?? [])
    const edgeId = findNearestEdgeIdAtPoint([...this.lf.graphModel.edges], x, y, threshold)
    if (!edgeId) return null
    const edge = this.lf.getEdgeModelById(edgeId)
    if (!edge) return null
    for (const model of this.lf.graphModel.nodes) {
      if (exclude.has(model.id)) continue
      if (model.id === edge.sourceNodeId || model.id === edge.targetNodeId) continue
      if (isPointInsideNode(model, x, y)) return null
    }
    return edgeId
  }

  setEdgeInsertHighlight(edgeId: string | null): void {
    if (this.edgeInsertHighlightId === edgeId) return
    const prev = this.edgeInsertHighlightId
    this.edgeInsertHighlightId = edgeId
    setEdgeInsertHighlightId(edgeId)
    const refresh = (id: string | null) => {
      if (!id || !this.lf) return
      const model = this.lf.getEdgeModelById(id)
      if (model && 'setAttributes' in model && typeof model.setAttributes === 'function') {
        model.setAttributes()
      }
    }
    refresh(prev)
    refresh(edgeId)
  }

  insertExistingNodeOnEdge(nodeId: string, edgeId: string): boolean {
    if (!this.lf) return false
    const edge = this.lf.getEdgeModelById(edgeId)
    if (!edge) {
      this.setEdgeInsertHighlight(null)
      return false
    }
    const sourceNodeId = edge.sourceNodeId
    const targetNodeId = edge.targetNodeId
    if (!sourceNodeId || !targetNodeId || sourceNodeId === targetNodeId) {
      this.setEdgeInsertHighlight(null)
      return false
    }
    if (nodeId === sourceNodeId || nodeId === targetNodeId) {
      this.setEdgeInsertHighlight(null)
      return false
    }
    const insertModel = this.lf.getNodeModelById(nodeId)
    const sourceModel = this.lf.getNodeModelById(sourceNodeId)
    const targetModel = this.lf.getNodeModelById(targetNodeId)
    if (!insertModel || !sourceModel || !targetModel) {
      this.setEdgeInsertHighlight(null)
      return false
    }

    const [firstEdge, secondEdge] = buildSplitEdgeConfigs(
      {
        type: edge.type,
        sourceNodeId,
        targetNodeId,
        properties: structuredClone(edge.properties ?? {}) as Record<string, unknown>,
        text: edge.text
      },
      insertModel,
      sourceModel,
      targetModel
    )

    this.lf.deleteEdge(edgeId)
    this.lf.addEdge(firstEdge as never)
    this.lf.addEdge(secondEdge as never)
    this.setEdgeInsertHighlight(null)
    this.select([nodeId])
    this.scheduleGraphChange()
    return true
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
    this.syncSelectionFromGraph()
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
