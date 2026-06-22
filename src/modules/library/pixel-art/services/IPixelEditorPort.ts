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
  onColorPicked?: (color: string) => void
  onSelectionChange?: (sel: { x: number; y: number; width: number; height: number } | null) => void
  onDocumentChange?: () => void
  onViewportChange?: () => void
}

export interface IPixelEditorPort {
  mount(el: HTMLElement): void
  destroy(): void
  loadDocument(doc: PixelDocument): void
  getDocument(): PixelDocument
  setActiveLayer(layerId: string): void
  getActiveLayerId(): string
  addLayer(name?: string): string
  deleteLayer(layerId: string): void
  reorderLayer(layerId: string, newIndex: number): void
  setTool(tool: ToolId, options?: Partial<ToolOptions>): void
  getTool(): { id: ToolId; options: ToolOptions }
  setForeground(color: string): void
  setBackgroundColor(color: string): void
  setViewport(viewport: Partial<PixelViewport>): void
  getViewport(): PixelViewport
  getLayerImageData(layerId: string): ImageData | null
  applyLayerPatch(layerId: string, patch: LayerPixelPatch, recordUndo?: boolean): void
  setTheme(resolved: 'light' | 'dark'): void
  setGridVisible(visible: boolean): void
  setCheckerboardVisible(visible: boolean): void
  bindPointerHandlers(handlers: PixelPointerHandlers): void
  undo(): boolean
  redo(): boolean
  canUndo(): boolean
  canRedo(): boolean
  exportMergedPng(): Promise<Blob>
  exportMergedJpeg(quality?: number): Promise<Blob>
  exportSvg(mode: SvgExportMode, strategy?: SvgVectorStrategy): Promise<Blob>
  zoomIn(): void
  zoomOut(): void
  zoomToFit(containerWidth: number, containerHeight: number): void
  zoomReset(): void
  setLayerVisible(layerId: string, visible: boolean): void
  setLayerLocked(layerId: string, locked: boolean): void
  renameLayer(layerId: string, name: string): void
  mergeVisibleLayers(): boolean
  getSelection(): import('@modules/library/pixel-art/lib/selection').PixelSelection | null
  selectAll(): void
  moveSelection(dx: number, dy: number): boolean
  clearSelectionContent(): boolean
  clearSelection(): void
  getLayerCount(): number
  render(): void
  resize(): void
  focusCanvas(): void
}
