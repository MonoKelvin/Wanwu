import { nativeImage } from 'electron'

export function rgbaToPngBuffer(rgba: Uint8ClampedArray, width: number, height: number): Buffer {
  const bgra = Buffer.alloc(width * height * 4)
  for (let i = 0; i < width * height; i++) {
    bgra[i * 4] = rgba[i * 4 + 2]!
    bgra[i * 4 + 1] = rgba[i * 4 + 1]!
    bgra[i * 4 + 2] = rgba[i * 4]!
    bgra[i * 4 + 3] = rgba[i * 4 + 3]!
  }
  return nativeImage.createFromBitmap(bgra, { width, height }).toPNG()
}

export function pngBufferToRgba(png: Buffer, width: number, height: number): Uint8ClampedArray {
  const img = nativeImage.createFromBuffer(png)
  const size = img.getSize()
  if (size.width !== width || size.height !== height) {
    const resized = img.resize({ width, height })
    return bitmapToRgba(resized.toBitmap(), width, height)
  }
  return bitmapToRgba(img.toBitmap(), width, height)
}

function bitmapToRgba(bitmap: Buffer, width: number, height: number): Uint8ClampedArray {
  const rgba = new Uint8ClampedArray(width * height * 4)
  for (let i = 0; i < width * height; i++) {
    rgba[i * 4] = bitmap[i * 4 + 2]!
    rgba[i * 4 + 1] = bitmap[i * 4 + 1]!
    rgba[i * 4 + 2] = bitmap[i * 4]!
    rgba[i * 4 + 3] = bitmap[i * 4 + 3]!
  }
  return rgba
}
