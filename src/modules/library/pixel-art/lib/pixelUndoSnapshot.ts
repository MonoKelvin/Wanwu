import type { PixelDocument, PixelLayerMeta } from '@modules/library/pixel-art/domain/types'
import type { IPixelEditorPort } from '@modules/library/pixel-art/services/IPixelEditorPort'

/** 深拷贝当前文档（含视口），供撤销栈使用 */
export function captureDocumentSnapshot(port: IPixelEditorPort): PixelDocument {
  return port.getDocument()
}

export function restoreDocumentSnapshot(port: IPixelEditorPort, snapshot: PixelDocument): void {
  port.loadDocument(snapshot)
  port.notifyDocumentChanged()
}

/** 图层剪贴板（复制/粘贴图层） */
export interface PixelLayerClipboard {
  meta: Omit<PixelLayerMeta, 'id'>
  pixels: Uint8ClampedArray
  width: number
  height: number
}

let layerClipboard: PixelLayerClipboard | null = null

export function getPixelLayerClipboard(): PixelLayerClipboard | null {
  return layerClipboard
}

export function setPixelLayerClipboard(data: PixelLayerClipboard | null): void {
  layerClipboard = data
}

export function hasPixelLayerClipboard(): boolean {
  return layerClipboard != null
}
