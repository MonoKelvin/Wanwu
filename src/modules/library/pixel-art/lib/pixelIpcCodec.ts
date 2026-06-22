import type { PixelDocument } from '@modules/library/pixel-art/domain/types'

/** IPC 传输：layerPixels 转为 number[] */
export interface PixelDocumentDto extends Omit<PixelDocument, 'layerPixels'> {
  layerPixels: Record<string, number[]>
}

export function serializePixelDocumentForIpc(doc: PixelDocument): PixelDocumentDto {
  const layerPixels: Record<string, number[]> = {}
  for (const [id, pixels] of Object.entries(doc.layerPixels)) {
    layerPixels[id] = Array.from(pixels)
  }
  return {
    ...doc,
    meta: { ...doc.meta, palette: [...doc.meta.palette] },
    frames: doc.frames.map((f) => ({
      ...f,
      layerOrder: [...f.layerOrder],
      layers: f.layers.map((l) => ({ ...l }))
    })),
    layerPixels
  }
}

export function deserializePixelDocumentFromIpc(dto: PixelDocumentDto): PixelDocument {
  const layerPixels: Record<string, Uint8ClampedArray> = {}
  for (const [id, arr] of Object.entries(dto.layerPixels)) {
    layerPixels[id] = new Uint8ClampedArray(arr)
  }
  return {
    ...dto,
    layerPixels
  }
}

export function clonePixelDocumentForIpc(doc: PixelDocument): PixelDocument {
  return deserializePixelDocumentFromIpc(serializePixelDocumentForIpc(doc))
}
