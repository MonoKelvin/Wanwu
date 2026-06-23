import type { IPixelEditorPort, PixelPointerHandlers } from '@modules/library/pixel-art/services/IPixelEditorPort'
import type {
  LayerPixelPatch,
  PixelCanvasResizeAnchor,
  PixelDocument,
  PixelViewport,
  SvgExportMode,
  SvgVectorStrategy
} from '@modules/library/pixel-art/domain/types'
import {
  DEFAULT_TOOL_OPTIONS,
  type ToolId,
  type ToolOptions
} from '@modules/library/pixel-art/domain/tools'
import { clonePixelDocument, getActiveFrame, getActiveLayerMeta } from '@modules/library/pixel-art/lib/blankDocument'
import { compositeDocument, pixelsToImageData } from '@modules/library/pixel-art/lib/composite'
import { floodFillScanline } from '@modules/library/pixel-art/lib/floodFill'
import { applyLinearGradient, pickColorFromPixels } from '@modules/library/pixel-art/lib/gradientFill'
import { normalizeSelection } from '@modules/library/pixel-art/lib/selection'
import { selectionContains } from '@modules/library/pixel-art/lib/selection'
import {
  ellipsePoints,
  filledEllipsePoints,
  linePoints,
  rectPoints,
  uniquePoints
} from '@modules/library/pixel-art/lib/shapes'
import {
  exportDocumentJpeg,
  exportDocumentPng,
  exportDocumentSvg
} from '@modules/library/pixel-art/lib/exportImage'
import { PIXEL_MAX_HEIGHT, PIXEL_MAX_LAYERS, PIXEL_MAX_WIDTH, PIXEL_ZOOM_LEVELS } from '@modules/library/pixel-art/domain/meta'
import { getPixelUnitSize } from '@modules/library/pixel-art/lib/pixelCanvasPresets'

interface UndoEntry {
  layerId: string
  before: Uint8ClampedArray
  after: Uint8ClampedArray
}

function parseColor(hex: string): [number, number, number, number] {
  const h = hex.replace('#', '')
  if (h.length === 6) {
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), 255]
  }
  if (h.length === 8) {
    return [
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16),
      parseInt(h.slice(6, 8), 16)
    ]
  }
  return [0, 0, 0, 255]
}

export class PixelCanvasEngine implements IPixelEditorPort {
  private root: HTMLElement | null = null
  private canvas: HTMLCanvasElement | null = null
  private ctx: CanvasRenderingContext2D | null = null
  private doc: PixelDocument | null = null
  private toolId: ToolId = 'pencil'
  private toolOptions: ToolOptions = { ...DEFAULT_TOOL_OPTIONS }
  private viewport: PixelViewport = { zoom: 8, panX: 0, panY: 0 }
  private handlers: PixelPointerHandlers = {}
  private theme: 'light' | 'dark' = 'light'
  private isDrawing = false
  private strokeBefore: Uint8ClampedArray | null = null
  private shapeStart: { x: number; y: number } | null = null
  private previewPixels: Uint8ClampedArray | null = null
  private previewSelection: PixelSelection | null = null
  private selection: PixelSelection | null = null
  private panning = false
  private altPanPending = false
  private altPanStart = { x: 0, y: 0 }
  private lastPaintPos: { x: number; y: number } | null = null
  private capturedPointerId: number | null = null
  private panStart = { x: 0, y: 0, panX: 0, panY: 0 }
  private moveDragLast: { x: number; y: number } | null = null
  private checkerPattern: CanvasPattern | null = null
  private selectionAnimPhase = 0
  private animFrameId: number | null = null
  private undoStack: UndoEntry[] = []
  private redoStack: UndoEntry[] = []
  private strokeRecorder: ((layerId: string, before: Uint8ClampedArray, after: Uint8ClampedArray) => void) | null =
    null
  private boundOnPointerDown = (e: PointerEvent) => this.onPointerDown(e)
  private boundOnPointerMove = (e: PointerEvent) => this.onPointerMove(e)
  private boundOnPointerUp = (e: PointerEvent) => this.onPointerUp(e)
  private boundOnWheel = (e: WheelEvent) => this.onWheel(e)
  private boundOnLostCapture = (e: PointerEvent) => this.onLostCapture(e)

  mount(el: HTMLElement): void {
    this.destroy()
    this.root = el
    this.canvas = document.createElement('canvas')
    this.canvas.className = 'pixel-art-canvas'
    this.canvas.tabIndex = -1
    this.canvas.style.imageRendering = 'pixelated'
    this.canvas.style.touchAction = 'none'
    el.appendChild(this.canvas)
    this.ctx = this.canvas.getContext('2d')!
    this.ctx.imageSmoothingEnabled = false
    this.canvas.addEventListener('pointerdown', this.boundOnPointerDown)
    this.canvas.addEventListener('pointermove', this.boundOnPointerMove)
    this.canvas.addEventListener('pointerup', this.boundOnPointerUp)
    this.canvas.addEventListener('lostpointercapture', this.boundOnLostCapture)
    this.canvas.addEventListener('wheel', this.boundOnWheel, { passive: false })
    this.resizeCanvasToContainer()
    this.render()
  }

  destroy(): void {
    if (this.canvas) {
      this.canvas.removeEventListener('pointerdown', this.boundOnPointerDown)
      this.canvas.removeEventListener('pointermove', this.boundOnPointerMove)
      this.canvas.removeEventListener('pointerup', this.boundOnPointerUp)
      this.canvas.removeEventListener('lostpointercapture', this.boundOnLostCapture)
      this.canvas.removeEventListener('wheel', this.boundOnWheel)
      this.canvas.remove()
    }
    this.canvas = null
    this.ctx = null
    this.root = null
    if (this.animFrameId != null) cancelAnimationFrame(this.animFrameId)
    this.animFrameId = null
  }

