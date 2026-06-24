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
import { formatColorFromInput } from '@shared/lib/colorWithAlpha'
import { compositeDocument, pixelsToImageData } from '@modules/library/pixel-art/lib/composite'
import { floodFillScanline } from '@modules/library/pixel-art/lib/floodFill'
import { applyLinearGradient, applyLinearGradientByCells, pickColorFromPixels } from '@modules/library/pixel-art/lib/gradientFill'
import {
  selectionContains,
  clampSelection,
  copyRegion,
  clearRegion,
  pasteRegion,
  type PixelSelection
} from '@modules/library/pixel-art/lib/selection'
import {
  exportDocumentJpeg,
  exportDocumentPng,
  exportDocumentSvg
} from '@modules/library/pixel-art/lib/exportImage'
import { PIXEL_MAX_HEIGHT, PIXEL_MAX_LAYERS, PIXEL_MAX_WIDTH, PIXEL_ZOOM_LEVELS } from '@modules/library/pixel-art/domain/meta'
import { getPixelUnitSize } from '@modules/library/pixel-art/lib/pixelCanvasPresets'
import {
  cellIndex,
  enumerateBrushCellOrigins,
  fillCellBlock,
  getGridCellSize,
  lineCellOrigins,
  normalizeSelectionToCells,
  shapeToolCellOrigins,
  snapToCellOrigin
} from '@modules/library/pixel-art/lib/pixelGridCell'

interface UndoEntry {
  layerId: string
  before: Uint8ClampedArray
  after: Uint8ClampedArray
}

function parseColor(input: string): [number, number, number, number] {
  const hex = input.trim()
  if (hex.startsWith('#')) {
    const h = hex.slice(1)
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
  }
  const rgb = hex.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/i)
  if (rgb) {
    const a = rgb[4] != null ? Math.round(Number(rgb[4]) * 255) : 255
    return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3]), a]
  }
  return [0, 0, 0, 255]
}

/** 画笔写入色：保留用户调节的前景 alpha（Shift+滚轮） */
function paintRgbaFromForeground(color: string): [number, number, number, number] {
  return parseColor(color)
}

/** 填充/形状等需要实色的场景（alpha 强制 255） */
function opaquePaintRgba(color: string): [number, number, number, number] {
  const [r, g, b] = parseColor(color)
  return [r, g, b, 255]
}

function foregroundToFillHex(color: string): string {
  const [r, g, b] = opaquePaintRgba(color)
  const hex = (n: number) => n.toString(16).padStart(2, '0')
  return `#${hex(r)}${hex(g)}${hex(b)}`
}

export class PixelCanvasEngine implements IPixelEditorPort {
  private root: HTMLElement | null = null
  private canvas: HTMLCanvasElement | null = null
  private ctx: CanvasRenderingContext2D | null = null
  private doc: PixelDocument | null = null
  private toolId: ToolId = 'pencil'
  private toolOptions: ToolOptions = { ...DEFAULT_TOOL_OPTIONS }
  private viewport: PixelViewport = { zoom: 1, panX: 0, panY: 0 }
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
  private moveDragBefore: Uint8ClampedArray | null = null
  private moveDragLayerId: string | null = null
  private brushHover: { x: number; y: number } | null = null
  /** 笔划进行中指针位置（捕获后仍更新，供笔刷预览） */
  private strokePointer: { x: number; y: number } | null = null
  private previewCellOrigins: { x: number; y: number }[] | null = null
  private checkerPattern: CanvasPattern | null = null
  private compositePixels: Uint8ClampedArray | null = null
  private compositeScratch: HTMLCanvasElement | null = null
  private previewScratch: HTMLCanvasElement | null = null
  private compositeCacheValid = false
  private panRenderRaf = 0
  private containerCssSize = { width: 0, height: 0 }
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
  private boundOnPointerLeave = () => this.onPointerLeave()

