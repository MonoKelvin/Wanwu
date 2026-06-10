import type LogicFlow from '@logicflow/core'
import { getNodeBBox } from '@logicflow/core/lib/util/node'
import { StepDrag } from '@logicflow/core/lib/util/drag'
import { DIAGRAM_GROUP_FRAME_TYPE } from '@modules/library/diagrams/lib/diagramGroupFrame'
import type { DiagramSelectionRect } from '@modules/library/diagrams/lib/diagramNodeLayout'
import {
  applyNodeDimensions,
  syncNodeSizeProperties
} from '@modules/library/diagrams/lib/diagramShapeResize'
import { diagramResizeControlStyle, diagramResizeTheme } from '@modules/library/diagrams/lib/diagramShapeResize'
import { syncNodeTextLayout } from '@modules/library/diagrams/lib/diagramStyleBridge'

type HandleDir = 'nw' | 'ne' | 'se' | 'sw'

type NodeSnap = {
  id: string
  left: number
  top: number
  width: number
  height: number
  minWidth: number
  minHeight: number
  resizable: boolean
}

const MIN_BBOX = 32
const OUTLINE_PAD = 2
const HANDLE_DIRS: HandleDir[] = ['nw', 'ne', 'se', 'sw']

/** 由适配层同步写入，供单图元缩放判断（避免 MobX 跨节点选中不触发重绘） */
let liveMultiSelectCount = 0

/** 多选整体缩放拖拽中（供适配层跳过 node:drag 副作用） */
let diagramGroupMultiResizing = false

export function setLiveMultiSelectCount(count: number): void {
  liveMultiSelectCount = Math.max(0, count)
}

export function getLiveMultiSelectCount(): number {
  return liveMultiSelectCount
}

export function isDiagramGroupMultiResizing(): boolean {
  return diagramGroupMultiResizing
}

function isDiagramContentNode(node: LogicFlow.BaseNodeModel): boolean {
  return node.type !== DIAGRAM_GROUP_FRAME_TYPE && node.visible !== false
}

/** 参与多选框计算的图元（不含组合框） */
export function getMultiSelectNodes(
  graphModel: LogicFlow.GraphModel,
  lf?: LogicFlow
): LogicFlow.BaseNodeModel[] {
  const fromSelectNodes = graphModel.selectNodes.filter(isDiagramContentNode)
  if (fromSelectNodes.length >= 2) return fromSelectNodes

  const selectedIds = new Set(
    (lf?.getSelectElements(true).nodes ?? graphModel.getSelectElements(true).nodes).map((n) => n.id)
  )
  for (const node of graphModel.nodes) {
    if (node.isSelected) selectedIds.add(node.id)
  }
  return graphModel.nodes.filter((n) => selectedIds.has(n.id) && isDiagramContentNode(n))
}

/** 可参与等比缩放的图元 */
export function getMultiSelectResizeTargets(
  graphModel: LogicFlow.GraphModel,
  lf?: LogicFlow
): LogicFlow.BaseNodeModel[] {
  return getMultiSelectNodes(graphModel, lf).filter((n) => n.resizable !== false)
}

export function countMultiSelectResizeNodes(
  graphModel: LogicFlow.GraphModel,
  lf?: LogicFlow
): number {
  return getMultiSelectResizeTargets(graphModel, lf).length
}

export function countSelectedDiagramNodes(
  graphModel: LogicFlow.GraphModel,
  lf?: LogicFlow
): number {
  return getMultiSelectNodes(graphModel, lf).length
}

export function shouldShowSingleNodeResize(
  graphModel: LogicFlow.GraphModel,
  model: LogicFlow.BaseNodeModel
): boolean {
  if (!model.isSelected || !model.resizable || model.type === DIAGRAM_GROUP_FRAME_TYPE) {
    return false
  }
  const count = Math.max(getLiveMultiSelectCount(), countSelectedDiagramNodes(graphModel))
  return count <= 1
}

function unionBoundsFromModels(models: LogicFlow.BaseNodeModel[]): DiagramSelectionRect | null {
  if (!models.length) return null
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const model of models) {
    const box = getNodeBBox(model)
    minX = Math.min(minX, box.minX)
    minY = Math.min(minY, box.minY)
    maxX = Math.max(maxX, box.maxX)
    maxY = Math.max(maxY, box.maxY)
  }
  const width = maxX - minX
  const height = maxY - minY
  return {
    minX,
    minY,
    maxX,
    maxY,
    width,
    height,
    cx: (minX + maxX) / 2,
    cy: (minY + maxY) / 2
  }
}

