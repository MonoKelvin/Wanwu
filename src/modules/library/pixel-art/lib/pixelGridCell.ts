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
  const srcR = rgba[0]!
  const srcG = rgba[1]!
  const srcB = rgba[2]!
  const srcA = rgba[3]! / 255

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

        // 如果源像素完全透明（alpha = 0），保持目标像素不变
        if (srcA <= 0.001) continue

        // 如果源像素完全不透明（alpha = 1），直接覆盖目标像素
        if (srcA >= 0.999) {
          layer[i] = srcR
          layer[i + 1] = srcG
          layer[i + 2] = srcB
          layer[i + 3] = 255
          continue
        }

        // 源像素半透明：与目标像素混合
        const da = layer[i + 3]! / 255
        const srcOpacity = srcA
        const outA = srcOpacity + da * (1 - srcOpacity)

        // 如果新的 alpha 仍然为 0，则跳过
        if (outA <= 0.001) continue

        // 计算混合后的颜色：新颜色 = (源颜色 * srcOpacity + 目标颜色 * da * (1 - srcOpacity)) / outA
        const r = (srcR * srcOpacity + layer[i]! * da * (1 - srcOpacity)) / outA
        const g = (srcG * srcOpacity + layer[i + 1]! * da * (1 - srcOpacity)) / outA
        const b = (srcB * srcOpacity + layer[i + 2]! * da * (1 - srcOpacity)) / outA

        layer[i] = Math.max(0, Math.min(255, Math.round(r)))
        layer[i + 1] = Math.max(0, Math.min(255, Math.round(g)))
        layer[i + 2] = Math.max(0, Math.min(255, Math.round(b)))
        layer[i + 3] = Math.round(outA * 255)
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

export function expandOriginsWithBrush(
  origins: Point[],
  cellSize: number,
  brushCells: number,
  shape: 'square' | 'circle' = 'square'
): Point[] {
  const cs = Math.max(1, cellSize)
  const cells = Math.max(1, brushCells)
  if (cells <= 1 && shape === 'square') return origins
  const seen = new Set<string>()
  const out: Point[] = []
  for (const { x, y } of origins) {
    for (const origin of enumerateBrushCellOrigins(x, y, cs, cells, shape)) {
      const key = `${origin.x},${origin.y}`
      if (seen.has(key)) continue
      seen.add(key)
      out.push(origin)
    }
  }
  return out
}

/** 基础图形线宽 = 画笔格数，按映射单元格绘制 */
export function shapeToolCellOrigins(
  tool: 'line' | 'rect' | 'ellipse',
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  cellSize: number,
  brushCells: number,
  brushShape: 'square' | 'circle',
  filled: boolean
): Point[] {
  let base: Point[] = []
  if (tool === 'line') {
    base = lineCellOrigins(x0, y0, x1, y1, cellSize)
  } else if (tool === 'rect') {
    base = rectCellOrigins(x0, y0, x1, y1, cellSize, filled)
  } else {
    base = ellipseCellOrigins(x0, y0, x1, y1, cellSize, filled)
  }
  return expandOriginsWithBrush(base, cellSize, brushCells, brushShape)
}