  mount(el: HTMLElement): void {
    this.destroy()
    this.root = el
    this.canvas = document.createElement('canvas')
    this.canvas.className = 'pixel-art-canvas'
    this.canvas.tabIndex = -1
    this.canvas.style.position = 'absolute'
    this.canvas.style.inset = '0'
    this.canvas.style.display = 'block'
    this.canvas.style.imageRendering = 'pixelated'
    this.canvas.style.touchAction = 'none'
    el.appendChild(this.canvas)
    this.ctx = this.canvas.getContext('2d')!
    this.ctx.imageSmoothingEnabled = false
    this.ctx.imageSmoothingQuality = 'low'
    this.canvas.addEventListener('pointerdown', this.boundOnPointerDown)
    this.canvas.addEventListener('pointermove', this.boundOnPointerMove)
    this.canvas.addEventListener('pointerup', this.boundOnPointerUp)
    this.canvas.addEventListener('lostpointercapture', this.boundOnLostCapture)
    this.canvas.addEventListener('wheel', this.boundOnWheel, { passive: false })
    this.canvas.addEventListener('pointerleave', this.boundOnPointerLeave)
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
      this.canvas.removeEventListener('pointerleave', this.boundOnPointerLeave)
      this.canvas.remove()
    }
    this.canvas = null
    this.ctx = null
    this.root = null
    this.compositeScratch = null
    this.compositePixels = null
    this.previewScratch = null
    this.compositeCacheValid = false
    this.panRenderRaf = 0
    this.containerCssSize = { width: 0, height: 0 }
    if (this.animFrameId != null) cancelAnimationFrame(this.animFrameId)
    this.animFrameId = null
  }

  loadDocument(doc: PixelDocument): void {
    this.doc = clonePixelDocument(doc)
    this.undoStack = []
    this.redoStack = []
    this.selection = null
    const saved = doc.meta.viewport
    if (saved && saved.zoom > 0) {
      this.viewport = { zoom: saved.zoom, panX: saved.panX, panY: saved.panY }
    } else {
      this.viewport = { zoom: this.pixelUnitSize(), panX: 0, panY: 0 }
    }
    this.invalidateCompositeCache()
    this.render()
  }

  private invalidateCompositeCache(): void {
    this.compositeCacheValid = false
  }

  private pixelUnitSize(): number {
    return this.doc ? getPixelUnitSize(this.doc.meta) : 1
  }

  private gridCellSize(): number {
    return this.doc ? getGridCellSize(this.doc.meta) : 1
  }

  applyDefaultZoom(): void {
    this.viewport.zoom = this.pixelUnitSize()
  }

  getDocument(): PixelDocument {
    if (!this.doc) throw new Error('无文档')
    const doc = clonePixelDocument(this.doc)
    doc.meta.viewport = { ...this.viewport }
    return doc
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
    if (tool !== 'pencil' && tool !== 'eraser' && tool !== 'fill' && this.brushHover) {
      this.brushHover = null
      this.render()
    }
    if (!['line', 'rect', 'ellipse'].includes(tool)) {
      this.previewCellOrigins = null
    }
  }

  getTool() {
    return { id: this.toolId, options: { ...this.toolOptions } }
  }

  setForeground(color: string): void {
    if (!this.doc) return
    this.doc.meta.foreground = formatColorFromInput(color)
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
      this.pushUndo(layerId, patch.before, patch.after, '笔划')
    }
    this.blitPatch(layer, patch)
    this.invalidateCompositeCache()
    this.handlers.onDocumentChange?.()
    this.render()
  }

  setCanvasBackground(background: string): void {
    if (!this.doc) return
    this.doc.meta.background = background === 'transparent' ? 'transparent' : background
    this.invalidateCompositeCache()
    this.handlers.onDocumentChange?.()
    this.render()
  }

  setTheme(resolved: 'light' | 'dark'): void {
    this.theme = resolved
    this.checkerPattern = null
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

  setBrushPreviewVisible(visible: boolean): void {
    if (!this.doc) return
    this.doc.meta.brushPreview = { visible }
    this.render()
  }

  private isBrushPreviewEnabled(): boolean {
    return this.doc?.meta.brushPreview?.visible !== false
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
    this.invalidateCompositeCache()
    this.render()
  }

  notifyDocumentChanged(): void {
    this.handlers.onDocumentChange?.()
  }

  undo(): boolean {
    const entry = this.undoStack.pop()
    if (!entry || !this.doc) return false
    const layer = this.doc.layerPixels[entry.layerId]
    if (!layer) return false
    layer.set(entry.before)
    this.redoStack.push(entry)
    this.invalidateCompositeCache()
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
    this.invalidateCompositeCache()
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

  private listZoomLevels(): number[] {
    const unit = this.pixelUnitSize()
    const cell = this.gridCellSize()
    const scaled = PIXEL_ZOOM_LEVELS.map((level) => level * unit)
    const minZoom = Math.max(1, cell)
    return [...new Set([minZoom, ...scaled])].sort((a, b) => a - b)
  }

  private nextZoomLevel(current: number, direction: 1 | -1): number {
    const levels = this.listZoomLevels()
    const idx = levels.findIndex((z) => z >= current - 0.001)
    const baseIdx = idx < 0 ? levels.length - 1 : idx
    if (direction > 0) {
      return levels[Math.min(baseIdx + 1, levels.length - 1)] ?? current * 2
    }
    return levels[Math.max(baseIdx - 1, 0)] ?? Math.max(1, current / 2)
  }

  zoomToFit(containerWidth: number, containerHeight: number): void {
    if (!this.doc) return
    const pad = 32
    const unit = this.pixelUnitSize()
    const cell = this.gridCellSize()
    const zx = Math.floor((containerWidth - pad) / this.doc.meta.width)
    const zy = Math.floor((containerHeight - pad) / this.doc.meta.height)
    const zoom = Math.max(cell, Math.min(zx, zy, 32 * unit))
    this.viewport.zoom = zoom
    this.viewport.panX = Math.floor((containerWidth - this.doc.meta.width * zoom) / 2)
    this.viewport.panY = Math.floor((containerHeight - this.doc.meta.height * zoom) / 2)
    this.bumpViewport()
  }

  zoomReset(): void {
    if (!this.root) {
      this.applyDefaultZoom()
      this.bumpViewport()
      return
    }
    this.applyInitialViewport(this.root.clientWidth, this.root.clientHeight)
  }

  applyViewport(viewport: PixelViewport): void {
    this.viewport = {
      zoom: viewport.zoom,
      panX: viewport.panX,
      panY: viewport.panY
    }
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

  /**
   * 首次打开：100%（zoom = pixelUnitSize）并居中；
   * 若 100% 超出容器则缩小至合适尺寸并居中。
   */
  applyInitialViewport(containerWidth: number, containerHeight: number): void {
    if (!this.doc) return
    const pad = 32
    const unit = this.pixelUnitSize()
    const { width, height } = this.doc.meta
    let zoom = unit
    const at100W = width * zoom
    const at100H = height * zoom
    if (at100W > containerWidth - pad || at100H > containerHeight - pad) {
      const zx = (containerWidth - pad) / width
      const zy = (containerHeight - pad) / height
      const cell = this.gridCellSize()
      zoom = Math.max(cell, Math.floor(Math.min(zx, zy)))
    }
    this.viewport.zoom = zoom
    this.viewport.panX = Math.floor((containerWidth - width * zoom) / 2)
    this.viewport.panY = Math.floor((containerHeight - height * zoom) / 2)
    this.bumpViewport()
  }

  /** @deprecated 使用 applyInitialViewport */
  resetViewportAt100(containerWidth: number, containerHeight: number): void {
    this.applyInitialViewport(containerWidth, containerHeight)
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
    this.invalidateCompositeCache()
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
    if (!this.moveDragBefore) {
      this.pushUndo(layerMeta.id, before, after, '移动选区')
    }
    this.invalidateCompositeCache()
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
    this.pushUndo(layerMeta.id, before, after, '清除选区')
    this.invalidateCompositeCache()
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

  fillAt(x: number, y: number): boolean {
    if (!this.doc) return false
    const cellSize = this.gridCellSize()
    const origin = snapToCellOrigin(x, y, cellSize)
    const layerMeta = getActiveLayerMeta(this.doc)
    if (!layerMeta || layerMeta.locked || !layerMeta.visible) return false
    const layer = this.doc.layerPixels[layerMeta.id]
    if (!layer) return false
    const before = new Uint8ClampedArray(layer)
    const changed = floodFillScanline(
      layer,
      this.doc.meta.width,
      this.doc.meta.height,
      origin.x,
      origin.y,
      foregroundToFillHex(this.doc.meta.foreground),
      this.toolOptions.fillTolerance
    )
    if (!changed) return false
    const after = new Uint8ClampedArray(layer)
    this.pushUndo(layerMeta.id, before, after, '填充')
    this.invalidateCompositeCache()
    this.render()
    return true
  }

  pickColorAtPixel(x: number, y: number): boolean {
    if (!this.doc) return false
    const cellSize = this.gridCellSize()
    const origin = snapToCellOrigin(x, y, cellSize)
    const sampleX = Math.min(this.doc.meta.width - 1, origin.x + Math.floor(cellSize / 2))
    const sampleY = Math.min(this.doc.meta.height - 1, origin.y + Math.floor(cellSize / 2))
    this.pickColorAt({ x: sampleX, y: sampleY })
    return true
  }

  applyGradientAt(x0: number, y0: number, x1: number, y1: number): boolean {
    if (!this.doc) return false
    const layerMeta = getActiveLayerMeta(this.doc)
    if (!layerMeta || layerMeta.locked || !layerMeta.visible) return false
    const layer = this.doc.layerPixels[layerMeta.id]
    if (!layer) return false
    const before = new Uint8ClampedArray(layer)
    const cellSize = this.gridCellSize()
    if (cellSize > 1) {
      applyLinearGradientByCells(
        layer,
        this.doc.meta.width,
        this.doc.meta.height,
        x0,
        y0,
        x1,
        y1,
        cellSize,
        this.doc.meta.foreground,
        this.toolOptions.gradientEndColor,
        this.toolOptions.gradientDither,
        this.selection
      )
    } else {
      applyLinearGradient(
        layer,
        this.doc.meta.width,
        this.doc.meta.height,
        x0,
        y0,
        x1,
        y1,
        this.doc.meta.foreground,
        this.toolOptions.gradientEndColor,
        this.toolOptions.gradientDither,
        this.selection
      )
    }
    const after = new Uint8ClampedArray(layer)
    this.pushUndo(layerMeta.id, before, after, '渐变')
    this.invalidateCompositeCache()
    this.render()
    return true
  }

  drawShapeAt(tool: 'line' | 'rect' | 'ellipse', x0: number, y0: number, x1: number, y1: number): boolean {
    if (!this.doc) return false
    const layerMeta = getActiveLayerMeta(this.doc)
    if (!layerMeta || layerMeta.locked || !layerMeta.visible) return false
    const layer = this.doc.layerPixels[layerMeta.id]
    if (!layer) return false
    const prevTool = this.toolId
    this.toolId = tool
    const before = new Uint8ClampedArray(layer)
    this.drawShapeOnLayer(layer, x0, y0, x1, y1)
    this.toolId = prevTool
    const after = new Uint8ClampedArray(layer)
    this.pushUndo(layerMeta.id, before, after, '绘制图形')
    this.invalidateCompositeCache()
    this.render()
    return true
  }

  render(options?: { viewportOnly?: boolean }): void {
    if (!this.canvas || !this.ctx || !this.doc || !this.root) return
    this.resizeCanvasToContainer()
    this.paintFrame(options?.viewportOnly === true)
  }

  private paintFrame(viewportOnly = false): void {
    if (!this.canvas || !this.ctx || !this.doc) return
    const { width, height } = this.doc.meta
    const { zoom, panX, panY } = this.viewport
    const { width: cw, height: ch } = this.containerCssSize
    this.ctx.clearRect(0, 0, cw, ch)
    this.ctx.save()
    this.ctx.translate(panX, panY)
    this.ctx.scale(zoom, zoom)
    this.ctx.globalAlpha = 1
    this.ctx.globalCompositeOperation = 'source-over'

    // 文档区内：先清空再合成（与导出一致），避免网格/笔刷 underlay 从下方混色导致发浅
    this.ctx.save()
    this.ctx.beginPath()
    this.ctx.rect(0, 0, width, height)
    this.ctx.clip()
    this.ctx.clearRect(0, 0, width, height)

    this.drawComposite(!viewportOnly)
    if (this.previewPixels) {
      this.drawPixelLayer(this.previewPixels, width, height, 'preview')
    }

    if (this.doc.meta.checkerboard.visible) {
      this.ctx.globalCompositeOperation = 'destination-over'
      this.drawCheckerboard(width, height)
      this.ctx.globalCompositeOperation = 'source-over'
    }

    if (this.doc.meta.grid.visible) {
      this.drawGrid(width, height)
    }
    this.ctx.restore()

    const sel = this.previewSelection ?? this.selection
    if (sel) this.drawSelection(sel)
    this.drawBrushPreview('overlay')
    this.ctx.restore()
  }

  private schedulePanRender(): void {
    if (this.panRenderRaf) return
    this.panRenderRaf = requestAnimationFrame(() => {
      this.panRenderRaf = 0
      this.paintFrame(true)
    })
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
    const cssW = Math.max(1, rect.width)
    const cssH = Math.max(1, rect.height)
    this.containerCssSize = { width: cssW, height: cssH }
    const dpr = 1 // 禁用devicePixelRatio以测试
    this.canvas.width = Math.max(1, Math.floor(cssW * dpr))
    this.canvas.height = Math.max(1, Math.floor(cssH * dpr))
    this.canvas.style.width = `${cssW}px`
    this.canvas.style.height = `${cssH}px`
    if (this.ctx) {
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      this.ctx.imageSmoothingEnabled = false
      this.ctx.imageSmoothingQuality = 'low'
    }
  }

  /** 使用离屏canvas绘制，然后drawImage到主canvas */
  private drawPixelLayer(
    pixels: Uint8ClampedArray,
    width: number,
    height: number,
    target: 'composite' | 'preview'
  ): void {
    if (!this.ctx) return

    this.uploadPixelsToScratch(pixels, width, height, target)
    const scratch = target === 'composite' ? this.compositeScratch : this.previewScratch
    if (scratch) {
      this.ctx.imageSmoothingEnabled = false
      this.ctx.imageSmoothingQuality = 'low'

      // 使用drawImage绘制到正确的位置（考虑pan和zoom）
      this.ctx.drawImage(scratch, 0, 0, width, height)
    }
  }

  private drawCheckerboard(w: number, h: number): void {
    if (!this.ctx) return
    if (!this.checkerPattern) {
      const tile = document.createElement('canvas')
      tile.width = 16
      tile.height = 16
      const tctx = tile.getContext('2d')!
      const light = this.theme === 'dark' ? '#52525a' : '#cccccc'
      const dark = this.theme === 'dark' ? '#3a3a40' : '#999999'
      tctx.fillStyle = dark
      tctx.fillRect(0, 0, 16, 16)
      tctx.fillStyle = light
      tctx.fillRect(0, 0, 8, 8)
      tctx.fillRect(8, 8, 8, 8)
      this.checkerPattern = this.ctx.createPattern(tile, 'repeat')
    }
    if (this.checkerPattern) {
      this.ctx.fillStyle = this.checkerPattern
      this.ctx.fillRect(0, 0, w, h)
    }
  }

  private drawComposite(rebuild = true): void {
    if (!this.ctx || !this.doc) return
    const { width, height } = this.doc.meta

    if (rebuild && !this.compositeCacheValid) {
      this.compositePixels = compositeDocument(this.doc)
      this.compositeCacheValid = true
    }
    if (!this.compositePixels) return

    this.ctx.imageSmoothingEnabled = false
    this.ctx.imageSmoothingQuality = 'low'

    // 使用drawImage而不是putImageData，以确保变换正确应用
    this.uploadPixelsToScratch(this.compositePixels, width, height, 'composite')
    if (this.compositeScratch) {
      this.ctx.drawImage(this.compositeScratch, 0, 0, width, height)
    }
  }

  private uploadPixelsToScratch(
    pixels: Uint8ClampedArray,
    width: number,
    height: number,
    target: 'composite' | 'preview'
  ): void {
    let scratch = target === 'composite' ? this.compositeScratch : this.previewScratch
    if (!scratch || scratch.width !== width || scratch.height !== height) {
      scratch = document.createElement('canvas')
      scratch.width = width
      scratch.height = height
      if (target === 'composite') this.compositeScratch = scratch
      else this.previewScratch = scratch
    }
    const sctx = scratch.getContext('2d')
    if (!sctx) return
    sctx.imageSmoothingEnabled = false
    sctx.imageSmoothingQuality = 'low'

    // 直接使用putImageData绘制，不使用drawImage，避免变换影响
    const imageData = pixelsToImageData(pixels, width, height)
    sctx.putImageData(imageData, 0, 0)
  }

  private drawGrid(w: number, h: number): void {
    if (!this.ctx || !this.doc) return
    const cellSize = Math.max(1, this.gridCellSize())
    const lineW = Math.max(1 / this.viewport.zoom, 1)
    this.ctx.lineWidth = lineW
    const major =
      this.theme === 'dark' ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.22)'
    const border =
      this.theme === 'dark' ? 'rgba(255,255,255,0.36)' : 'rgba(0,0,0,0.28)'

    this.ctx.strokeStyle = major
    for (let x = 0; x <= w; x += cellSize) {
      this.ctx.beginPath()
      this.ctx.moveTo(x, 0)
      this.ctx.lineTo(x, h)
      this.ctx.stroke()
    }
    for (let y = 0; y <= h; y += cellSize) {
      this.ctx.beginPath()
      this.ctx.moveTo(0, y)
      this.ctx.lineTo(w, y)
      this.ctx.stroke()
    }
    this.ctx.strokeStyle = border
    this.ctx.strokeRect(0, 0, w, h)
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

  private brushFootprintBounds(
    originX: number,
    originY: number,
    cellSize: number,
    brushCells: number
  ): { x: number; y: number; width: number; height: number } {
    const cs = Math.max(1, cellSize)
    const cells = Math.max(1, brushCells)
    const half = Math.floor(cells / 2)
    return {
      x: originX - half * cs,
      y: originY - half * cs,
      width: cells * cs,
      height: cells * cs
    }
  }

  private hoverCellOrigins(): { x: number; y: number }[] {
    if (!this.doc || !this.brushHover) return []
    const cellSize = this.gridCellSize()
    const origin = snapToCellOrigin(this.brushHover.x, this.brushHover.y, cellSize)
    if (this.toolId === 'fill') return [{ x: origin.x, y: origin.y }]
    if (this.toolId === 'pencil' || this.toolId === 'eraser') {
      return enumerateBrushCellOrigins(
        origin.x,
        origin.y,
        cellSize,
        Math.max(1, this.toolOptions.brushSize),
        this.toolOptions.brushShape
      )
    }
    return []
  }

  /** 悬停/绘制单元格描边（不填充，避免盖住真实绘制色） */
  private drawCellOutlines(
    origins: { x: number; y: number }[],
    cellSize: number,
    accent: 'neutral' | 'eraser' | 'fill' | 'drawing' = 'neutral'
  ): void {
    if (!this.ctx || !this.doc || !origins.length) return
    const cs = Math.max(1, cellSize)
    const { width, height } = this.doc.meta
    const lineW = Math.max(1 / this.viewport.zoom, 0.75 / this.viewport.zoom)
    const dark = this.theme === 'dark'
    const stroke =
      accent === 'eraser'
        ? dark
          ? 'rgba(255,120,120,0.95)'
          : 'rgba(200,40,40,0.9)'
        : accent === 'fill'
          ? dark
            ? 'rgba(120,220,160,0.95)'
            : 'rgba(30,150,90,0.9)'
          : accent === 'drawing'
            ? dark
              ? 'rgba(255,210,90,0.98)'
              : 'rgba(220,140,20,0.92)'
            : dark
              ? 'rgba(255,255,255,0.92)'
              : 'rgba(0,0,0,0.82)'
    this.ctx.save()
    this.ctx.lineWidth = lineW
    this.ctx.strokeStyle = stroke
    for (const { x, y } of origins) {
      if (x < 0 || y < 0 || x >= width || y >= height) continue
      const w = Math.min(cs, width - x)
      const h = Math.min(cs, height - y)
      this.ctx.strokeRect(x + lineW / 2, y + lineW / 2, Math.max(0, w - lineW), Math.max(0, h - lineW))
    }
    this.ctx.restore()
  }

  /** 笔刷形状外框（与属性面板调节笔刷大小时的预览一致） */
  private drawBrushFootprintPreview(
    originX: number,
    originY: number,
    cellSize: number,
    brushCells: number,
    shape: 'square' | 'circle',
    phase: 'underlay' | 'overlay'
  ): void {
    if (!this.ctx) return
    const { x, y, width, height } = this.brushFootprintBounds(originX, originY, cellSize, brushCells)
    const isEraser = this.toolId === 'eraser'
    const dark = this.theme === 'dark'

    if (phase === 'underlay') {
      this.ctx.save()
      if (isEraser) {
        this.ctx.fillStyle = dark ? 'rgba(255,100,100,0.16)' : 'rgba(210,35,35,0.14)'
      } else {
        this.ctx.fillStyle = dark ? 'rgba(140,190,255,0.16)' : 'rgba(25,110,240,0.14)'
      }
      if (shape === 'circle') {
        const cx = x + width / 2
        const cy = y + height / 2
        this.ctx.beginPath()
        this.ctx.ellipse(cx, cy, width / 2, height / 2, 0, 0, Math.PI * 2)
        this.ctx.fill()
      } else {
        this.ctx.fillRect(x, y, width, height)
      }
      this.ctx.restore()
      return
    }

    const lineW = Math.max(1.5 / this.viewport.zoom, 1 / this.viewport.zoom)
    const stroke = isEraser
      ? dark
        ? 'rgba(255,120,120,0.98)'
        : 'rgba(210,35,35,0.95)'
      : dark
        ? 'rgba(160,200,255,0.98)'
        : 'rgba(25,110,240,0.92)'
    this.ctx.save()
    this.ctx.lineWidth = lineW
    this.ctx.strokeStyle = stroke
    if (shape === 'circle') {
      const cx = x + width / 2
      const cy = y + height / 2
      this.ctx.beginPath()
      this.ctx.ellipse(cx, cy, width / 2, height / 2, 0, 0, Math.PI * 2)
      this.ctx.stroke()
    } else {
      this.ctx.strokeRect(x + lineW / 2, y + lineW / 2, width - lineW, height - lineW)
    }
    this.ctx.restore()
  }

  private brushPreviewOrigin(): { x: number; y: number } | null {
    if (!this.doc) return null
    const p = this.brushHover ?? this.strokePointer
    if (!p) return null
    return snapToCellOrigin(p.x, p.y, this.gridCellSize())
  }

  private drawBrushPreview(phase: 'underlay' | 'overlay'): void {
    if (!this.ctx || !this.doc || !this.isBrushPreviewEnabled()) return
    if (this.panning || this.altPanPending) return

    const cellSize = this.gridCellSize()
    const drawingStroke =
      this.isDrawing && (this.toolId === 'pencil' || this.toolId === 'eraser')
    const origin = this.brushPreviewOrigin()
    const brushCells = Math.max(1, this.toolOptions.brushSize)
    const shape = this.toolOptions.brushShape

    if (this.toolId === 'pencil' || this.toolId === 'eraser') {
      if (origin) {
        this.drawBrushFootprintPreview(origin.x, origin.y, cellSize, brushCells, shape, phase)
      }
      if (phase === 'overlay' && !drawingStroke && origin) {
        const origins = this.hoverCellOrigins()
        if (origins.length) {
          const accent = this.toolId === 'eraser' ? 'eraser' : 'neutral'
          this.drawCellOutlines(origins, cellSize, accent)
        }
      }
      return
    }

    if (phase === 'underlay') return

    if (this.toolId === 'fill') {
      if (drawingStroke || !origin) return
      this.drawCellOutlines(this.hoverCellOrigins(), cellSize, 'fill')
      return
    }

    if (this.previewCellOrigins?.length) {
      this.drawCellOutlines(this.previewCellOrigins, cellSize)
    }
  }

  private syncBrushHover(e: PointerEvent): void {
    if (this.toolId !== 'pencil' && this.toolId !== 'eraser' && this.toolId !== 'fill') {
      if (this.brushHover) this.brushHover = null
      return
    }
    if (this.panning || this.altPanPending) {
      if (this.brushHover) this.brushHover = null
      return
    }
    const p = this.pointerPixel(e.clientX, e.clientY)
    this.brushHover = p
    if (this.isDrawing && (this.toolId === 'pencil' || this.toolId === 'eraser') && p) {
      this.strokePointer = p
    }
  }

  private onPointerLeave(): void {
    if (!this.brushHover) return
    this.brushHover = null
    this.render()
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
        this.commitStrokeUndo(layerMeta.id, this.strokeBefore, after)
      }
    }
    this.isDrawing = false
    this.panning = false
    this.altPanPending = false
    this.strokeBefore = null
    this.lastPaintPos = null
    this.previewPixels = null
    this.previewSelection = null
    this.previewCellOrigins = null
    this.strokePointer = null
    this.shapeStart = null
    this.capturedPointerId = null
    this.invalidateCompositeCache()
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

  private screenToPixel(
    clientX: number,
    clientY: number,
    options?: { snapToCell?: boolean }
  ): { x: number; y: number } | null {
    if (!this.canvas || !this.doc) return null
    const rect = this.canvas.getBoundingClientRect()
    let x = Math.floor((clientX - rect.left - this.viewport.panX) / this.viewport.zoom)
    let y = Math.floor((clientY - rect.top - this.viewport.panY) / this.viewport.zoom)
    if (x < 0 || y < 0 || x >= this.doc.meta.width || y >= this.doc.meta.height) return null
    if (options?.snapToCell) {
      const snapped = snapToCellOrigin(x, y, this.gridCellSize())
      if (snapped.x >= this.doc.meta.width || snapped.y >= this.doc.meta.height) return null
      return snapped
    }
    return { x, y }
  }

  private shouldSnapPointerToCell(): boolean {
    return [
      'pencil',
      'eraser',
      'fill',
      'eyedropper',
      'gradient',
      'line',
      'rect',
      'ellipse',
      'marquee'
    ].includes(this.toolId)
  }

  private pointerPixel(clientX: number, clientY: number): { x: number; y: number } | null {
    return this.screenToPixel(clientX, clientY, { snapToCell: this.shouldSnapPointerToCell() })
  }

  private emitPixelCoords(p: { x: number; y: number } | null): void {
    if (!p || !this.doc) {
      this.handlers.onPixelCoords?.(-1, -1)
      return
    }
    const cs = this.gridCellSize()
    const idx = cellIndex(p.x, p.y, cs)
    this.handlers.onPixelCoords?.(idx.x, idx.y)
  }

  private onPointerDown(e: PointerEvent): void {
    if (!this.doc || !this.canvas) return
    this.syncBrushHover(e)
    const p = this.pointerPixel(e.clientX, e.clientY)
    this.emitPixelCoords(p)

    if (this.toolId === 'hand' || e.button === 1) {
      this.panning = true
      this.handlers.onPanningChange?.(true)
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
      if (this.handlers.onPickColorAt) {
        this.handlers.onPickColorAt(p.x, p.y)
      } else {
        this.pickColorAt(p)
      }
      return
    }

    if (this.toolId === 'move') {
      if (this.selection && selectionContains(this.selection, p.x, p.y)) {
        const layerMeta = getActiveLayerMeta(this.doc!)
        const layer = layerMeta ? this.doc!.layerPixels[layerMeta.id] : null
        if (layerMeta && layer) {
          this.moveDragBefore = new Uint8ClampedArray(layer)
          this.moveDragLayerId = layerMeta.id
        }
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
      if (this.handlers.onFillAt) {
        this.handlers.onFillAt(p.x, p.y)
      } else {
        this.fillAt(p.x, p.y)
      }
      return
    }

    if (this.toolId === 'gradient') {
      this.isDrawing = true
      this.shapeStart = p
      return
    }

    this.isDrawing = true
    this.strokeBefore = new Uint8ClampedArray(layer)
    this.shapeStart = p
    this.lastPaintPos = p
    if (this.toolId === 'pencil' || this.toolId === 'eraser') {
      this.strokePointer = p
      this.paintAt(layer, p.x, p.y)
      this.invalidateCompositeCache()
      this.render()
    } else if (['line', 'rect', 'ellipse'].includes(this.toolId)) {
      // shape tools wait for pointer up
    }
  }

  private onPointerMove(e: PointerEvent): void {
    const prevHover = this.brushHover
    this.syncBrushHover(e)
    const p = this.pointerPixel(e.clientX, e.clientY)
    this.emitPixelCoords(p)

    if (this.altPanPending) {
      const dx = e.clientX - this.altPanStart.x
      const dy = e.clientY - this.altPanStart.y
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        this.panning = true
        this.altPanPending = false
        this.handlers.onPanningChange?.(true)
        this.panStart = { x: e.clientX, y: e.clientY, panX: this.viewport.panX, panY: this.viewport.panY }
      }
    }

    if (this.panning) {
      this.viewport.panX = this.panStart.panX + (e.clientX - this.panStart.x)
      this.viewport.panY = this.panStart.panY + (e.clientY - this.panStart.y)
      this.schedulePanRender()
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
      } else if (
        (this.toolId === 'pencil' || this.toolId === 'eraser' || this.toolId === 'fill') &&
        (prevHover?.x !== this.brushHover?.x || prevHover?.y !== this.brushHover?.y)
      ) {
        this.render()
      }
      return
    }

    const layerMeta = getActiveLayerMeta(this.doc)
    if (!layerMeta?.visible || layerMeta.locked) return
    const layer = this.doc.layerPixels[layerMeta.id]
    if (!layer) return

    if ((this.toolId === 'pencil' || this.toolId === 'eraser') && p) {
      const cellSize = this.gridCellSize()
      if (this.lastPaintPos) {
        for (const origin of lineCellOrigins(this.lastPaintPos.x, this.lastPaintPos.y, p.x, p.y, cellSize)) {
          this.paintAt(layer, origin.x, origin.y)
        }
      } else {
        this.paintAt(layer, p.x, p.y)
      }
      this.lastPaintPos = p
      this.strokePointer = p
      this.invalidateCompositeCache()
      this.render()
      return
    }

    if (this.toolId === 'marquee' && p) {
      this.previewSelection = normalizeSelectionToCells(
        this.shapeStart.x,
        this.shapeStart.y,
        p.x,
        p.y,
        this.gridCellSize(),
        this.doc.meta.width,
        this.doc.meta.height
      )
      this.previewPixels = null
      this.previewCellOrigins = null
      this.ensureSelectionAnimation()
      this.render()
      return
    }

    if (p && ['line', 'rect', 'ellipse'].includes(this.toolId)) {
      this.previewPixels = null
      const cellSize = this.gridCellSize()
      const filled = this.toolOptions.shapeFilled
      if (this.toolId === 'line') {
        this.previewCellOrigins = shapeToolCellOrigins(
          'line',
          this.shapeStart.x,
          this.shapeStart.y,
          p.x,
          p.y,
          cellSize,
          Math.max(1, this.toolOptions.brushSize),
          this.toolOptions.brushShape,
          false
        )
      } else if (this.toolId === 'rect') {
        this.previewCellOrigins = shapeToolCellOrigins(
          'rect',
          this.shapeStart.x,
          this.shapeStart.y,
          p.x,
          p.y,
          cellSize,
          Math.max(1, this.toolOptions.brushSize),
          this.toolOptions.brushShape,
          filled
        )
      } else if (this.toolId === 'ellipse') {
        this.previewCellOrigins = shapeToolCellOrigins(
          'ellipse',
          this.shapeStart.x,
          this.shapeStart.y,
          p.x,
          p.y,
          cellSize,
          Math.max(1, this.toolOptions.brushSize),
          this.toolOptions.brushShape,
          filled
        )
      } else {
        this.previewCellOrigins = null
      }
      this.render()
      return
    }

    if (this.toolId === 'gradient' && p) {
      this.previewPixels = null
      this.previewCellOrigins = lineCellOrigins(
        this.shapeStart.x,
        this.shapeStart.y,
        p.x,
        p.y,
        this.gridCellSize()
      )
      this.render()
    }
  }

  private onPointerUp(e: PointerEvent): void {
    this.releasePointer(e)

    if (this.altPanPending && !this.panning) {
      const p = this.pointerPixel(e.clientX, e.clientY)
      if (p) {
        if (this.handlers.onPickColorAt) this.handlers.onPickColorAt(p.x, p.y)
        else this.pickColorAt(p)
      }
      this.altPanPending = false
      return
    }

    if (this.panning) {
      this.panning = false
      this.altPanPending = false
      this.handlers.onPanningChange?.(false)
      this.bumpViewport()
      return
    }

    if (this.toolId === 'move' && this.moveDragLast) {
      if (this.moveDragBefore && this.moveDragLayerId && this.doc) {
        const layer = this.doc.layerPixels[this.moveDragLayerId]
        if (layer) {
          const after = new Uint8ClampedArray(layer)
          let changed = false
          for (let i = 0; i < after.length; i++) {
            if (after[i] !== this.moveDragBefore![i]) {
              changed = true
              break
            }
          }
          if (changed) {
            this.pushUndo(this.moveDragLayerId, this.moveDragBefore, after, '移动选区')
            this.handlers.onDocumentChange?.()
          }
        }
      }
      this.moveDragBefore = null
      this.moveDragLayerId = null
      this.moveDragLast = null
      this.isDrawing = false
      return
    }

    if (!this.isDrawing || !this.doc) return
    const p = this.pointerPixel(e.clientX, e.clientY)
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
      this.selection = normalizeSelectionToCells(
        this.shapeStart.x,
        this.shapeStart.y,
        p.x,
        p.y,
        this.gridCellSize(),
        this.doc.meta.width,
        this.doc.meta.height
      )
      this.handlers.onSelectionChange?.(this.selection)
      this.previewSelection = null
      this.ensureSelectionAnimation()
      this.isDrawing = false
      this.shapeStart = null
      this.render()
      return
    }

    if (this.toolId === 'gradient' && p && this.shapeStart) {
      if (this.handlers.onGradientFill) {
        this.handlers.onGradientFill(this.shapeStart.x, this.shapeStart.y, p.x, p.y)
      } else {
        this.applyGradientAt(this.shapeStart.x, this.shapeStart.y, p.x, p.y)
      }
      this.finishPointerInteraction()
      return
    }

    if (this.strokeBefore && (this.toolId === 'pencil' || this.toolId === 'eraser')) {
      const after = new Uint8ClampedArray(layer)
      this.commitStrokeUndo(layerId, this.strokeBefore, after)
      this.finishPointerInteraction()
      return
    }

    if (p && ['line', 'rect', 'ellipse'].includes(this.toolId) && this.shapeStart) {
      if (this.handlers.onShapeDraw) {
        this.handlers.onShapeDraw(this.toolId, this.shapeStart.x, this.shapeStart.y, p.x, p.y)
      } else {
        this.drawShapeAt(this.toolId as 'line' | 'rect' | 'ellipse', this.shapeStart.x, this.shapeStart.y, p.x, p.y)
      }
      this.finishPointerInteraction()
      return
    }

    this.finishPointerInteraction()
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault()
    const mod = e.ctrlKey || e.metaKey
    if (mod) {
      this.nudgeBrushSize(e.deltaY < 0 ? 1 : -1)
      return
    }
    if (e.shiftKey) {
      this.nudgeForegroundAlpha(e.deltaY < 0 ? 1 : -1)
      return
    }
    if (e.deltaY < 0) this.zoomInAt(e.clientX, e.clientY)
    else this.zoomOutAt(e.clientX, e.clientY)
  }

  nudgeBrushSize(delta: number): void {
    const next = Math.max(1, Math.min(8, this.toolOptions.brushSize + delta))
    if (next === this.toolOptions.brushSize) return
    this.setTool(this.toolId, { brushSize: next })
    this.handlers.onToolOptionsChange?.()
  }

  nudgeForegroundAlpha(direction: 1 | -1): void {
    if (!this.doc) return
    const [r, g, b, a] = parseColor(this.doc.meta.foreground)
    const step = 0.05
    const nextAlpha = Math.max(0, Math.min(255, Math.round(a + direction * step * 255)))
    if (nextAlpha === a) return
    const hex = (n: number) => n.toString(16).padStart(2, '0')
    this.doc.meta.foreground =
      nextAlpha >= 255 ? `#${hex(r)}${hex(g)}${hex(b)}` : `#${hex(r)}${hex(g)}${hex(b)}${hex(nextAlpha)}`
    this.handlers.onColorPicked?.(this.doc.meta.foreground)
  }

  private paintAt(layer: Uint8ClampedArray, cx: number, cy: number): void {
    if (!this.doc) return
    const cellSize = this.gridCellSize()
    const origin = snapToCellOrigin(cx, cy, cellSize)
    const brushCells = Math.max(1, this.toolOptions.brushSize)
    const rgba: [number, number, number, number] =
      this.toolId === 'eraser' ? [0, 0, 0, 0] : paintRgbaFromForeground(this.doc.meta.foreground)
    fillCellBlock(
      layer,
      origin.x,
      origin.y,
      cellSize,
      brushCells,
      this.doc.meta.width,
      this.doc.meta.height,
      rgba,
      { shape: this.toolOptions.brushShape }
    )
  }

  private commitStrokeUndo(layerId: string, before: Uint8ClampedArray, after: Uint8ClampedArray): void {
    if (before.length !== after.length) return
    let changed = false
    for (let i = 0; i < before.length; i++) {
      if (before[i] !== after[i]) {
        changed = true
        break
      }
    }
    if (!changed) return
    this.pushUndo(layerId, before, after, '笔划')
  }

  private drawShapeOnLayer(
    layer: Uint8ClampedArray,
    x0: number,
    y0: number,
    x1: number,
    y1: number
  ): void {
    if (!this.doc) return
    const cellSize = this.gridCellSize()
    const { width, height } = this.doc.meta
    const filled = this.toolOptions.shapeFilled
    const brushCells = Math.max(1, this.toolOptions.brushSize)
    let origins: { x: number; y: number }[] = []
    if (this.toolId === 'line') {
      origins = shapeToolCellOrigins(
        'line',
        x0,
        y0,
        x1,
        y1,
        cellSize,
        brushCells,
        this.toolOptions.brushShape,
        false
      )
    } else if (this.toolId === 'rect') {
      origins = shapeToolCellOrigins(
        'rect',
        x0,
        y0,
        x1,
        y1,
        cellSize,
        brushCells,
        this.toolOptions.brushShape,
        filled
      )
    } else if (this.toolId === 'ellipse') {
      origins = shapeToolCellOrigins(
        'ellipse',
        x0,
        y0,
        x1,
        y1,
        cellSize,
        brushCells,
        this.toolOptions.brushShape,
        filled
      )
    }
    const [r, g, b, a] = opaquePaintRgba(this.doc.meta.foreground)
    for (const origin of origins) {
      fillCellBlock(layer, origin.x, origin.y, cellSize, 1, width, height, [r, g, b, a])
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

  private pushUndo(
    layerId: string,
    before: Uint8ClampedArray,
    after: Uint8ClampedArray,
    label = '笔划'
  ): void {
    if (this.handlers.onStrokeCommit) {
      this.handlers.onStrokeCommit(layerId, before, after, label)
      return
    }
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