function getOverlayMount(lf: LogicFlow, mountRoot?: HTMLElement): HTMLElement {
  const container = mountRoot ?? (lf.container as HTMLElement)
  if (!container.style.position) {
    container.style.position = 'relative'
  }
  return container
}

/** 多选包围盒在画布容器内的像素矩形（与 LogicFlow Html 坐标一致） */
export function getMultiSelectOverlayRect(
  lf: LogicFlow
): { left: number; top: number; width: number; height: number } | null {
  const selected = getMultiSelectNodes(lf.graphModel, lf)
  if (selected.length < 2) return null
  const bounds = unionBoundsFromModels(selected)
  if (!bounds) return null
  return canvasBoundsToHtmlRect(lf, paddedBounds(bounds, OUTLINE_PAD))
}

function snapNodes(lf: LogicFlow, models: LogicFlow.BaseNodeModel[]): NodeSnap[] {
  return models.map((model) => ({
    id: model.id,
    left: model.x - model.width / 2,
    top: model.y - model.height / 2,
    width: model.width,
    height: model.height,
    minWidth: Number(model.minWidth ?? 24),
    minHeight: Number(model.minHeight ?? 24),
    resizable: model.resizable !== false
  }))
}

function applyOutlineBox(
  lf: LogicFlow,
  outline: HTMLDivElement,
  handles: Record<HandleDir, { wrap: HTMLDivElement }>,
  canvasBounds: DiagramSelectionRect
): void {
  const box = canvasBoundsToHtmlRect(lf, canvasBounds)
  const theme = diagramResizeTheme()
  const ctrl = diagramResizeControlStyle()
  const dotSize = Math.max(Number(ctrl.width ?? 8), Number(ctrl.height ?? 8))
  const hitSize = dotSize + 10

  outline.style.left = `${box.left}px`
  outline.style.top = `${box.top}px`
  outline.style.width = `${box.width}px`
  outline.style.height = `${box.height}px`
  outline.style.borderColor = theme.outlineStroke

  const corners: Record<HandleDir, { x: number; y: number }> = {
    nw: { x: box.left, y: box.top },
    ne: { x: box.left + box.width, y: box.top },
    se: { x: box.left + box.width, y: box.top + box.height },
    sw: { x: box.left, y: box.top + box.height }
  }

  for (const dir of HANDLE_DIRS) {
    const { wrap } = handles[dir]
    if (!wrap) continue
    const { x, y } = corners[dir]
    wrap.style.left = `${x}px`
    wrap.style.top = `${y}px`
    wrap.style.setProperty('--dg-ms-dot', `${dotSize}px`)
    wrap.style.setProperty('--dg-ms-hit', `${hitSize}px`)
    const dotEl = wrap.querySelector('.dg-multi-select-resize__dot') as HTMLElement
    if (dotEl) {
      dotEl.style.background = String(ctrl.fill)
      dotEl.style.borderColor = String(ctrl.stroke)
    }
  }
}

/** 拖拽角的对边为缩放锚点（整体等比缩放） */
function fixedAnchorForHandle(
  dir: HandleDir,
  bounds: DiagramSelectionRect
): { x: number; y: number } {
  switch (dir) {
    case 'se':
      return { x: bounds.minX, y: bounds.minY }
    case 'nw':
      return { x: bounds.maxX, y: bounds.maxY }
    case 'ne':
      return { x: bounds.minX, y: bounds.maxY }
    case 'sw':
      return { x: bounds.maxX, y: bounds.minY }
  }
}

function applyUniformGroupScale(
  lf: LogicFlow,
  snaps: NodeSnap[],
  oldBounds: DiagramSelectionRect,
  newBounds: DiagramSelectionRect,
  fixed: { x: number; y: number },
  persist: boolean
): void {
  if (oldBounds.width < 1 || oldBounds.height < 1) return

  const scaleX = newBounds.width / oldBounds.width
  const scaleY = newBounds.height / oldBounds.height
  const moves: Array<{ id: string; x: number; y: number }> = []

  for (const snap of snaps) {
    const model = lf.getNodeModelById(snap.id)
    if (!model) continue

    const oldCx = snap.left + snap.width / 2
    const oldCy = snap.top + snap.height / 2
    const newCx = fixed.x + (oldCx - fixed.x) * scaleX
    const newCy = fixed.y + (oldCy - fixed.y) * scaleY

    if (snap.resizable) {
      const newW = Math.max(snap.minWidth, snap.width * scaleX)
      const newH = Math.max(snap.minHeight, snap.height * scaleY)
      applyNodeDimensions(
        model as Parameters<typeof applyNodeDimensions>[0],
        persist ? Math.round(newW) : newW,
        persist ? Math.round(newH) : newH
      )
    }

    moves.push({ id: snap.id, x: newCx, y: newCy })
  }

  for (const { id, x, y } of moves) {
    lf.graphModel.moveNode2Coordinate(id, x, y, true)
    const model = lf.getNodeModelById(id)
    if (model) syncNodeTextLayout(model)
  }

  if (persist) {
    for (const snap of snaps) {
      if (!snap.resizable) continue
      const model = lf.getNodeModelById(snap.id)
      if (model) {
        syncNodeSizeProperties(model as Parameters<typeof syncNodeSizeProperties>[0])
      }
    }
  }
}