  loadDocument(doc: PixelDocument): void {
    this.doc = clonePixelDocument(doc)
    this.undoStack = []
    this.redoStack = []
    this.selection = null
    this.applyDefaultZoom()
    this.render()
  }

  private pixelUnitSize(): number {
    return this.doc ? getPixelUnitSize(this.doc.meta) : 1
  }

  applyDefaultZoom(): void {
    this.viewport.zoom = this.pixelUnitSize()
  }

  getDocument(): PixelDocument {
    if (!this.doc) throw new Error('无文档')
    return clonePixelDocument(this.doc)
  }

  setActiveLayer(layerId: string): void {
    if (!this.doc) return
    this.doc.meta.activeLayerId = layerId
    this.handlers.onDocumentChange?.()
    this.render()
  }

  getActiveLayerId(): string {
    return this.doc?.meta.activeLayerId ?? ''
  }

  setTool(tool: ToolId, options?: Partial<ToolOptions>): void {
    this.toolId = tool
    if (options) this.toolOptions = { ...this.toolOptions, ...options }
  }

  getTool() {
    return { id: this.toolId, options: { ...this.toolOptions } }
  }

  setForeground(color: string): void {
    if (!this.doc) return
    this.doc.meta.foreground = color
  }

  setBackgroundColor(color: string): void {
    if (!this.doc) return
    this.doc.meta.backgroundColor = color
  }

  setViewport(viewport: Partial<PixelViewport>): void {
    this.viewport = { ...this.viewport, ...viewport }
    this.bumpViewport()
  }

  private bumpViewport(): void {
    this.render()
    this.handlers.onViewportChange?.()
  }

  getViewport(): PixelViewport {
    return { ...this.viewport }
  }

  getLayerImageData(layerId: string): ImageData | null {
    if (!this.doc) return null
    const pixels = this.doc.layerPixels[layerId]
    if (!pixels) return null
    return pixelsToImageData(pixels, this.doc.meta.width, this.doc.meta.height)
  }

  applyLayerPatch(layerId: string, patch: LayerPixelPatch, recordUndo = true): void {
    if (!this.doc) return
    const layer = this.doc.layerPixels[layerId]
    if (!layer) return
    if (recordUndo) {
      this.pushUndo(layerId, patch.before, patch.after)
    }
    this.blitPatch(layer, patch)
    this.handlers.onDocumentChange?.()
    this.render()
  }

  setTheme(resolved: 'light' | 'dark'): void {
    this.theme = resolved
    this.render()
  }

  setGridVisible(visible: boolean): void {
    if (!this.doc) return
    this.doc.meta.grid.visible = visible
    this.render()
  }

  setCheckerboardVisible(visible: boolean): void {
    if (!this.doc) return
    this.doc.meta.checkerboard.visible = visible
    this.render()
  }

  bindPointerHandlers(handlers: PixelPointerHandlers): void {
    this.handlers = handlers
  }

  setStrokeRecorder(
    recorder: ((layerId: string, before: Uint8ClampedArray, after: Uint8ClampedArray) => void) | null
  ): void {
    this.strokeRecorder = recorder
  }

  replaceLayerPixels(layerId: string, pixels: Uint8ClampedArray): void {
    if (!this.doc) return
    const layer = this.doc.layerPixels[layerId]
    if (!layer) return
    layer.set(pixels)
    this.render()
  }

  undo(): boolean {
    const entry = this.undoStack.pop()
    if (!entry || !this.doc) return false
    const layer = this.doc.layerPixels[entry.layerId]
    if (!layer) return false
    layer.set(entry.before)
    this.redoStack.push(entry)
    this.handlers.onDocumentChange?.()
    this.render()
    return true
  }

  redo(): boolean {
    const entry = this.redoStack.pop()
    if (!entry || !this.doc) return false
    const layer = this.doc.layerPixels[entry.layerId]
    if (!layer) return false
    layer.set(entry.after)
    this.undoStack.push(entry)
    this.handlers.onDocumentChange?.()
    this.render()
    return true
  }

  canUndo(): boolean {
    return this.undoStack.length > 0
  }

  canRedo(): boolean {
    return this.redoStack.length > 0
  }

  exportMergedPng(): Promise<Blob> {
    if (!this.doc) throw new Error('无文档')
    return exportDocumentPng(this.doc)
  }

  exportMergedJpeg(quality = 0.92): Promise<Blob> {
    if (!this.doc) throw new Error('无文档')
    return exportDocumentJpeg(this.doc, quality)
  }

  exportSvg(mode: SvgExportMode, strategy: SvgVectorStrategy = 'merged'): Promise<Blob> {
    if (!this.doc) throw new Error('无文档')
    return exportDocumentSvg(this.doc, mode, strategy)
  }

  zoomIn(): void {
    this.zoomAtScreen(this.root ? this.root.clientWidth / 2 : 0, this.root ? this.root.clientHeight / 2 : 0, 1)
  }

  zoomOut(): void {
    this.zoomAtScreen(this.root ? this.root.clientWidth / 2 : 0, this.root ? this.root.clientHeight / 2 : 0, -1)
  }

  zoomInAt(clientX: number, clientY: number): void {
    this.zoomAtScreen(clientX, clientY, 1)
  }

  zoomOutAt(clientX: number, clientY: number): void {
    this.zoomAtScreen(clientX, clientY, -1)
  }

  private zoomAtScreen(clientX: number, clientY: number, direction: 1 | -1): void {
    if (!this.canvas) {
      if (direction > 0) this.stepZoomLevel(1)
      else this.stepZoomLevel(-1)
      return
    }
    const rect = this.canvas.getBoundingClientRect()
    const cx = clientX - rect.left
    const cy = clientY - rect.top
    const oldZoom = this.viewport.zoom
    const newZoom = this.nextZoomLevel(oldZoom, direction)
    if (newZoom === oldZoom) return
    const wx = (cx - this.viewport.panX) / oldZoom
    const wy = (cy - this.viewport.panY) / oldZoom
    this.viewport.zoom = newZoom
    this.viewport.panX = cx - wx * newZoom
    this.viewport.panY = cy - wy * newZoom
    this.bumpViewport()
  }

