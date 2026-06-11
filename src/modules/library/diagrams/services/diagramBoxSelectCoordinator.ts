import type LogicFlow from '@logicflow/core'
import { isForwardBoxSelect } from '@modules/library/diagrams/lib/diagramBoxSelection'
import { collectOrderedSelectionIds } from '@modules/library/diagrams/lib/diagramGroupSelection'
import {
  absorbKeyboardModifiers,
  absorbPointerModifiers,
  applyBoxSelectForPointer,
  collectElementsInCanvasBox,
  isBoxModifierGesture,
  readPointerModifiers,
  type DiagramBoxSelectSnapshot,
  type DiagramPointerModifiers
} from '@modules/library/diagrams/lib/diagramSelectionInteraction'
import { filterAlignableNodeIds } from '@modules/library/diagrams/lib/diagramSelectionSnapshot'
import type { DiagramBoxSelectRestoreContext } from '@modules/library/diagrams/lib/diagramSelectionSnapshot'

export interface DiagramBoxSelectCoordinatorPorts {
  getLf(): LogicFlow | null
  getContainer(): HTMLElement | null
  getCanvasFrameEl(): HTMLElement | null
  isMiddlePanning(): boolean
  getSelectionFullSnapshot(pointerId: number): DiagramBoxSelectSnapshot | undefined
  syncSelectionFromGraph(): void
  scheduleGroupFramesToBottom(): void
  scheduleMultiSelectOverlayRefresh(): void
  publishSelectionFromLiveGraph(): void
  afterSelectionMutation(): void
  getLastSelectedNodeIds(): string[]
  getLastSelectedEdgeIds(): string[]
}

/**
 * 框选手势协调：SelectionSelect 插件接入、选区应用、橡皮筋清理与 click 竞态恢复。
 */
export class DiagramBoxSelectCoordinator {
  private overlayStart: { x: number; y: number } | null = null
  private overlayEnd: { x: number; y: number } | null = null
  private gestureTeardown: (() => void) | null = null
  private useContainMode = true
  private pointerEvent: PointerEvent | null = null
  private modifierFlags: DiagramPointerModifiers = {
    ctrlKey: false,
    metaKey: false,
    shiftKey: false
  }
  private preSnapshot: DiagramBoxSelectSnapshot = { nodeIds: [], edgeIds: [] }
  private gestureSnapshot: DiagramBoxSelectSnapshot = { nodeIds: [], edgeIds: [] }
  private appliedResult: DiagramBoxSelectSnapshot | null = null
  private finalized = false
  private keyTeardown: (() => void) | null = null
  private suppressPostClickUntil = 0
  private lastBoxSelectNodeIds: string[] = []

  constructor(private readonly ports: DiagramBoxSelectCoordinatorPorts) {}

  enableBoxSelection(): void {
    const lf = this.ports.getLf()
    if (!lf) return
    const ext = lf.extension?.selectionSelect as
      | {
          openSelectionSelect?: () => void
          setExclusiveMode?: (exclusive?: boolean) => void
          setSelectionSense?: (isWholeEdge?: boolean, isWholeNode?: boolean) => void
        }
      | undefined
    ext?.setExclusiveMode?.(false)
    ext?.setSelectionSense?.(true, true)
    ext?.openSelectionSelect?.()
    const lfWithSelect = lf as LogicFlow & { openSelectionSelect?: () => void }
    lfWithSelect.openSelectionSelect?.()
  }

  setPaused(paused: boolean): void {
    const lf = this.ports.getLf()
    if (!lf) return
    const ext = lf.extension?.selectionSelect as
      | { closeSelectionSelect?: () => void; openSelectionSelect?: () => void }
      | undefined
    if (paused) {
      ext?.closeSelectionSelect?.()
      this.cleanupActive()
      this.scheduleDismissRubberBand()
    } else {
      ext?.openSelectionSelect?.()
    }
  }

