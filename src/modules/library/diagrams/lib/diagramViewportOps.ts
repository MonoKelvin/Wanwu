import type LogicFlow from '@logicflow/core'
import { notifyDiagramViewportChange } from '@modules/library/diagrams/lib/diagramCanvasInteractionSettings'
import type { DiagramViewport } from '@modules/library/diagrams/interfaces/IDiagramEditorPort'

/** 工具栏单步缩放倍率（相对当前倍率 ×1.1 / ÷1.1） */
export const DIAGRAM_VIEWPORT_ZOOM_STEP = 1.1

export const DIAGRAM_VIEWPORT_ZOOM_MIN = 0.1
export const DIAGRAM_VIEWPORT_ZOOM_MAX = 4

/**
 * 滚轮缩放灵敏度（指数系数）。
 * scale *= exp(-deltaY * k)：放大时步进更大、缩小时步进更小，与当前倍率成正比。
 * deltaY≈100（一格滚轮）时约 ±10%。
 */
const WHEEL_ZOOM_RATE = 0.001

export function getDiagramViewport(lf: LogicFlow): DiagramViewport {
  const { TRANSLATE_X, TRANSLATE_Y, SCALE_X } = lf.getTransform()
  return { x: TRANSLATE_X, y: TRANSLATE_Y, zoom: SCALE_X }
}

export function clampDiagramZoom(scale: number): number {
  return Math.min(DIAGRAM_VIEWPORT_ZOOM_MAX, Math.max(DIAGRAM_VIEWPORT_ZOOM_MIN, scale))
}

function viewportCenterClient(lf: LogicFlow): { x: number; y: number } {
  const rect = lf.graphModel.rootEl.getBoundingClientRect()
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
}

/** 将 WheelEvent.deltaY 统一为像素 delta（兼容 line / page 模式） */
export function normalizeDiagramWheelDeltaY(event: WheelEvent): number {
  let deltaY = event.deltaY
  if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) {
    deltaY *= 16
  } else if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
    deltaY *= 320
  }
  return deltaY
}

/** 由滚轮 delta 推算目标倍率（相对当前倍率的比例缩放，非固定绝对增量） */
export function diagramZoomScaleFromWheelDelta(currentScale: number, deltaY: number): number {
  if (deltaY === 0) return currentScale
  return clampDiagramZoom(currentScale * Math.exp(-deltaY * WHEEL_ZOOM_RATE))
}

function translateForZoomAtPivot(
  translateX: number,
  translateY: number,
  fromScale: number,
  toScale: number,
  pivotCanvasX: number,
  pivotCanvasY: number
): { tx: number; ty: number } {
  const dScale = toScale - fromScale
  return {
    tx: translateX - dScale * pivotCanvasX,
    ty: translateY - dScale * pivotCanvasY
  }
}

function applyDiagramTransform(
  lf: LogicFlow,
  scale: number,
  translateX: number,
  translateY: number
): void {
  const tm = lf.graphModel.transformModel
  tm.SCALE_X = scale
  tm.SCALE_Y = scale
  tm.TRANSLATE_X = translateX
  tm.TRANSLATE_Y = translateY
  lf.graphModel.eventCenter.emit('graph:transform', {
    type: 'zoom',
    transform: {
      SCALE_X: scale,
      SKEW_Y: tm.SKEW_Y,
      SKEW_X: tm.SKEW_X,
      SCALE_Y: scale,
      TRANSLATE_X: translateX,
      TRANSLATE_Y: translateY
    }
  })
  notifyDiagramViewportChange()
}

/** 以画布 pivot 一次性应用目标倍率（无动画，避免回弹） */
export function setDiagramZoomAtCanvasPivot(
  lf: LogicFlow,
  targetScale: number,
  pivotCanvasX: number,
  pivotCanvasY: number
): void {
  const tm = lf.graphModel.transformModel
  const fromScale = tm.SCALE_X
  const toScale = clampDiagramZoom(targetScale)
  if (Math.abs(toScale - fromScale) < 0.0001) return

  const { tx, ty } = translateForZoomAtPivot(
    tm.TRANSLATE_X,
    tm.TRANSLATE_Y,
    fromScale,
    toScale,
    pivotCanvasX,
    pivotCanvasY
  )
  applyDiagramTransform(lf, toScale, tx, ty)
}

