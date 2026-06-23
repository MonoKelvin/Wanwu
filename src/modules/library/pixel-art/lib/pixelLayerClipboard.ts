import type { PixelLayerMeta } from '@modules/library/pixel-art/domain/types'

export interface PixelLayerClipboard {
  meta: Omit<PixelLayerMeta, 'id'>
  pixels: Uint8ClampedArray
  width: number
  height: number
}

let clipboard: PixelLayerClipboard | null = null

export function getPixelLayerClipboard(): PixelLayerClipboard | null {
  return clipboard
}

export function setPixelLayerClipboard(data: PixelLayerClipboard | null): void {
  clipboard = data
}

export function hasPixelLayerClipboard(): boolean {
  return clipboard != null
}