  private stepZoomLevel(direction: 1 | -1): void {
    const oldZoom = this.viewport.zoom
    const newZoom = this.nextZoomLevel(oldZoom, direction)
    if (newZoom === oldZoom) return
    this.viewport.zoom = newZoom
    this.bumpViewport()
  }

  private nextZoomLevel(current: number, direction: 1 | -1): number {
    const unit = this.pixelUnitSize()
    const levels = PIXEL_ZOOM_LEVELS.map((level) => level * unit)
    const idx = levels.findIndex((z) => z >= current - 0.001)
    const baseIdx = idx < 0 ? levels.length - 1 : idx
    if (direction > 0) {
      return levels[Math.min(baseIdx + 1, levels.length - 1)] ?? current * 2
    }
    return levels[Math.max(baseIdx - 1, 0)] ?? Math.max(unit, current / 2)
  }

  zoomToFit(containerWidth: number, containerHeight: number): void {
    if (!this.doc) return
    const pad = 32
    const unit = this.pixelUnitSize()
    const zx = Math.floor((containerWidth - pad) / this.doc.meta.width)
    const zy = Math.floor((containerHeight - pad) / this.doc.meta.height)
    const zoom = Math.max(unit, Math.min(zx, zy, 32 * unit))
    this.viewport.zoom = zoom
    this.viewport.panX = Math.floor((containerWidth - this.doc.meta.width * zoom) / 2)
    this.viewport.panY = Math.floor((containerHeight - this.doc.meta.height * zoom) / 2)
    this.bumpViewport()
  }

  zoomReset(): void {
    this.viewport.zoom = this.pixelUnitSize()
    this.bumpViewport()
  }

  /** 在容器内居中当前缩放下的画布 */
  centerInContainer(containerWidth: number, containerHeight: number): void {
    if (!this.doc) return
    const zoom = this.viewport.zoom
    this.viewport.panX = Math.floor((containerWidth - this.doc.meta.width * zoom) / 2)
    this.viewport.panY = Math.floor((containerHeight - this.doc.meta.height * zoom) / 2)
    this.bumpViewport()
  }

  /** 100% 缩放并居中 */
  resetViewportAt100(containerWidth: number, containerHeight: number): void {
    this.applyDefaultZoom()
    this.centerInContainer(containerWidth, containerHeight)
  }

  setPixelUnitSize(size: number): void {
    if (!this.doc) return
    const oldUnit = this.pixelUnitSize()
    const next = Math.max(1, Math.min(64, Math.floor(size)))
    if (!this.doc.meta.display) this.doc.meta.display = { pixelUnitSize: next }
    else this.doc.meta.display.pixelUnitSize = next
    if (oldUnit > 0 && oldUnit !== next) {
      this.viewport.zoom = (this.viewport.zoom / oldUnit) * next
      this.bumpViewport()
    }
    this.handlers.onDocumentChange?.()
  }

  setGridSubdiv(size: number): void {
    if (!this.doc) return
    this.doc.meta.grid.size = Math.max(1, Math.min(16, Math.floor(size)))
    this.handlers.onDocumentChange?.()
    this.render()
  }

  resizeDocument(width: number, height: number, anchor: PixelCanvasResizeAnchor = 'center'): boolean {
    if (!this.doc) return false
    const newW = Math.max(1, Math.min(PIXEL_MAX_WIDTH, Math.floor(width)))
    const newH = Math.max(1, Math.min(PIXEL_MAX_HEIGHT, Math.floor(height)))
    const oldW = this.doc.meta.width
    const oldH = this.doc.meta.height
    if (newW === oldW && newH === oldH) return false

    const offsetX = anchor === 'center' ? Math.floor((newW - oldW) / 2) : 0
    const offsetY = anchor === 'center' ? Math.floor((newH - oldH) / 2) : 0
    const nextPixels: Record<string, Uint8ClampedArray> = {}

    for (const [layerId, pixels] of Object.entries(this.doc.layerPixels)) {
      const buf = new Uint8ClampedArray(newW * newH * 4)
      for (let y = 0; y < oldH; y++) {
        for (let x = 0; x < oldW; x++) {
          const dstX = x + offsetX
          const dstY = y + offsetY
          if (dstX < 0 || dstY < 0 || dstX >= newW || dstY >= newH) continue
          const srcI = (y * oldW + x) * 4
          const dstI = (dstY * newW + dstX) * 4
          buf[dstI] = pixels[srcI]!
          buf[dstI + 1] = pixels[srcI + 1]!
          buf[dstI + 2] = pixels[srcI + 2]!
          buf[dstI + 3] = pixels[srcI + 3]!
        }
      }
      nextPixels[layerId] = buf
    }

    this.doc.meta.width = newW
    this.doc.meta.height = newH
    this.doc.layerPixels = nextPixels
    if (this.selection) {
      this.selection = clampSelection(
        {
          x: this.selection.x + offsetX,
          y: this.selection.y + offsetY,
          width: this.selection.width,
          height: this.selection.height
        },
        newW,
        newH
      )
    }
    this.handlers.onDocumentChange?.()
    this.render()
    return true
  }

  setLayerVisible(layerId: string, visible: boolean): void {
    if (!this.doc) return
    const layer = getActiveFrame(this.doc).layers.find((l) => l.id === layerId)
    if (!layer) return
    layer.visible = visible
    this.handlers.onDocumentChange?.()
    this.render()
  }

  setLayerLocked(layerId: string, locked: boolean): void {
    if (!this.doc) return
    const layer = getActiveFrame(this.doc).layers.find((l) => l.id === layerId)
    if (!layer) return
    layer.locked = locked
    this.handlers.onDocumentChange?.()
    this.render()
  }

