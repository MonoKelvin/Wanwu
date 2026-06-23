import { linePoints, type Point } from '@modules/library/pixel-art/lib/shapes'
import type { WppMetaFile } from '@modules/library/pixel-art/domain/types'

/** 网格单元格边长（画布像素），对应 meta.grid.size 与向导「1:N」 */
export function getGridCellSize(meta: Pick<WppMetaFile, 'grid'>): number {
  const size = meta.grid?.size
  if (typeof size === 'number' && size >= 1 && size <= 64) return Math.floor(size)
  return 1
}

export function snapToCellOrigin(x: number, y: number, cellSize: number): Point {
  const cs = Math.max(1, cellSize)
  return {
    x: Math.floor(x / cs) * cs,
    y: Math.floor(y / cs) * cs
  }
}

export function enumerateBrushCellOrigins(
  originX: number,
  originY: number,
  cellSize: number,
  brushCells: number,
  shape: 'square' | 'circle' = 'square'
): Point[] {
  const cs = Math.max(1, cellSize)
  const cells = Math.max(1, brushCells)
  const half = Math.floor(cells / 2)
  const radius = cells / 2
  const origins: Point[] = []
  for (let by = -half; by < cells - half; by++) {
    for (let bx = -half; bx < cells - half; bx++) {
      if (shape === 'circle' && Math.hypot(bx + 0.5, by + 0.5) > radius) continue
      origins.push({ x: originX + bx * cs, y: originY + by * cs })
    }
  }
  return origins
}

export function fillCellBlock(
  layer: Uint8ClampedArray,
  originX: number,
  originY: number,
  cellSize: number,
  brushCells: number,
  canvasWidth: number,
  canvasHeight: number,
  rgba: readonly [number, number, number, number],
  options?: { shape?: 'square' | 'circle' }
): void {
  const cs = Math.max(1, cellSize)
  const shape = options?.shape ?? 'square'
  for (const { x: ox, y: oy } of enumerateBrushCellOrigins(
    originX,
    originY,
    cs,
    brushCells,
    shape
  )) {
    for (let dy = 0; dy < cs; dy++) {
      for (let dx = 0; dx < cs; dx++) {
        const x = ox + dx
        const y = oy + dy
        if (x < 0 || y < 0 || x >= canvasWidth || y >= canvasHeight) continue
        const i = (y * canvasWidth + x) * 4
        layer[i] = rgba[0]!
        layer[i + 1] = rgba[1]!
        layer[i + 2] = rgba[2]!
        layer[i + 3] = rgba[3]!
      }
    }
  }
}

export function lineCellOrigins(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  cellSize: number
): Point[] {
  const cs = Math.max(1, cellSize)
  const a = snapToCellOrigin(x0, y0, cs)
  const b = snapToCellOrigin(x1, y1, cs)
  const ix0 = a.x / cs
  const iy0 = a.y / cs
  const ix1 = b.x / cs
  const iy1 = b.y / cs
  return linePoints(ix0, iy0, ix1, iy1).map((p) => ({ x: p.x * cs, y: p.y * cs }))
}

export function rectCellOrigins(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  cellSize: number,
  filled: boolean
): Point[] {
  const cs = Math.max(1, cellSize)
  const minX = Math.min(x0, x1)
  const minY = Math.min(y0, y1)
  const maxX = Math.max(x0, x1)
  const maxY = Math.max(y0, y1)
  const a = snapToCellOrigin(minX, minY, cs)
  const b = snapToCellOrigin(maxX, maxY, cs)
  const origins: Point[] = []
  if (filled) {
    for (let y = a.y; y <= b.y; y += cs) {
      for (let x = a.x; x <= b.x; x += cs) {
        origins.push({ x, y })
      }
    }
    return origins
  }
  for (let x = a.x; x <= b.x; x += cs) {
    origins.push({ x, y: a.y }, { x, y: b.y })
  }
  for (let y = a.y + cs; y < b.y; y += cs) {
    origins.push({ x: a.x, y }, { x: b.x, y })
  }
  return origins
}

export function ellipseCellOrigins(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  cellSize: number,
  filled: boolean
): Point[] {
  const cs = Math.max(1, cellSize)
  const cx = (x0 + x1) / 2
  const cy = (y0 + y1) / 2
  const rx = Math.max(cs / 2, Math.abs(x1 - x0) / 2)
  const ry = Math.max(cs / 2, Math.abs(y1 - y0) / 2)
  const minX = snapToCellOrigin(cx - rx, cy - ry, cs).x
  const minY = snapToCellOrigin(cx - rx, cy - ry, cs).y
  const maxX = snapToCellOrigin(cx + rx, cy + ry, cs).x
  const maxY = snapToCellOrigin(cx + rx, cy + ry, cs).y
  const filledOrigins: Point[] = []

  for (let y = minY; y <= maxY; y += cs) {
    for (let x = minX; x <= maxX; x += cs) {
      const ccx = x + cs / 2 - 0.5
      const ccy = y + cs / 2 - 0.5
      const dx = (ccx - cx) / rx
      const dy = (ccy - cy) / ry
      if (dx * dx + dy * dy <= 1.001) filledOrigins.push({ x, y })
    }
  }

  if (filled) return filledOrigins

  const filledSet = new Set(filledOrigins.map((p) => `${p.x},${p.y}`))
  return filledOrigins.filter((p) => {
    const neighbors = [
      `${p.x + cs},${p.y}`,
      `${p.x - cs},${p.y}`,
      `${p.x},${p.y + cs}`,
      `${p.x},${p.y - cs}`
    ]
    return neighbors.some((key) => !filledSet.has(key))
  })
}

export function normalizeSelectionToCells(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  cellSize: number,
  docWidth: number,
  docHeight: number
): { x: number; y: number; width: number; height: number } {
  const cs = Math.max(1, cellSize)
  const ax = Math.min(x0, x1)
  const ay = Math.min(y0, y1)
  const bx = Math.max(x0, x1)
  const by = Math.max(y0, y1)
  const x = Math.floor(ax / cs) * cs
  const y = Math.floor(ay / cs) * cs
  const xEnd = Math.min(docWidth, Math.floor(bx / cs) * cs + cs)
  const yEnd = Math.min(docHeight, Math.floor(by / cs) * cs + cs)
  return {
    x,
    y,
    width: Math.max(cs, xEnd - x),
    height: Math.max(cs, yEnd - y)
  }
}

export function cellIndex(x: number, y: number, cellSize: number): Point {
  const cs = Math.max(1, cellSize)
  return { x: Math.floor(x / cs), y: Math.floor(y / cs) }
}