/** Ctrl+滚轮：按 delta 连续比例缩放，跟手、无插值回弹 */
export function zoomDiagramCanvasAtWheel(
  lf: LogicFlow,
  deltaY: number,
  clientX: number,
  clientY: number
): void {
  const tm = lf.graphModel.transformModel
  const toScale = diagramZoomScaleFromWheelDelta(tm.SCALE_X, deltaY)
  if (Math.abs(toScale - tm.SCALE_X) < 0.0001) return

  const pivot = lf.getPointByClient({ x: clientX, y: clientY }).canvasOverlayPosition
  setDiagramZoomAtCanvasPivot(lf, toScale, pivot.x, pivot.y)
}

/** 工具栏 / 快捷键：相对当前倍率步进（×1.1 或 ÷1.1） */
export function zoomDiagramCanvasAtClient(
  lf: LogicFlow,
  direction: 'in' | 'out',
  clientX: number,
  clientY: number
): void {
  const tm = lf.graphModel.transformModel
  const ratio = direction === 'in' ? DIAGRAM_VIEWPORT_ZOOM_STEP : 1 / DIAGRAM_VIEWPORT_ZOOM_STEP
  const pivot = lf.getPointByClient({ x: clientX, y: clientY }).canvasOverlayPosition
  setDiagramZoomAtCanvasPivot(lf, tm.SCALE_X * ratio, pivot.x, pivot.y)
}

export function zoomDiagramCanvas(lf: LogicFlow, delta?: number, scale?: number): void {
  const center = viewportCenterClient(lf)
  const pivot = lf.getPointByClient(center).canvasOverlayPosition

  if (typeof scale === 'number') {
    setDiagramZoomAtCanvasPivot(lf, scale, pivot.x, pivot.y)
    return
  }

  const direction = (delta ?? 0.1) > 0 ? 'in' : 'out'
  zoomDiagramCanvasAtClient(lf, direction, center.x, center.y)
}

export function centerDiagramOnOrigin(lf: LogicFlow): void {
  lf.focusOn({ x: 0, y: 0 })
}

/** 将视口聚焦到全部图元包围盒中心；无图元时返回 false */
export function centerDiagramOnContent(lf: LogicFlow): boolean {
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity

  for (const model of lf.graphModel.nodes) {
    minX = Math.min(minX, model.x - model.width / 2)
    maxX = Math.max(maxX, model.x + model.width / 2)
    minY = Math.min(minY, model.y - model.height / 2)
    maxY = Math.max(maxY, model.y + model.height / 2)
  }
  for (const edge of lf.graphModel.edges) {
    for (const pt of edge.pointsList ?? []) {
      minX = Math.min(minX, pt.x)
      maxX = Math.max(maxX, pt.x)
      minY = Math.min(minY, pt.y)
      maxY = Math.max(maxY, pt.y)
    }
  }

  if (!Number.isFinite(minX)) return false

  lf.focusOn({
    x: (minX + maxX) / 2,
    y: (minY + maxY) / 2
  })
  return true
}

export function applyDiagramViewport(lf: LogicFlow, viewport: DiagramViewport): void {
  lf.resetZoom()
  lf.resetTranslate()
  if (Math.abs(viewport.zoom - 1) > 0.001) {
    lf.zoom(clampDiagramZoom(viewport.zoom))
  }
  const isDefault =
    Math.abs(viewport.x) < 0.5 &&
    Math.abs(viewport.y) < 0.5 &&
    Math.abs(viewport.zoom - 1) < 0.001
  if (isDefault) {
    centerDiagramOnOrigin(lf)
    return
  }
  lf.translate(viewport.x, viewport.y)
}