  renameLayer(layerId: string, name: string): void {
    if (!this.doc) return
    const layer = getActiveFrame(this.doc).layers.find((l) => l.id === layerId)
    if (!layer) return
    layer.name = name
    this.handlers.onDocumentChange?.()
    this.render()
  }

  mergeVisibleLayers(): boolean {
    if (!this.doc) return false
    const frame = getActiveFrame(this.doc)
    const visible = frame.layerOrder
      .map((id) => frame.layers.find((l) => l.id === id))
      .filter((l): l is NonNullable<typeof l> => Boolean(l?.visible))
    if (visible.length <= 1) return false

    const { width, height } = this.doc.meta
    const mergedId = `layer-${crypto.randomUUID()}`
    const mergedPixels = compositeDocument(this.doc)
    const mergedMeta = {
      id: mergedId,
      name: '合并图层',
      visible: true,
      locked: false,
      opacity: 1
    }

    const removeIds = new Set(visible.map((l) => l.id))
    frame.layers = frame.layers.filter((l) => !removeIds.has(l.id))
    frame.layerOrder = frame.layerOrder.filter((id) => !removeIds.has(id))
    frame.layers.push(mergedMeta)
    frame.layerOrder.push(mergedId)
    this.doc.layerPixels[mergedId] = mergedPixels
    for (const id of removeIds) delete this.doc.layerPixels[id]
    this.doc.meta.activeLayerId = mergedId
    this.handlers.onDocumentChange?.()
    this.render()
    return true
  }

  mergeLayers(layerIds: string[]): boolean {
    if (!this.doc || layerIds.length < 2) return false
    const frame = getActiveFrame(this.doc)
    const order = frame.layerOrder
    const sorted = [...new Set(layerIds)]
      .filter((id) => order.includes(id))
      .sort((a, b) => order.indexOf(a) - order.indexOf(b))
    if (sorted.length < 2) return false

    const targetId = sorted[0]!
    const targetPixels = this.doc.layerPixels[targetId]
    if (!targetPixels) return false

    const merged = new Uint8ClampedArray(targetPixels)
    for (let i = 1; i < sorted.length; i++) {
      const src = this.doc.layerPixels[sorted[i]!]
      const layer = frame.layers.find((l) => l.id === sorted[i])
      if (!src || !layer?.visible) continue
      for (let p = 0; p < merged.length; p += 4) {
        const a = src[p + 3]! / 255
        if (a <= 0) continue
        if (a >= 1) {
          merged[p] = src[p]!
          merged[p + 1] = src[p + 1]!
          merged[p + 2] = src[p + 2]!
          merged[p + 3] = src[p + 3]!
        } else {
          merged[p] = Math.round(src[p]! * a + merged[p]! * (1 - a))
          merged[p + 1] = Math.round(src[p + 1]! * a + merged[p + 1]! * (1 - a))
          merged[p + 2] = Math.round(src[p + 2]! * a + merged[p + 2]! * (1 - a))
          merged[p + 3] = Math.min(255, Math.round(src[p + 3]! + merged[p + 3]! * (1 - a)))
        }
      }
    }

    this.doc.layerPixels[targetId] = merged
    const removeIds = new Set(sorted.slice(1))
    frame.layers = frame.layers.filter((l) => !removeIds.has(l.id))
    frame.layerOrder = frame.layerOrder.filter((id) => !removeIds.has(id))
    for (const id of removeIds) delete this.doc.layerPixels[id]
    this.doc.meta.activeLayerId = targetId
    this.handlers.onDocumentChange?.()
    this.render()
    return true
  }

  getSelection(): PixelSelection | null {
    return this.selection ? { ...this.selection } : null
  }

  selectAll(): void {
    if (!this.doc) return
    this.selection = {
      x: 0,
      y: 0,
      width: this.doc.meta.width,
      height: this.doc.meta.height
    }
    this.previewSelection = null
    this.handlers.onSelectionChange?.(this.selection)
    this.ensureSelectionAnimation()
    this.render()
  }

  moveSelection(dx: number, dy: number): boolean {
    if (!this.selection || !this.doc || (dx === 0 && dy === 0)) return false
    const layerMeta = getActiveLayerMeta(this.doc)
    if (!layerMeta || layerMeta.locked || !layerMeta.visible) return false
    const layer = this.doc.layerPixels[layerMeta.id]
    if (!layer) return false

    const { width: docW, height: docH } = this.doc.meta
    const moved = clampSelection(
      {
        x: this.selection.x + dx,
        y: this.selection.y + dy,
        width: this.selection.width,
        height: this.selection.height
      },
      docW,
      docH
    )
    const actualDx = moved.x - this.selection.x
    const actualDy = moved.y - this.selection.y
    if (actualDx === 0 && actualDy === 0) return false

    const before = new Uint8ClampedArray(layer)
    const patch = copyRegion(layer, docW, this.selection)
    clearRegion(layer, docW, this.selection)
    pasteRegion(layer, docW, moved, patch)
    this.selection = moved
    this.handlers.onSelectionChange?.(this.selection)
    const after = new Uint8ClampedArray(layer)
    this.pushUndo(layerMeta.id, before, after)
    this.handlers.onDocumentChange?.()
    this.ensureSelectionAnimation()
    this.render()
    return true
  }

  clearSelectionContent(): boolean {
    if (!this.selection || !this.doc) return false
    const layerMeta = getActiveLayerMeta(this.doc)
    if (!layerMeta || layerMeta.locked || !layerMeta.visible) return false
    const layer = this.doc.layerPixels[layerMeta.id]
    if (!layer) return false

    const before = new Uint8ClampedArray(layer)
    clearRegion(layer, this.doc.meta.width, this.selection)
    const after = new Uint8ClampedArray(layer)
    this.pushUndo(layerMeta.id, before, after)
    this.handlers.onDocumentChange?.()
    this.render()
    return true
  }