  armOverlay(e: MouseEvent): void {
    const lf = this.ports.getLf()
    if (!lf || e.button !== 0 || this.ports.isMiddlePanning()) return
    if (this.gestureTeardown) {
      this.gestureTeardown()
      this.gestureTeardown = null
    }
    this.finalized = false
    this.pointerEvent = e as unknown as PointerEvent
    this.modifierFlags = readPointerModifiers(e)
    absorbPointerModifiers(this.modifierFlags, e)
    const selected = lf.getSelectElements(true)
    this.preSnapshot = {
      nodeIds: selected.nodes.map((node) => node.id),
      edgeIds: selected.edges.map((edge) => edge.id)
    }
    this.gestureSnapshot = this.resolveGestureSnapshot()
    this.useContainMode = true
    this.setBoxSelectingActive(true)

    const onKeyDown = (keyEv: KeyboardEvent) => {
      absorbKeyboardModifiers(this.modifierFlags, keyEv)
    }
    window.addEventListener('keydown', onKeyDown, true)
    this.keyTeardown = () => {
      window.removeEventListener('keydown', onKeyDown, true)
    }
    const pt = lf.getPointByClient({ x: e.clientX, y: e.clientY }).domOverlayPosition
    this.overlayStart = { x: pt.x, y: pt.y }
    this.overlayEnd = { x: pt.x, y: pt.y }

    const applyBoxSelectDirection = (endX: number, endY: number) => {
      const contain = isForwardBoxSelect(pt.x, pt.y, endX, endY)
      this.useContainMode = contain
      this.updateBoxSelectVisual(contain)
    }

    const onMove = (ev: PointerEvent) => {
      absorbPointerModifiers(this.modifierFlags, ev)
      const endPt = lf.getPointByClient({ x: ev.clientX, y: ev.clientY }).domOverlayPosition
      this.overlayEnd = { x: endPt.x, y: endPt.y }
      applyBoxSelectDirection(endPt.x, endPt.y)
    }

    const onUp = (ev: PointerEvent) => {
      if (ev.button !== 0) return
      try {
        absorbPointerModifiers(this.modifierFlags, ev)
        const endPt = lf.getPointByClient({ x: ev.clientX, y: ev.clientY }).domOverlayPosition
        this.overlayEnd = { x: endPt.x, y: endPt.y }
        this.pointerEvent = ev
        applyBoxSelectDirection(endPt.x, endPt.y)
        const sx = this.overlayStart?.x
        const sy = this.overlayStart?.y
        if (sx != null && sy != null) {
          const dx = Math.abs(endPt.x - sx)
          const dy = Math.abs(endPt.y - sy)
          const wasBoxDrag = dx >= 10 || dy >= 10
          if (wasBoxDrag) {
            this.finalize()
            requestAnimationFrame(() => {
              this.reapplyResult()
            })
          } else {
            this.cleanupActive()
          }
        }
      } finally {
        this.clearRubberBandVisual()
        document.removeEventListener('pointermove', onMove, true)
        document.removeEventListener('pointerup', onUp, true)
        this.keyTeardown?.()
        this.keyTeardown = null
        this.gestureTeardown = null
      }
    }

    document.addEventListener('pointermove', onMove, true)
    document.addEventListener('pointerup', onUp, true)
    this.gestureTeardown = () => {
      document.removeEventListener('pointermove', onMove, true)
      document.removeEventListener('pointerup', onUp, true)
      this.keyTeardown?.()
      this.keyTeardown = null
    }
  }

  finalizeFromLfSelection(leftTop: [number, number], rightBottom: [number, number]): void {
    this.finalized = false
    this.finalize(leftTop, rightBottom, true)
    this.dismissRubberBand()
    this.scheduleDismissRubberBand()
    this.cleanupActive()
    this.finalized = false
  }

  cleanupActive(): void {
    this.overlayStart = null
    this.overlayEnd = null
    this.pointerEvent = null
    this.useContainMode = true
    this.modifierFlags = { ctrlKey: false, metaKey: false, shiftKey: false }
    this.preSnapshot = { nodeIds: [], edgeIds: [] }
    this.gestureSnapshot = { nodeIds: [], edgeIds: [] }
    this.keyTeardown?.()
    this.keyTeardown = null
    this.gestureTeardown?.()
    this.gestureTeardown = null
  }

  clearSnapshots(): void {
    this.appliedResult = null
    this.lastBoxSelectNodeIds = []
    this.suppressPostClickUntil = 0
  }

  isInGracePeriod(): boolean {
    return performance.now() < this.suppressPostClickUntil
  }

  shouldSkipPointerSync(): boolean {
    return this.overlayStart != null && !this.finalized
  }

  shouldReconcileCollapse(): boolean {
    if (this.appliedResult) return true
    if (this.isInGracePeriod()) return true
    if (this.lastBoxSelectNodeIds.length >= 2) return true
    return false
  }

  getReconcileContext(): Omit<DiagramBoxSelectRestoreContext, 'liveNodeIds' | 'liveEdgeIds'> {
    return {
      boxSelectAppliedResult: this.appliedResult,
      lastBoxSelectNodeIds: this.lastBoxSelectNodeIds,
      suppressPostBoxSelectClickUntil: this.suppressPostClickUntil,
      filterAlignableNodeIds: (ids) => {
        const lf = this.ports.getLf()
        return lf ? filterAlignableNodeIds(lf, ids) : ids
      }
    }
  }