function boundsForHandleDrag(
  dir: HandleDir,
  anchor: DiagramSelectionRect,
  dx: number,
  dy: number,
  lockAspect = false
): DiagramSelectionRect | null {
  let { minX, minY, maxX, maxY } = anchor
  if (dir === 'nw') {
    minX += dx
    minY += dy
  } else if (dir === 'ne') {
    maxX += dx
    minY += dy
  } else if (dir === 'se') {
    maxX += dx
    maxY += dy
  } else {
    minX += dx
    maxY += dy
  }

  if (lockAspect && anchor.width > 1 && anchor.height > 1) {
    const scaleX = (maxX - minX) / anchor.width
    const scaleY = (maxY - minY) / anchor.height
    const scale = Math.abs(scaleX - 1) < Math.abs(scaleY - 1) ? scaleX : scaleY
    const fixed = fixedAnchorForHandle(dir, anchor)
    const newW = anchor.width * scale
    const newH = anchor.height * scale
    if (newW < MIN_BBOX || newH < MIN_BBOX) return null
    if (dir === 'se') {
      maxX = fixed.x + newW
      maxY = fixed.y + newH
      minX = fixed.x
      minY = fixed.y
    } else if (dir === 'nw') {
      minX = fixed.x - newW
      minY = fixed.y - newH
      maxX = fixed.x
      maxY = fixed.y
    } else if (dir === 'ne') {
      maxX = fixed.x + newW
      minY = fixed.y - newH
      minX = fixed.x
      maxY = fixed.y
    } else {
      minX = fixed.x - newW
      maxY = fixed.y + newH
      maxX = fixed.x
      minY = fixed.y
    }
  }

  if (maxX - minX < MIN_BBOX || maxY - minY < MIN_BBOX) return null
  const width = maxX - minX
  const height = maxY - minY
  return {
    minX,
    minY,
    maxX,
    maxY,
    width,
    height,
    cx: (minX + maxX) / 2,
    cy: (minY + maxY) / 2
  }
}

function paddedBounds(bounds: DiagramSelectionRect, pad: number): DiagramSelectionRect {
  const minX = bounds.minX - pad
  const minY = bounds.minY - pad
  const maxX = bounds.maxX + pad
  const maxY = bounds.maxY + pad
  const width = maxX - minX
  const height = maxY - minY
  return {
    minX,
    minY,
    maxX,
    maxY,
    width,
    height,
    cx: (minX + maxX) / 2,
    cy: (minY + maxY) / 2
  }
}

function canvasBoundsToHtmlRect(
  lf: LogicFlow,
  bounds: DiagramSelectionRect
): { left: number; top: number; width: number; height: number } {
  const tm = lf.graphModel.transformModel
  const [left, top] = tm.CanvasPointToHtmlPoint([bounds.minX, bounds.minY])
  const [right, bottom] = tm.CanvasPointToHtmlPoint([bounds.maxX, bounds.maxY])
  return {
    left,
    top,
    width: Math.max(0, right - left),
    height: Math.max(0, bottom - top)
  }
}

export type DiagramMultiSelectLayout = {
  rect: { left: number; top: number; width: number; height: number } | null
  nodeCount: number
}

export type DiagramMultiSelectResizeHandle = {
  refresh: () => void
  /** 同步刷新（用于 node:click 等同帧需立即反映选区的场景） */
  refreshNow: () => DiagramMultiSelectLayout
  destroy: () => void
}