  clearSelection(): void {
    if (!this.selection) return
    this.selection = null
    this.previewSelection = null
    this.handlers.onSelectionChange?.(null)
    if (this.animFrameId != null) {
      cancelAnimationFrame(this.animFrameId)
      this.animFrameId = null
    }
    this.render()
  }

  getLayerCount(): number {
    if (!this.doc) return 0
    return getActiveFrame(this.doc).layers.length
  }

  render(): void {
    if (!this.canvas || !this.ctx || !this.doc || !this.root) return
    this.resizeCanvasToContainer()
    const { width, height } = this.doc.meta
    const { zoom, panX, panY } = this.viewport
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    this.ctx.save()
    this.ctx.translate(panX, panY)
    this.ctx.scale(zoom, zoom)

    if (this.doc.meta.checkerboard.visible) this.drawCheckerboard(width, height)
    this.drawComposite()
    if (this.previewPixels) {
      this.ctx.putImageData(pixelsToImageData(this.previewPixels, width, height), 0, 0)
    }
    if (this.doc.meta.grid.visible) this.drawGrid(width, height)
    const sel = this.previewSelection ?? this.selection
    if (sel) this.drawSelection(sel)
    this.ctx.restore()
  }

  resize(): void {
    this.render()
  }

  focusCanvas(): void {
    this.canvas?.focus({ preventScroll: true })
  }

  private ensureSelectionAnimation(): void {
    if (this.animFrameId != null) return
    const tick = () => {
      if (!this.selection && !this.previewSelection) {
        this.animFrameId = null
        return
      }
      this.selectionAnimPhase = (this.selectionAnimPhase + 1) % 8
      this.render()
      this.animFrameId = requestAnimationFrame(tick)
    }
    this.animFrameId = requestAnimationFrame(tick)
  }

  private resizeCanvasToContainer(): void {
    if (!this.canvas || !this.root) return
    const rect = this.root.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    this.canvas.width = Math.max(1, Math.floor(rect.width * dpr))
    this.canvas.height = Math.max(1, Math.floor(rect.height * dpr))
    this.canvas.style.width = `${rect.width}px`
    this.canvas.style.height = `${rect.height}px`
    if (this.ctx) {
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      this.ctx.imageSmoothingEnabled = false
    }
  }

  private drawCheckerboard(w: number, h: number): void {
    if (!this.ctx) return
    if (!this.checkerPattern) {
      const tile = document.createElement('canvas')
      tile.width = 16
      tile.height = 16
      const tctx = tile.getContext('2d')!
      tctx.fillStyle = '#999999'
      tctx.fillRect(0, 0, 16, 16)
      tctx.fillStyle = '#cccccc'
      tctx.fillRect(0, 0, 8, 8)
      tctx.fillRect(8, 8, 8, 8)
      this.checkerPattern = this.ctx.createPattern(tile, 'repeat')
    }
    if (this.checkerPattern) {
      this.ctx.fillStyle = this.checkerPattern
      this.ctx.fillRect(0, 0, w, h)
    }
  }

  private drawComposite(): void {
    if (!this.ctx || !this.doc) return
    const pixels = compositeDocument(this.doc)
    this.ctx.putImageData(pixelsToImageData(pixels, this.doc.meta.width, this.doc.meta.height), 0, 0)
  }

  private drawGrid(w: number, h: number): void {
    if (!this.ctx || !this.doc) return
    const subdiv = Math.max(1, this.doc.meta.grid.size)
    const linesX = w * subdiv
    const linesY = h * subdiv
    const major = this.theme === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'
    const minor = this.theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
    this.ctx.lineWidth = 1 / this.viewport.zoom
    for (let i = 0; i <= linesX; i++) {
      const x = i / subdiv
      this.ctx.strokeStyle = subdiv > 1 && i % subdiv !== 0 ? minor : major
      this.ctx.beginPath()
      this.ctx.moveTo(x, 0)
      this.ctx.lineTo(x, h)
      this.ctx.stroke()
    }
    for (let j = 0; j <= linesY; j++) {
      const y = j / subdiv
      this.ctx.strokeStyle = subdiv > 1 && j % subdiv !== 0 ? minor : major
      this.ctx.beginPath()
      this.ctx.moveTo(0, y)
      this.ctx.lineTo(w, y)
      this.ctx.stroke()
    }
  }

  private drawSelection(sel: PixelSelection): void {
    if (!this.ctx) return
    const offset = this.selectionAnimPhase % 2
    this.ctx.strokeStyle = '#ffffff'
    this.ctx.setLineDash([2 / this.viewport.zoom, 2 / this.viewport.zoom])
    this.ctx.lineWidth = 1 / this.viewport.zoom
    this.ctx.strokeRect(sel.x - offset / this.viewport.zoom, sel.y, sel.width, sel.height)
    this.ctx.strokeStyle = '#000000'
    this.ctx.strokeRect(sel.x, sel.y - offset / this.viewport.zoom, sel.width, sel.height)
    this.ctx.setLineDash([])
  }

  private capturePointer(e: PointerEvent): void {
    if (!this.canvas) return
    this.canvas.setPointerCapture(e.pointerId)
    this.capturedPointerId = e.pointerId
  }

  private releasePointer(e: PointerEvent): void {
    if (this.canvas && this.capturedPointerId === e.pointerId) {
      this.canvas.releasePointerCapture(e.pointerId)
      this.capturedPointerId = null
    }
  }

  private onLostCapture(_e: PointerEvent): void {
    this.finishPointerInteraction()
  }