  clearLastBoxSelectOnPlainClick(): void {
    this.lastBoxSelectNodeIds = []
  }

  handleGracePeriodInteraction(): void {
    this.reapplyResult()
    this.scheduleDismissRubberBand()
  }

  restoreCollapsedBoxSelection(): void {
    const lf = this.ports.getLf()
    if (!lf) return
    const live = collectOrderedSelectionIds(lf)
    const liveCount = live.nodeIds.length + live.edgeIds.length

    if (this.appliedResult) {
      const snap = this.appliedResult
      const snapCount = snap.nodeIds.length + snap.edgeIds.length
      if (liveCount < snapCount) {
        lf.clearSelectElements()
        for (const id of snap.nodeIds) lf.selectElementById(id, true)
        for (const id of snap.edgeIds) lf.selectElementById(id, true)
        return
      }
    }

    if (
      this.lastBoxSelectNodeIds.length >= 2 &&
      filterAlignableNodeIds(lf, live.nodeIds).length < this.lastBoxSelectNodeIds.length
    ) {
      lf.clearSelectElements()
      for (const id of this.lastBoxSelectNodeIds) {
        lf.selectElementById(id, true)
      }
      return
    }

    const lastNodes = this.ports.getLastSelectedNodeIds()
    const lastEdges = this.ports.getLastSelectedEdgeIds()
    const stableCount = lastNodes.length + lastEdges.length
    if (stableCount >= 2 && liveCount < stableCount) {
      lf.clearSelectElements()
      for (const id of lastNodes) {
        lf.selectElementById(id, true)
      }
      for (const id of lastEdges) {
        lf.selectElementById(id, true)
      }
    }
  }

  bindRubberBandGuard(el: HTMLElement): () => void {
    const onPointerEnd = (e: PointerEvent) => {
      if (e.button !== 0) return
      this.clearRubberBandVisual()
    }
    el.addEventListener('pointerup', onPointerEnd, true)
    el.addEventListener('pointercancel', onPointerEnd, true)
    return () => {
      el.removeEventListener('pointerup', onPointerEnd, true)
      el.removeEventListener('pointercancel', onPointerEnd, true)
    }
  }

  reapplyResult(): void {
    const lf = this.ports.getLf()
    if (!lf || !this.appliedResult) return
    const { nodeIds, edgeIds } = this.appliedResult
    lf.clearSelectElements()
    for (const id of nodeIds) lf.selectElementById(id, true)
    for (const id of edgeIds) lf.selectElementById(id, true)
    this.ports.publishSelectionFromLiveGraph()
    this.ports.scheduleMultiSelectOverlayRefresh()
  }

  scheduleDismissRubberBand(): void {
    this.setBoxSelectingActive(false)
    const run = () => this.removeRubberBandDom()
    run()
    setTimeout(run, 0)
    requestAnimationFrame(() => {
      run()
      requestAnimationFrame(run)
    })
  }

  dismissRubberBand(): void {
    this.clearRubberBand()
  }

  private finalize(
    domLeftTop?: [number, number],
    domRightBottom?: [number, number],
    force = false
  ): void {
    const lf = this.ports.getLf()
    if (!lf || (!force && this.finalized)) return

    let leftTop: [number, number]
    let rightBottom: [number, number]
    if (domLeftTop && domRightBottom) {
      if (
        Math.abs(domRightBottom[0] - domLeftTop[0]) < 10 &&
        Math.abs(domRightBottom[1] - domLeftTop[1]) < 10
      ) {
        return
      }
      leftTop = domLeftTop
      rightBottom = domRightBottom
    } else {
      const start = this.overlayStart
      const end = this.overlayEnd
      if (!start || !end) return
      if (Math.abs(end.x - start.x) < 10 && Math.abs(end.y - start.y) < 10) return
      leftTop = [Math.min(start.x, end.x), Math.min(start.y, end.y)]
      rightBottom = [Math.max(start.x, end.x), Math.max(start.y, end.y)]
    }

    const canvasBox = this.domSelectionBoxToCanvas(lf, leftTop, rightBottom)
    const { nodeIds, edgeIds } = collectElementsInCanvasBox(
      lf,
      canvasBox.leftTop,
      canvasBox.rightBottom,
      this.useContainMode
    )
    const boxSelectModifiers = { ...this.modifierFlags }
    absorbPointerModifiers(boxSelectModifiers, this.pointerEvent)
    applyBoxSelectForPointer(lf, nodeIds, edgeIds, this.pointerEvent, {
      modifiers: boxSelectModifiers,
      preSelection: this.gestureSnapshot
    })

    const applied = collectOrderedSelectionIds(lf)
    this.appliedResult = {
      nodeIds: [...applied.nodeIds],
      edgeIds: [...applied.edgeIds]
    }
    this.lastBoxSelectNodeIds = filterAlignableNodeIds(lf, applied.nodeIds)
    this.suppressPostClickUntil = performance.now() + 280
    this.finalized = true
    this.ports.syncSelectionFromGraph()
    this.ports.scheduleGroupFramesToBottom()
    this.ports.scheduleMultiSelectOverlayRefresh()
    this.scheduleResultReapply()
  }