export function mountDiagramMultiSelectResize(
  lf: LogicFlow,
  onGraphChange: () => void,
  onLayoutChange?: (layout: DiagramMultiSelectLayout) => void,
  onNodesTransform?: () => void,
  mountRoot?: HTMLElement
): DiagramMultiSelectResizeHandle {
  const root = document.createElement('div')
  root.className = 'dg-multi-select-resize'
  root.style.display = 'none'

  const outline = document.createElement('div')
  outline.className = 'dg-multi-select-resize__outline'

  const handles: Record<
    HandleDir,
    { wrap: HTMLDivElement; hit: HTMLDivElement; drag: StepDrag }
  > = {} as never

  let refreshRaf: number | null = null
  let pendingLayout = false
  let groupResizing = false
  let aspectLock = false
  let nodeDragMoveListener: ((e: PointerEvent) => void) | null = null

  const syncAspectLock = (e: KeyboardEvent) => {
    aspectLock = e.shiftKey
  }

  const applyOutlineBoxFromBounds = (canvasBounds: DiagramSelectionRect) => {
    applyOutlineBox(lf, outline, handles, canvasBounds)
  }

  const mountTarget = getOverlayMount(lf, mountRoot)

  const refresh = (notifyLayout = true): DiagramMultiSelectLayout => {
    if (groupResizing) {
      const selected = getMultiSelectNodes(lf.graphModel, lf)
      setLiveMultiSelectCount(selected.length)
      return { rect: null, nodeCount: selected.length }
    }

    if (!mountTarget.contains(root)) {
      mountTarget.appendChild(root)
    }

    const selected = getMultiSelectNodes(lf.graphModel, lf)
    const resizeTargets = getMultiSelectResizeTargets(lf.graphModel, lf)
    const showHandles = selected.length >= 2 && resizeTargets.length > 0

    if (selected.length < 2) {
      root.style.display = 'none'
      root.classList.remove('dg-multi-select-resize--active', 'dg-multi-select-resize--handles')
      setLiveMultiSelectCount(selected.length)
      const layout = { rect: null, nodeCount: selected.length }
      if (notifyLayout) onLayoutChange?.(layout)
      return layout
    }

    const bounds = unionBoundsFromModels(selected)
    if (!bounds) {
      root.style.display = 'none'
      root.classList.remove('dg-multi-select-resize--active', 'dg-multi-select-resize--handles')
      setLiveMultiSelectCount(selected.length)
      const layout = { rect: null, nodeCount: selected.length }
      if (notifyLayout) onLayoutChange?.(layout)
      return layout
    }

    const padded = paddedBounds(bounds, OUTLINE_PAD)
    root.style.display = ''
    root.classList.add('dg-multi-select-resize--active')
    root.classList.toggle('dg-multi-select-resize--handles', showHandles)

    applyOutlineBoxFromBounds(padded)

    const layout = {
      rect: canvasBoundsToHtmlRect(lf, padded),
      nodeCount: selected.length
    }
    setLiveMultiSelectCount(selected.length)
    if (notifyLayout) onLayoutChange?.(layout)
    return layout
  }

  const scheduleRefresh = (layout: boolean) => {
    if (layout) pendingLayout = true
    if (refreshRaf != null) return
    refreshRaf = requestAnimationFrame(() => {
      refreshRaf = null
      const notifyLayout = pendingLayout
      pendingLayout = false
      refresh(notifyLayout)
    })
  }

  for (const dir of HANDLE_DIRS) {
    const wrap = document.createElement('div')
    wrap.className = `dg-multi-select-resize__handle dg-multi-select-resize__handle--${dir}`

    const dot = document.createElement('div')
    dot.className = 'dg-multi-select-resize__dot'

    const hit = document.createElement('div')
    hit.className = 'dg-multi-select-resize__hit'

    wrap.append(dot, hit)
    root.append(wrap)

    let startBounds: DiagramSelectionRect | null = null
    let fixedAnchor: { x: number; y: number } | null = null
    let snaps: NodeSnap[] = []
    let cumDx = 0
    let cumDy = 0

    const drag = new StepDrag({
      step: 1,
      onDragStart: () => {
        const selected = getMultiSelectNodes(lf.graphModel, lf)
        startBounds = unionBoundsFromModels(selected)
        if (!startBounds) return
        fixedAnchor = fixedAnchorForHandle(dir, startBounds)
        snaps = snapNodes(lf, selected)
        cumDx = 0
        cumDy = 0
        groupResizing = true
        diagramGroupMultiResizing = true
        aspectLock = false
        root.classList.add('dg-multi-select-resize--dragging')
        window.addEventListener('keydown', syncAspectLock, true)
        window.addEventListener('keyup', syncAspectLock, true)
      },
      onDragging: ({ deltaX, deltaY }) => {
        if (!startBounds || !fixedAnchor) return
        const [cdx, cdy] = lf.graphModel.transformModel.fixDeltaXY(deltaX, deltaY)
        cumDx += cdx
        cumDy += cdy
        const next = boundsForHandleDrag(dir, startBounds, cumDx, cumDy, aspectLock)
        if (!next) return
        applyUniformGroupScale(lf, snaps, startBounds, next, fixedAnchor, false)
        applyOutlineBoxFromBounds(paddedBounds(next, OUTLINE_PAD))
      },
      onDragEnd: () => {
        groupResizing = false
        diagramGroupMultiResizing = false
        window.removeEventListener('keydown', syncAspectLock, true)
        window.removeEventListener('keyup', syncAspectLock, true)
        root.classList.remove('dg-multi-select-resize--dragging')
        if (!startBounds || !fixedAnchor) return
        const next = boundsForHandleDrag(dir, startBounds, cumDx, cumDy)
        if (next) {
          applyUniformGroupScale(lf, snaps, startBounds, next, fixedAnchor, true)
          applyOutlineBoxFromBounds(paddedBounds(next, OUTLINE_PAD))
        } else {
          for (const snap of snaps) {
            const model = lf.getNodeModelById(snap.id)
            if (model) {
              syncNodeTextLayout(model)
              if (snap.resizable) {
                syncNodeSizeProperties(model as Parameters<typeof syncNodeSizeProperties>[0])
              }
            }
          }
          refresh(true)
        }
        startBounds = null
        fixedAnchor = null
        onGraphChange()
        onLayoutChange?.()
      }
    })

    hit.addEventListener(
      'pointerdown',
      (e) => {
        e.stopPropagation()
        e.preventDefault()
        hit.setPointerCapture(e.pointerId)
        drag.handleMouseDown(e as unknown as MouseEvent)
      },
      true
    )

    handles[dir] = { wrap, hit, drag }
  }

  root.prepend(outline)

  if (!mountTarget.contains(root)) {
    mountTarget.appendChild(root)
  }

  const onDragMoveDuringNode = () => {
    if (groupResizing) return
    onNodesTransform?.()
    if (refreshRaf != null) return
    refreshRaf = requestAnimationFrame(() => {
      refreshRaf = null
      refresh(true)
    })
  }

  const onSelectionDragStart = () => {
    if (getMultiSelectNodes(lf.graphModel, lf).length >= 2) {
      root.classList.add('dg-multi-select-resize--dragging')
    }
  }

  const onNodeDragStart = () => {
    onSelectionDragStart()
    if (nodeDragMoveListener) return
    nodeDragMoveListener = onDragMoveDuringNode
    window.addEventListener('pointermove', nodeDragMoveListener, { passive: true })
  }

  const onDragEnd = () => {
    root.classList.remove('dg-multi-select-resize--dragging')
    if (nodeDragMoveListener) {
      window.removeEventListener('pointermove', nodeDragMoveListener)
      nodeDragMoveListener = null
    }
    scheduleRefresh(true)
  }

  const onRefresh = () => scheduleRefresh(true)

  scheduleRefresh(true)

  lf.on('graph:transform', onRefresh)
  lf.on('node:click', onRefresh)
  lf.on('edge:click', onRefresh)
  lf.on('selection:dragstart', onSelectionDragStart)
  lf.on('selection:drag', onDragMoveDuringNode)
  lf.on('selection:drop', onDragEnd)
  lf.on('node:dragstart', onNodeDragStart)
  lf.on('node:drag', onDragMoveDuringNode)
  lf.on('node:drop', onDragEnd)
  lf.on('node:resize', onRefresh)
  lf.on('node:delete', onRefresh)
  lf.on('selection:selected', onRefresh)
  lf.on('selection:mouseup', onRefresh)
  lf.on('blank:click', onRefresh)
  lf.on('history:change', onRefresh)

  const destroy = () => {
    onDragEnd()
    lf.off('graph:transform', onRefresh)
    lf.off('node:click', onRefresh)
    lf.off('edge:click', onRefresh)
    lf.off('selection:dragstart', onSelectionDragStart)
    lf.off('selection:drag', onDragMoveDuringNode)
    lf.off('selection:drop', onDragEnd)
    lf.off('node:dragstart', onNodeDragStart)
    lf.off('node:drag', onDragMoveDuringNode)
    lf.off('node:drop', onDragEnd)
    lf.off('node:resize', onRefresh)
    lf.off('node:delete', onRefresh)
    lf.off('selection:selected', onRefresh)
    lf.off('selection:mouseup', onRefresh)
    lf.off('blank:click', onRefresh)
    lf.off('history:change', onRefresh)
    for (const dir of HANDLE_DIRS) {
      handles[dir].drag.destroy()
    }
    root.remove()
  }

  return {
    refresh: () => scheduleRefresh(true),
    refreshNow: () => {
      if (refreshRaf != null) {
        cancelAnimationFrame(refreshRaf)
        refreshRaf = null
        pendingLayout = false
      }
      return refresh(false)
    },
    destroy
  }
}
