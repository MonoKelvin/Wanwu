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
import {
  buildDiagramNodeConfig,
  getDiagramShapeById,
  registerAllDiagramShapes
} from '@modules/library/diagrams/lib/diagramShapeRegistry'
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
  DIAGRAM_GROUP_FRAME_TYPE
} from '@modules/library/diagrams/lib/diagramGroupFrame'
import { syncGroupFramesForNodes } from '@modules/library/diagrams/lib/diagramGroupBounds'
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
import { computeMixedNodeFields } from '@modules/library/diagrams/lib/diagramSelectionMixed'

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
  private middlePanning = false
  private boxSelectOverlayStart: { x: number; y: number } | null = null
  private boxSelectOverlayEnd: { x: number; y: number } | null = null
  private boxSelectTeardown: (() => void) | null = null
  private groupDragLastPos = new Map<string, { x: number; y: number }>()
  private lastSelectedNodeIds: string[] = []
  private lastSelectedEdgeIds: string[] = []
  private edgeInsertHighlightId: string | null = null
  private edgeInsertDragNodeIds: string[] = []

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
    if (this.selectionEmitRaf != null) return
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
    this.applyCanvasSettings(this.canvasSettings)
    this.lf.render({ nodes: [], edges: [] })
    this.refreshAxisOverlay()
    this.bindEvents()
    this.enableBoxSelection()
    this.teardownMiddlePan = this.bindMiddleMousePan(el)
    this.teardownContextMenu = this.bindContextMenu(el)
    const multiSelectResize = mountDiagramMultiSelectResize(
      this.lf,
      () => {
        if (this.lf) {
          syncGroupFramesForNodes(this.lf, this.getSelectedNodeIds())
        }
        this.scheduleGraphChange()
        this.syncSelectionFromGraph()
      },
      () => this.scheduleOverlayLayout()
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

  /** 中键平移视图 */
  private bindMiddleMousePan(el: HTMLElement): () => void {
    let panning = false
    let lastX = 0
    let lastY = 0

    const onMouseDown = (event: MouseEvent) => {
      if (event.button !== 1) return
      event.preventDefault()
      event.stopPropagation()
      panning = true
      this.middlePanning = true
      this.setBoxSelectionPaused(true)
      lastX = event.clientX
      lastY = event.clientY
      el.style.cursor = 'grabbing'
    }

    const onMouseMove = (event: MouseEvent) => {
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

    const onAuxClick = (event: MouseEvent) => {
      if (event.button === 1) event.preventDefault()
    }

    el.addEventListener('mousedown', onMouseDown)
    el.addEventListener('auxclick', onAuxClick)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', endPan)

    return () => {
      el.removeEventListener('mousedown', onMouseDown)
      el.removeEventListener('auxclick', onAuxClick)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', endPan)
      el.style.cursor = ''
    }
  }

  private bindEvents(): void {
    if (!this.lf) return

    this.lf.on('node:click', () => {
      this.syncSelectionFromGraph()
    })

    this.lf.on('edge:click', ({ data, e }) => {
      const append = Boolean(e?.ctrlKey || e?.metaKey || e?.shiftKey)
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

    this.lf.on('blank:click', () => {
      this.lf?.clearSelectElements()
      this.lf?.removeNodeSnapLine()
      this.selectedNodeId = null
      this.selectedEdgeId = null
      this.lastSelectedNodeIds = []
      this.lastSelectedEdgeIds = []
      this.cleanupActiveBoxSelect()
      resetEdgeEndpointPriority(this.lf, this.container)
      this.emitSelection()
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
      const syncIds = affected.includes(data.id) ? affected : [data.id]
      syncGroupFramesForNodes(this.lf, syncIds)
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

    const onAdjustDragStart = () => {
      setAdjustPointDragging(true)
    }

    const onAdjustDragEnd = () => {
      finishAdjustPointDrag(lf, container)
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
    lf.on('adjustPoint:dragend', onAdjustDragEnd)
    container.addEventListener('pointermove', onPointerMove, { passive: true })

    this.teardownEdgeEndpointPriority = () => {
      if (pointerRaf) cancelAnimationFrame(pointerRaf)
      container.removeEventListener('pointermove', onPointerMove)
      resetEdgeEndpointPriority(lf, container)
    }
  }

  private syncSelectionFromGraph(): void {
    if (!this.lf) return
    const selected = this.lf.getSelectElements(true)
    this.lastSelectedNodeIds = selected.nodes.map((n) => n.id)
    this.lastSelectedEdgeIds = selected.edges.map((e) => e.id)
    const primaryNode =
      selected.nodes.find((n) => !this.isGroupFrameId(n.id)) ??
      selected.nodes.find((n) => this.isGroupFrameId(n.id))
    this.selectedNodeId = primaryNode?.id ?? null
    this.selectedEdgeId = selected.edges[0]?.id ?? null
    this.scheduleEmitSelection()
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
    const nodes = [...this.lf.graphModel.nodes].reverse()
    for (const model of nodes) {
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

  private bindContextMenu(el: HTMLElement): () => void {
    const onContextMenu = (event: MouseEvent) => {
      if (!this.lf || !this.contextMenuHandler) return
      event.preventDefault()
      const domPick = this.pickElementFromDom(event.target)
      const picked = domPick ?? this.pickElementAt(event.clientX, event.clientY)
      if ((picked.kind === 'node' || picked.kind === 'edge') && picked.targetId) {
        this.lf.clearSelectElements()
        this.lf.selectElementById(picked.targetId)
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
    syncGroupFramesForNodes(this.lf, toMove)
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
    syncGroupFramesForNodes(
      this.lf,
      patches.map((p) => p.id)
    )
    this.scheduleGraphChange()
    this.syncSelectionFromGraph()
    this.refreshMultiSelectResize?.()
    this.scheduleOverlayLayout()
  }

  getSelection(): DiagramEditorSelection {
    const lf = this.lf
    const canvas = { ...this.canvasSettings }
    const selectedNodeCount = lf ? this.countSelectedNodes() : 0
    const selectedEdgeCount = lf
      ? this.lf!.getSelectElements(true).edges.length
      : 0

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
        mixedNodeFields: []
      }
    }

    const selectedNodeIds = this.lastSelectedNodeIds.length
      ? this.lastSelectedNodeIds
      : this.getSelectedNodeIds()
    const selectedEdgeIds = this.lastSelectedEdgeIds.length
      ? this.lastSelectedEdgeIds
      : this.getSelectedEdgeIds()
    const alignableIds = this.filterAlignableNodeIds(selectedNodeIds)
    const mixedNodeFields =
      alignableIds.length >= 2 ? computeMixedNodeFields(lf, alignableIds) : []

    if (this.selectedNodeId || selectedNodeCount > 0) {
      return {
        kind: 'node',
        node: this.selectedNodeId ? readNodeProperties(lf, this.selectedNodeId) : null,
        edge: this.selectedEdgeId ? readEdgeProperties(lf, this.selectedEdgeId) : null,
        canvas,
        selectedNodeCount,
        selectedEdgeCount,
        selectedNodeIds,
        selectedEdgeIds,
        mixedNodeFields
      }
    }

    if (this.selectedEdgeId || selectedEdgeCount > 0) {
      return {
        kind: 'edge',
        node: null,
        edge: readEdgeProperties(lf, this.selectedEdgeId),
        canvas,
        selectedNodeCount,
        selectedEdgeCount,
        selectedNodeIds,
        selectedEdgeIds,
        mixedNodeFields
      }
    }

    return {
      kind: 'canvas',
      node: null,
      edge: null,
      canvas,
      selectedNodeCount,
      selectedEdgeCount,
      selectedNodeIds,
      selectedEdgeIds,
      mixedNodeFields
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

  destroy(): void {
    this.setEdgeInsertHighlight(null)
    this.hideMiniMap()
    this.teardownMiddlePan?.()
    this.teardownMiddlePan = null
    this.teardownContextMenu?.()
    this.teardownContextMenu = null
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
    if (this.edgeInsertDragRaf != null) {
      cancelAnimationFrame(this.edgeInsertDragRaf)
      this.edgeInsertDragRaf = null
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
    this.lf?.render(graph as never)
    this.reapplyLoadedGraphStyles(graph)
    this.refreshAxisOverlay()
    this.refreshMultiSelectResize?.()
    this.selectedNodeId = null
    this.selectedEdgeId = null
    this.emitSelection()
    requestAnimationFrame(() => this.resize())
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
      this.lf.setProperties(item.id, item.patch)
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
    this.lf?.clearSelectElements()
    this.selectedNodeId = null
    this.selectedEdgeId = null
    this.lastSelectedNodeIds = []
    this.lastSelectedEdgeIds = []
    this.emitSelection()
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
    return selected.nodes.some((n) =>
      Boolean(this.lf!.getNodeModelById(n.id)?.properties?.dgGroupId)
    )
  }

  canGroupSelection(): boolean {
    if (!this.lf) return false
    const nodeIds = this.getSelectedNodeIds()
    const edgeIds = this.getSelectedEdgeIds()
    const groupableNodes = nodeIds.filter((id) => {
      const model = this.lf!.getNodeModelById(id)
      return (
        model &&
        model.type !== DIAGRAM_GROUP_FRAME_TYPE &&
        !model.properties?.dgGroupId
      )
    })
    return groupableNodes.length + edgeIds.length >= 2
  }

  groupSelection(nodeIds?: string[], edgeIds?: string[]): void {
    if (!this.lf) return
    const nodes = (nodeIds?.length ? nodeIds : this.getSelectedNodeIds()).filter((id) => {
      const model = this.lf!.getNodeModelById(id)
      return model && model.type !== DIAGRAM_GROUP_FRAME_TYPE && !model.properties?.dgGroupId
    })
    const edges = edgeIds?.length ? edgeIds : this.getSelectedEdgeIds()
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
      const zIndexes = nodes
        .map((id) => this.lf!.getNodeModelById(id)?.zIndex ?? 0)
        .filter((z) => Number.isFinite(z))
      groupModel.zIndex = (zIndexes.length ? Math.min(...zIndexes) : 0) - 1
    }
    for (const id of nodes) {
      this.lf.setProperties(id, { dgGroupId: groupId })
    }
    for (const id of edges) {
      this.lf.setProperties(id, { dgGroupId: groupId })
    }
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
    for (const groupId of groupIds) {
      this.releaseGroupFrame(groupId)
    }
    this.syncSelectionFromGraph()
    this.scheduleGraphChange()
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
      this.lf.setProperties(nodeId, incoming)
      if ('setAttributes' in model && typeof model.setAttributes === 'function') {
        ;(model as { setAttributes: () => void }).setAttributes()
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