  private finishPointerInteraction(): void {
    if (this.isDrawing && this.strokeBefore && this.doc) {
      const layerMeta = getActiveLayerMeta(this.doc)
      const layer = layerMeta ? this.doc.layerPixels[layerMeta.id] : null
      if (layer && layerMeta && (this.toolId === 'pencil' || this.toolId === 'eraser')) {
        const after = new Uint8ClampedArray(layer)
        this.pushUndo(layerMeta.id, this.strokeBefore, after)
        this.handlers.onDocumentChange?.()
      }
    }
    this.isDrawing = false
    this.panning = false
    this.altPanPending = false
    this.strokeBefore = null
    this.lastPaintPos = null
    this.previewPixels = null
    this.previewSelection = null
    this.shapeStart = null
    this.capturedPointerId = null
    this.render()
  }

  private pickColorAt(p: { x: number; y: number }): void {
    if (!this.doc) return
    const composite = compositeDocument(this.doc)
    const color = pickColorFromPixels(composite, p.x, p.y, this.doc.meta.width, this.doc.meta.height)
    this.doc.meta.foreground = color
    this.handlers.onColorPicked?.(color)
    this.handlers.onDocumentChange?.()
  }

  private screenToPixel(clientX: number, clientY: number): { x: number; y: number } | null {
    if (!this.canvas || !this.doc) return null
    const rect = this.canvas.getBoundingClientRect()
    const x = Math.floor((clientX - rect.left - this.viewport.panX) / this.viewport.zoom)
    const y = Math.floor((clientY - rect.top - this.viewport.panY) / this.viewport.zoom)
    if (x < 0 || y < 0 || x >= this.doc.meta.width || y >= this.doc.meta.height) return null
    return { x, y }
  }

  private onPointerDown(e: PointerEvent): void {
    if (!this.doc || !this.canvas) return
    const p = this.screenToPixel(e.clientX, e.clientY)
    this.handlers.onPixelCoords?.(p?.x ?? -1, p?.y ?? -1)

    if (this.toolId === 'hand' || e.button === 1) {
      this.panning = true
      this.panStart = { x: e.clientX, y: e.clientY, panX: this.viewport.panX, panY: this.viewport.panY }
      this.capturePointer(e)
      return
    }

    if (e.button === 0 && e.altKey) {
      this.altPanPending = true
      this.altPanStart = { x: e.clientX, y: e.clientY }
      this.capturePointer(e)
      return
    }

    if (!p) return

    const layerMeta = getActiveLayerMeta(this.doc)
    if (!layerMeta || layerMeta.locked || !layerMeta.visible) return
    const layerId = layerMeta.id
    const layer = this.doc.layerPixels[layerId]
    if (!layer) return

    this.capturePointer(e)

    if (this.toolId === 'eyedropper') {
      this.pickColorAt(p)
      return
    }

    if (this.toolId === 'move') {
      if (this.selection && selectionContains(this.selection, p.x, p.y)) {
        this.moveDragLast = p
        this.isDrawing = true
      }
      return
    }

    if (this.toolId === 'zoom') {
      e.shiftKey ? this.zoomOut() : this.zoomIn()
      return
    }

    if (this.toolId === 'marquee') {
      this.shapeStart = p
      this.isDrawing = true
      this.previewSelection = null
      return
    }

    if (this.toolId === 'fill') {
      const before = new Uint8ClampedArray(layer)
      const changed = floodFillScanline(
        layer,
        this.doc.meta.width,
        this.doc.meta.height,
        p.x,
        p.y,
        this.doc.meta.foreground,
        this.toolOptions.fillTolerance
      )
      if (changed) {
        const after = new Uint8ClampedArray(layer)
        this.pushUndo(layerId, before, after)
        this.handlers.onDocumentChange?.()
        this.render()
      }
      return
    }

    if (this.toolId === 'gradient') {
      this.isDrawing = true
      this.strokeBefore = new Uint8ClampedArray(layer)
      this.shapeStart = p
      return
    }

    this.isDrawing = true
    this.strokeBefore = new Uint8ClampedArray(layer)
    this.shapeStart = p
    this.lastPaintPos = p
    if (this.toolId === 'pencil' || this.toolId === 'eraser') {
      this.paintAt(layer, p.x, p.y)
      this.render()
    } else if (['line', 'rect', 'ellipse'].includes(this.toolId)) {
      // shape tools wait for pointer up
    }
  }

  private onPointerMove(e: PointerEvent): void {
    const p = this.screenToPixel(e.clientX, e.clientY)
    this.handlers.onPixelCoords?.(p?.x ?? -1, p?.y ?? -1)

    if (this.altPanPending) {
      const dx = e.clientX - this.altPanStart.x
      const dy = e.clientY - this.altPanStart.y
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        this.panning = true
        this.altPanPending = false
        this.panStart = { x: e.clientX, y: e.clientY, panX: this.viewport.panX, panY: this.viewport.panY }
      }
    }

    if (this.panning) {
      this.viewport.panX = this.panStart.panX + (e.clientX - this.panStart.x)
      this.viewport.panY = this.panStart.panY + (e.clientY - this.panStart.y)
      this.render()
      return
    }

    if (!this.isDrawing || !this.doc || !this.shapeStart) {
      if (this.toolId === 'move' && this.moveDragLast && p && this.selection) {
        const dx = p.x - this.moveDragLast.x
        const dy = p.y - this.moveDragLast.y
        if (dx !== 0 || dy !== 0) {
          this.moveSelection(dx, dy)
          this.moveDragLast = p
        }
      }
      return
    }

    const layerMeta = getActiveLayerMeta(this.doc)
    if (!layerMeta?.visible || layerMeta.locked) return
    const layer = this.doc.layerPixels[layerMeta.id]
    if (!layer) return

    if ((this.toolId === 'pencil' || this.toolId === 'eraser') && p) {
      if (this.lastPaintPos) {
        for (const pt of linePoints(this.lastPaintPos.x, this.lastPaintPos.y, p.x, p.y)) {
          this.paintAt(layer, pt.x, pt.y)
        }
      } else {
        this.paintAt(layer, p.x, p.y)
      }
      this.lastPaintPos = p
      this.render()
      return
    }

