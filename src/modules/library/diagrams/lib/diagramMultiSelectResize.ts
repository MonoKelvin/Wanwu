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

/** 参与多选框计算的图元（不含组合框） */
export function getMultiSelectNodes(graphModel: LogicFlow.GraphModel): LogicFlow.BaseNodeModel[] {
  return graphModel.nodes.filter(
    (n) =>
      n.isSelected &&
      n.type !== DIAGRAM_GROUP_FRAME_TYPE &&
      n.visible !== false
  )
}

/** 可参与等比缩放的图元 */
export function getMultiSelectResizeTargets(
  graphModel: LogicFlow.GraphModel
): LogicFlow.BaseNodeModel[] {
  return getMultiSelectNodes(graphModel).filter((n) => n.resizable !== false)
}

export function countMultiSelectResizeNodes(graphModel: LogicFlow.GraphModel): number {
  return getMultiSelectResizeTargets(graphModel).length
}

export function countSelectedDiagramNodes(graphModel: LogicFlow.GraphModel): number {
  return getMultiSelectNodes(graphModel).length
}

export function shouldShowSingleNodeResize(
  graphModel: LogicFlow.GraphModel,
  model: LogicFlow.BaseNodeModel
): boolean {
  if (!model.isSelected || !model.resizable || model.type === DIAGRAM_GROUP_FRAME_TYPE) {
    return false
  }
  return countSelectedDiagramNodes(graphModel) <= 1
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

function getOverlayMount(lf: LogicFlow): HTMLElement {
  const container = lf.container as HTMLElement
  if (!container.style.position) {
    container.style.position = 'relative'
  }
  return container
}

/** 多选包围盒在画布容器内的像素矩形（与 LogicFlow Html 坐标一致） */
export function getMultiSelectOverlayRect(
  lf: LogicFlow
): { left: number; top: number; width: number; height: number } | null {
  const selected = getMultiSelectNodes(lf.graphModel)
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

function setNodeSizeVisual(
  model: LogicFlow.BaseNodeModel,
  width: number,
  height: number
): void {
  if (typeof model.rx === 'number' && typeof model.ry === 'number') {
    model.rx = width / 2
    model.ry = height / 2
  }
  model.width = width
  model.height = height
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
      if (persist) {
        applyNodeDimensions(
          model as Parameters<typeof applyNodeDimensions>[0],
          Math.round(newW),
          Math.round(newH)
        )
      } else {
        setNodeSizeVisual(model, Math.round(newW), Math.round(newH))
      }
    }

    model.move(newCx - model.x, newCy - model.y)

    if (persist) {
      syncNodeTextLayout(model)
      if (snap.resizable) {
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

export type DiagramMultiSelectResizeHandle = {
  refresh: () => void
  destroy: () => void
}

export function mountDiagramMultiSelectResize(
  lf: LogicFlow,
  onGraphChange: () => void,
  onLayoutChange?: () => void
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

  const syncAspectLock = (e: KeyboardEvent) => {
    aspectLock = e.shiftKey
  }

  const applyOutlineBoxFromBounds = (canvasBounds: DiagramSelectionRect) => {
    applyOutlineBox(lf, outline, handles, canvasBounds)
  }

  const refresh = (notifyLayout = true) => {
    if (groupResizing) return

    const selected = getMultiSelectNodes(lf.graphModel)
    const resizeTargets = getMultiSelectResizeTargets(lf.graphModel)
    const showHandles = resizeTargets.length >= 2

    if (selected.length < 2) {
      root.style.display = 'none'
      root.classList.remove('dg-multi-select-resize--active', 'dg-multi-select-resize--handles')
      return
    }

    const bounds = unionBoundsFromModels(selected)
    if (!bounds) {
      root.style.display = 'none'
      root.classList.remove('dg-multi-select-resize--active', 'dg-multi-select-resize--handles')
      return
    }

    root.style.display = ''
    root.classList.add('dg-multi-select-resize--active')
    root.classList.toggle('dg-multi-select-resize--handles', showHandles)

    applyOutlineBoxFromBounds(paddedBounds(bounds, OUTLINE_PAD))

    if (notifyLayout) {
      onLayoutChange?.()
    }
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
        const selected = getMultiSelectNodes(lf.graphModel)
        startBounds = unionBoundsFromModels(selected)
        if (!startBounds) return
        fixedAnchor = fixedAnchorForHandle(dir, startBounds)
        snaps = snapNodes(lf, selected)
        cumDx = 0
        cumDy = 0
        groupResizing = true
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
        onLayoutChange?.()
      },
      onDragEnd: () => {
        groupResizing = false
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

  const mountTarget = getOverlayMount(lf)
  if (!mountTarget.contains(root)) {
    mountTarget.appendChild(root)
  }

  const onRefresh = () => scheduleRefresh(true)
  const onDragRefresh = () => {
    scheduleRefresh(false)
    onLayoutChange?.()
  }

  scheduleRefresh(true)

  lf.on('graph:transform', onRefresh)
  lf.on('node:click', onRefresh)
  lf.on('edge:click', onRefresh)
  lf.on('node:drag', onDragRefresh)
  lf.on('node:dragend', onRefresh)
  lf.on('node:resize', onRefresh)
  lf.on('node:delete', onRefresh)
  lf.on('selection:selected', onRefresh)
  lf.on('selection:mouseup', onRefresh)
  lf.on('blank:click', onRefresh)
  lf.on('history:change', onRefresh)

  const destroy = () => {
    lf.off('graph:transform', onRefresh)
    lf.off('node:click', onRefresh)
    lf.off('edge:click', onRefresh)
    lf.off('node:drag', onDragRefresh)
    lf.off('node:dragend', onRefresh)
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

  return { refresh: () => scheduleRefresh(true), destroy }
}
