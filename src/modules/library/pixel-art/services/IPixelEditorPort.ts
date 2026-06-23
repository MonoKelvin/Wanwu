import type {
  LayerPixelPatch,
  PixelDocument,
  PixelViewport,
  SvgExportMode,
  SvgVectorStrategy
} from '@modules/library/pixel-art/domain/types'
import type { ToolId, ToolOptions } from '@modules/library/pixel-art/domain/tools'

export interface PixelPointerHandlers {
  onPixelCoords?: (x: number, y: number) => void
  onStrokeComplete?: (patch: LayerPixelPatch) => void
  onLayerSnapshot?: (layerId: string, before: Uint8ClampedArray, after: Uint8ClampedArray) => void
  onStrokeCommit?: (layerId: string, before: Uint8ClampedArray, after: Uint8ClampedArray, label?: string) => void
  onFillAt?: (x: number, y: number) => void
  onPickColorAt?: (x: number, y: number) => void
  onGradientFill?: (x0: number, y0: number, x1: number, y1: number) => void
  onShapeDraw?: (tool: ToolId, x0: number, y0: number, x1: number, y1: number) => void
  onColorPicked?: (color: string) => void
  onSelectionChange?: (sel: { x: number; y: number; width: number; height: number } | null) => void
  onDocumentChange?: () => void
  onViewportChange?: () => void
  onPanningChange?: (active: boolean) => void
}

export interface IPixelEditorPort {
  mount(el: HTMLElement): void
  destroy(): void
  loadDocument(doc: PixelDocument): void
  getDocument(): PixelDocument
  setActiveLayer(layerId: string): void
  getActiveLayerId(): string
  addLayer(name?: string): string
  duplicateLayer(layerId: string): string | null
  pasteLayer(data: { meta: Omit<import('@modules/library/pixel-art/domain/types').PixelLayerMeta, 'id'>; pixels: Uint8ClampedArray; width: number; height: number }): string | null
  deleteLayer(layerId: string): void
  reorderLayer(layerId: string, newIndex: number): void
  setTool(tool: ToolId, options?: Partial<ToolOptions>): void
  getTool(): { id: ToolId; options: ToolOptions }
  setForeground(color: string): void
  setBackgroundColor(color: string): void
  setCanvasBackground(background: string): void
  setViewport(viewport: Partial<PixelViewport>): void
  getViewport(): PixelViewport
  getLayerImageData(layerId: string): ImageData | null
  applyLayerPatch(layerId: string, patch: LayerPixelPatch, recordUndo?: boolean): void
  setTheme(resolved: 'light' | 'dark'): void
  setGridVisible(visible: boolean): void
  setCheckerboardVisible(visible: boolean): void
  setBrushPreviewVisible(visible: boolean): void
  bindPointerHandlers(handlers: PixelPointerHandlers): void
  setStrokeRecorder(
    recorder: ((layerId: string, before: Uint8ClampedArray, after: Uint8ClampedArray) => void) | null
  ): void
  undo(): boolean
  redo(): boolean
  canUndo(): boolean
  canRedo(): boolean
  exportMergedPng(): Promise<Blob>
  exportMergedJpeg(quality?: number): Promise<Blob>
  exportSvg(mode: SvgExportMode, strategy?: SvgVectorStrategy): Promise<Blob>
  zoomIn(): void
  zoomOut(): void
  zoomInAt(clientX: number, clientY: number): void
  zoomOutAt(clientX: number, clientY: number): void
  zoomToFit(containerWidth: number, containerHeight: number): void
  zoomReset(): void
  applyViewport(viewport: PixelViewport): void
  applyInitialViewport(containerWidth: number, containerHeight: number): void
  applyDefaultZoom(): void
  centerInContainer(containerWidth: number, containerHeight: number): void
  resetViewportAt100(containerWidth: number, containerHeight: number): void
  setPixelUnitSize(size: number): void
  setGridSubdiv(size: number): void
  resizeDocument(width: number, height: number, anchor?: import('@modules/library/pixel-art/domain/types').PixelCanvasResizeAnchor): boolean
  setLayerVisible(layerId: string, visible: boolean): void
  setLayerLocked(layerId: string, locked: boolean): void
  renameLayer(layerId: string, name: string): void
  mergeVisibleLayers(): boolean
  mergeLayers(layerIds: string[]): boolean
  getSelection(): import('@modules/library/pixel-art/lib/selection').PixelSelection | null
  selectAll(): void
  moveSelection(dx: number, dy: number): boolean
  clearSelectionContent(): boolean
  clearSelection(): void
  getLayerCount(): number
  fillAt(x: number, y: number): boolean
  pickColorAtPixel(x: number, y: number): boolean
  applyGradientAt(x0: number, y0: number, x1: number, y1: number): boolean
  drawShapeAt(tool: 'line' | 'rect' | 'ellipse', x0: number, y0: number, x1: number, y1: number): boolean
  replaceLayerPixels(layerId: string, pixels: Uint8ClampedArray): void
  notifyDocumentChanged(): void
  render(options?: { viewportOnly?: boolean }): void
  resize(): void
  focusCanvas(): void
}