  private resolveGestureSnapshot(): DiagramBoxSelectSnapshot {
    const pointerId = this.pointerEvent?.pointerId
    if (pointerId != null) {
      const snap = this.ports.getSelectionFullSnapshot(pointerId)
      if (snap) {
        return { nodeIds: [...snap.nodeIds], edgeIds: [...snap.edgeIds] }
      }
    }
    return {
      nodeIds: [...this.preSnapshot.nodeIds],
      edgeIds: [...this.preSnapshot.edgeIds]
    }
  }

  private scheduleResultReapply(): void {
    requestAnimationFrame(() => {
      if (!this.ports.getLf() || !this.appliedResult) return
      if (!this.isInGracePeriod()) return
      this.reapplyResult()
    })
    window.setTimeout(() => {
      this.appliedResult = null
    }, 300)
  }

  private setBoxSelectingActive(active: boolean): void {
    const frame = this.ports.getContainer() ?? this.ports.getCanvasFrameEl()
    if (!frame) return
    if (active) {
      frame.setAttribute('data-dg-box-dragging', '')
      frame.classList.add('dg-box-selecting')
    } else {
      frame.removeAttribute('data-dg-box-dragging')
      frame.classList.remove('dg-box-selecting')
    }
  }

  private clearRubberBandVisual(): void {
    this.setBoxSelectingActive(false)
    const lf = this.ports.getLf()
    const ext = lf?.extension?.selectionSelect as { wrapper?: HTMLElement } | undefined
    ext?.wrapper?.remove()
    this.removeRubberBandDom()
  }

  private clearRubberBand(): void {
    this.clearRubberBandVisual()
    const lf = this.ports.getLf()
    const ext = lf?.extension?.selectionSelect as
      | { cleanupSelectionState?: () => void }
      | undefined
    ext?.cleanupSelectionState?.()
  }

  private removeRubberBandDom(): void {
    const lf = this.ports.getLf()
    const container = this.ports.getContainer()
    const roots: Array<ParentNode | null | undefined> = [
      container,
      lf?.container,
      lf ? document.getElementById(`ToolOverlay_${lf.graphModel.flowId}`) : null
    ]
    const seen = new Set<Element>()
    for (const root of roots) {
      root?.querySelectorAll('.lf-selection-select').forEach((el) => {
        if (seen.has(el)) return
        seen.add(el)
        el.remove()
      })
    }
    document.querySelectorAll('.lf-selection-select').forEach((el) => {
      if (seen.has(el)) return
      seen.add(el)
      el.remove()
    })
  }

  private updateBoxSelectVisual(isContain: boolean): void {
    const wrap = this.ports.getContainer()?.querySelector('.lf-selection-select')
    if (!wrap) return
    wrap.classList.toggle('dg-selection-box--contain', isContain)
    wrap.classList.toggle('dg-selection-box--intersect', !isContain)
  }

  private domSelectionBoxToCanvas(
    lf: LogicFlow,
    leftTop: [number, number],
    rightBottom: [number, number]
  ): { leftTop: [number, number]; rightBottom: [number, number] } {
    const minX = Math.min(leftTop[0], rightBottom[0])
    const minY = Math.min(leftTop[1], rightBottom[1])
    const maxX = Math.max(leftTop[0], rightBottom[0])
    const maxY = Math.max(leftTop[1], rightBottom[1])
    const tl = lf.graphModel.transformModel.HtmlPointToCanvasPoint([minX, minY])
    const rb = lf.graphModel.transformModel.HtmlPointToCanvasPoint([maxX, maxY])
    return { leftTop: [tl[0], tl[1]], rightBottom: [rb[0], rb[1]] }
  }
}
