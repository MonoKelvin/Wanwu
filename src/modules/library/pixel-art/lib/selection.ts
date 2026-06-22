export interface PixelSelection {
  x: number
  y: number
  width: number
  height: number
}

export function normalizeSelection(x0: number, y0: number, x1: number, y1: number): PixelSelection {
  const x = Math.min(x0, x1)
  const y = Math.min(y0, y1)
  return {
    x,
    y,
    width: Math.abs(x1 - x0) + 1,
    height: Math.abs(y1 - y0) + 1
  }
}

export function selectionContains(sel: PixelSelection | null, x: number, y: number): boolean {
  if (!sel) return false
  return x >= sel.x && y >= sel.y && x < sel.x + sel.width && y < sel.y + sel.height
}

export function clampSelection(
  sel: PixelSelection,
  docWidth: number,
  docHeight: number
): PixelSelection {
  let { x, y, width, height } = sel
  if (width < 1) width = 1
  if (height < 1) height = 1
  if (x < 0) {
    width += x
    x = 0
  }
  if (y < 0) {
    height += y
    y = 0
  }
  if (x + width > docWidth) width = docWidth - x
  if (y + height > docHeight) height = docHeight - y
  return {
    x,
    y,
    width: Math.max(1, width),
    height: Math.max(1, height)
  }
}

export function copyRegion(
  layer: Uint8ClampedArray,
  docWidth: number,
  sel: PixelSelection
): Uint8ClampedArray {
  const data = new Uint8ClampedArray(sel.width * sel.height * 4)
  for (let row = 0; row < sel.height; row++) {
    for (let col = 0; col < sel.width; col++) {
      const sx = sel.x + col
      const sy = sel.y + row
      const srcI = (sy * docWidth + sx) * 4
      const dstI = (row * sel.width + col) * 4
      data[dstI] = layer[srcI]!
      data[dstI + 1] = layer[srcI + 1]!
      data[dstI + 2] = layer[srcI + 2]!
      data[dstI + 3] = layer[srcI + 3]!
    }
  }
  return data
}

export function clearRegion(layer: Uint8ClampedArray, docWidth: number, sel: PixelSelection): void {
  for (let row = 0; row < sel.height; row++) {
    for (let col = 0; col < sel.width; col++) {
      const x = sel.x + col
      const y = sel.y + row
      const i = (y * docWidth + x) * 4
      layer[i] = 0
      layer[i + 1] = 0
      layer[i + 2] = 0
      layer[i + 3] = 0
    }
  }
}

export function pasteRegion(
  layer: Uint8ClampedArray,
  docWidth: number,
  sel: PixelSelection,
  data: Uint8ClampedArray
): void {
  for (let row = 0; row < sel.height; row++) {
    for (let col = 0; col < sel.width; col++) {
      const x = sel.x + col
      const y = sel.y + row
      const dstI = (y * docWidth + x) * 4
      const srcI = (row * sel.width + col) * 4
      layer[dstI] = data[srcI]!
      layer[dstI + 1] = data[srcI + 1]!
      layer[dstI + 2] = data[srcI + 2]!
      layer[dstI + 3] = data[srcI + 3]!
    }
  }
}