    if (this.toolId === 'marquee' && p) {
      this.previewSelection = normalizeSelection(this.shapeStart.x, this.shapeStart.y, p.x, p.y)
      this.previewPixels = null
      this.ensureSelectionAnimation()
      this.render()
      return
    }

    if (p && ['line', 'rect', 'ellipse'].includes(this.toolId)) {
      const preview = new Uint8ClampedArray(layer)
      this.drawShapeOnLayer(preview, this.shapeStart.x, this.shapeStart.y, p.x, p.y, true)
      this.previewPixels = preview
      this.render()
    }
  }

  private onPointerUp(e: PointerEvent): void {
    this.releasePointer(e)

    if (this.altPanPending && !this.panning) {
      const p = this.screenToPixel(e.clientX, e.clientY)
      if (p) this.pickColorAt(p)
      this.altPanPending = false
      return
    }

    if (this.panning) {
      this.panning = false
      this.altPanPending = false
      return
    }

    if (this.toolId === 'move' && this.moveDragLast) {
      this.moveDragLast = null
      this.isDrawing = false
      return
    }

    if (!this.isDrawing || !this.doc) return
    const p = this.screenToPixel(e.clientX, e.clientY)
    const layerMeta = getActiveLayerMeta(this.doc)
    if (!layerMeta || layerMeta.locked || !layerMeta.visible) {
      this.finishPointerInteraction()
      return
    }
    const layerId = layerMeta.id
    const layer = this.doc.layerPixels[layerId]
    if (!layer || !this.shapeStart) {
      this.finishPointerInteraction()
      return
    }

    if (this.toolId === 'marquee' && p) {
      this.selection = normalizeSelection(this.shapeStart.x, this.shapeStart.y, p.x, p.y)
      this.handlers.onSelectionChange?.(this.selection)
      this.previewSelection = null
      this.ensureSelectionAnimation()
      this.isDrawing = false
      this.shapeStart = null
      this.render()
      return
    }

    if (this.toolId === 'gradient' && p && this.strokeBefore) {
      applyLinearGradient(
        layer,
        this.doc.meta.width,
        this.doc.meta.height,
        this.shapeStart.x,
        this.shapeStart.y,
        p.x,
        p.y,
        this.doc.meta.foreground,
        this.toolOptions.gradientEndColor,
        this.toolOptions.gradientDither,
        this.selection
      )
      const after = new Uint8ClampedArray(layer)
      this.pushUndo(layerId, this.strokeBefore, after)
      this.handlers.onDocumentChange?.()
      this.finishPointerInteraction()
      return
    }

    if (this.strokeBefore && (this.toolId === 'pencil' || this.toolId === 'eraser')) {
      const after = new Uint8ClampedArray(layer)
      this.pushUndo(layerId, this.strokeBefore, after)
      this.handlers.onDocumentChange?.()
      this.finishPointerInteraction()
      return
    }

    if (p && ['line', 'rect', 'ellipse'].includes(this.toolId)) {
      const before = this.strokeBefore ?? new Uint8ClampedArray(layer)
      this.drawShapeOnLayer(layer, this.shapeStart.x, this.shapeStart.y, p.x, p.y, false)
      const after = new Uint8ClampedArray(layer)
      this.pushUndo(layerId, before, after)
      this.handlers.onDocumentChange?.()
      this.finishPointerInteraction()
    } else {
      this.finishPointerInteraction()
    }
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault()
    if (e.deltaY < 0) this.zoomInAt(e.clientX, e.clientY)
    else this.zoomOutAt(e.clientX, e.clientY)
  }

  private paintAt(layer: Uint8ClampedArray, cx: number, cy: number): void {
    if (!this.doc) return
    const size = this.toolOptions.brushSize
    const [r, g, b, a] =
      this.toolId === 'eraser' ? [0, 0, 0, 0] : parseColor(this.doc.meta.foreground)
    const { width, height } = this.doc.meta
    const half = Math.floor(size / 2)
    for (let dy = -half; dy < size - half; dy++) {
      for (let dx = -half; dx < size - half; dx++) {
        const x = cx + dx
        const y = cy + dy
        if (x < 0 || y < 0 || x >= width || y >= height) continue
        if (this.toolOptions.brushShape === 'circle' && dx * dx + dy * dy > half * half + 0.5) continue
        const i = (y * width + x) * 4
        layer[i] = r
        layer[i + 1] = g
        layer[i + 2] = b
        layer[i + 3] = a
      }
    }
  }

  private drawShapeOnLayer(
    layer: Uint8ClampedArray,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    previewOnly: boolean
  ): void {
    if (!this.doc) return
    const filled = this.toolOptions.shapeFilled
    let points: { x: number; y: number }[] = []
    if (this.toolId === 'line') {
      points = linePoints(x0, y0, x1, y1)
    } else if (this.toolId === 'rect') {
      points = rectPoints(x0, y0, x1, y1, this.toolOptions.shapeFilled)
    } else if (this.toolId === 'ellipse') {
      const cx = Math.round((x0 + x1) / 2)
      const cy = Math.round((y0 + y1) / 2)
      const rx = Math.max(0.5, Math.abs(x1 - x0) / 2)
      const ry = Math.max(0.5, Math.abs(y1 - y0) / 2)
      points = filled ? filledEllipsePoints(cx, cy, rx, ry) : ellipsePoints(cx, cy, rx, ry)
    }
    const [r, g, b, a] = parseColor(this.doc.meta.foreground)
    const drawAlpha = previewOnly ? Math.min(a, 160) : a
    const { width, height } = this.doc.meta
    for (const pt of uniquePoints(points)) {
      if (pt.x < 0 || pt.y < 0 || pt.x >= width || pt.y >= height) continue
      const i = (pt.y * width + pt.x) * 4
      layer[i] = r
      layer[i + 1] = g
      layer[i + 2] = b
      layer[i + 3] = drawAlpha
    }
  }

  private blitPatch(layer: Uint8ClampedArray, patch: LayerPixelPatch): void {
    const width = this.doc!.meta.width
    for (let row = 0; row < patch.height; row++) {
      for (let col = 0; col < patch.width; col++) {
        const dstX = patch.x + col
        const dstY = patch.y + row
        const dstI = (dstY * width + dstX) * 4
        const srcI = (row * patch.width + col) * 4
        layer[dstI] = patch.after[srcI]!
        layer[dstI + 1] = patch.after[srcI + 1]!
        layer[dstI + 2] = patch.after[srcI + 2]!
        layer[dstI + 3] = patch.after[srcI + 3]!
      }
    }
  }

  private pushUndo(layerId: string, before: Uint8ClampedArray, after: Uint8ClampedArray): void {
    if (this.strokeRecorder) {
      this.strokeRecorder(layerId, before, after)
      return
    }
    const last = this.undoStack[this.undoStack.length - 1]
    if (last && last.layerId === layerId) {
      last.after = after
    } else {
      this.undoStack.push({ layerId, before, after })
    }
    this.redoStack = []
    if (this.undoStack.length > 100) this.undoStack.shift()
  }

  /** 图层 CRUD helpers used by session/commands */
  addLayer(name?: string): string {
    if (!this.doc) throw new Error('无文档')
    const frame = getActiveFrame(this.doc)
    if (frame.layers.length >= PIXEL_MAX_LAYERS) throw new Error(`最多 ${PIXEL_MAX_LAYERS} 个图层`)
    const id = `layer-${crypto.randomUUID()}`
    const { width, height } = this.doc.meta
    const layer: import('@modules/library/pixel-art/domain/types').PixelLayerMeta = {
      id,
      name: name ?? `图层 ${frame.layers.length + 1}`,
      visible: true,
      locked: false,
      opacity: 1
    }
    const activeId = this.doc.meta.activeLayerId
    const order = [...frame.layerOrder]
    const activeIdx = order.indexOf(activeId)
    const insertAt = activeIdx >= 0 ? activeIdx + 1 : order.length
    order.splice(insertAt, 0, id)
    frame.layerOrder = order
    frame.layers.splice(insertAt, 0, layer)
    this.doc.layerPixels[id] = new Uint8ClampedArray(width * height * 4)
    this.doc.meta.activeLayerId = id
    this.handlers.onDocumentChange?.()
    this.render()
    return id
  }

  duplicateLayer(layerId: string): string | null {
    if (!this.doc) return null
    const frame = getActiveFrame(this.doc)
    if (frame.layers.length >= PIXEL_MAX_LAYERS) return null
    const source = frame.layers.find((l) => l.id === layerId)
    const pixels = this.doc.layerPixels[layerId]
    if (!source || !pixels) return null

    const id = `layer-${crypto.randomUUID()}`
    const layer = {
      id,
      name: `${source.name} 副本`,
      visible: source.visible,
      locked: false,
      opacity: source.opacity
    }
    const order = [...frame.layerOrder]
    const idx = order.indexOf(layerId)
    const insertAt = idx >= 0 ? idx + 1 : order.length
    order.splice(insertAt, 0, id)
    frame.layerOrder = order
    frame.layers.splice(insertAt, 0, layer)
    this.doc.layerPixels[id] = new Uint8ClampedArray(pixels)
    this.doc.meta.activeLayerId = id
    this.handlers.onDocumentChange?.()
    this.render()
    return id
  }

  pasteLayer(data: {
    meta: Omit<import('@modules/library/pixel-art/domain/types').PixelLayerMeta, 'id'>
    pixels: Uint8ClampedArray
    width: number
    height: number
  }): string | null {
    if (!this.doc) return null
    const { width, height } = this.doc.meta
    if (data.width !== width || data.height !== height) return null
    const frame = getActiveFrame(this.doc)
    if (frame.layers.length >= PIXEL_MAX_LAYERS) return null

    const id = `layer-${crypto.randomUUID()}`
    const layer = { ...data.meta, id, locked: false }
    const activeId = this.doc.meta.activeLayerId
    const order = [...frame.layerOrder]
    const activeIdx = order.indexOf(activeId)
    const insertAt = activeIdx >= 0 ? activeIdx + 1 : order.length
    order.splice(insertAt, 0, id)
    frame.layerOrder = order
    frame.layers.splice(insertAt, 0, layer)
    this.doc.layerPixels[id] = new Uint8ClampedArray(data.pixels)
    this.doc.meta.activeLayerId = id
    this.handlers.onDocumentChange?.()
    this.render()
    return id
  }

  deleteLayer(layerId: string): void {
    if (!this.doc) return
    const frame = getActiveFrame(this.doc)
    if (frame.layers.length <= 1) return
    frame.layers = frame.layers.filter((l) => l.id !== layerId)
    frame.layerOrder = frame.layerOrder.filter((id) => id !== layerId)
    delete this.doc.layerPixels[layerId]
    if (this.doc.meta.activeLayerId === layerId) {
      this.doc.meta.activeLayerId = frame.layerOrder[frame.layerOrder.length - 1]!
    }
    this.handlers.onDocumentChange?.()
    this.render()
  }

  reorderLayer(layerId: string, newIndex: number): void {
    if (!this.doc) return
    const frame = getActiveFrame(this.doc)
    const order = [...frame.layerOrder]
    const idx = order.indexOf(layerId)
    if (idx < 0) return
    order.splice(idx, 1)
    order.splice(newIndex, 0, layerId)
    frame.layerOrder = order
    frame.layers.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id))
    this.handlers.onDocumentChange?.()
    this.render()
  }
}
