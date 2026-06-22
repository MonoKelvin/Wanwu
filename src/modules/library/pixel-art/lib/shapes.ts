export interface Point {
  x: number
  y: number
}

export function linePoints(x0: number, y0: number, x1: number, y1: number): Point[] {
  const points: Point[] = []
  let x = x0
  let y = y0
  const dx = Math.abs(x1 - x0)
  const sx = x0 < x1 ? 1 : -1
  const dy = -Math.abs(y1 - y0)
  const sy = y0 < y1 ? 1 : -1
  let err = dx + dy

  while (true) {
    points.push({ x, y })
    if (x === x1 && y === y1) break
    const e2 = 2 * err
    if (e2 >= dy) {
      err += dy
      x += sx
    }
    if (e2 <= dx) {
      err += dx
      y += sy
    }
  }
  return points
}

function sym8(points: Point[], cx: number, cy: number): Point[] {
  const out: Point[] = []
  for (const p of points) {
    const dx = p.x
    const dy = p.y
    out.push(
      { x: cx + dx, y: cy + dy },
      { x: cx + dy, y: cy + dx },
      { x: cx - dy, y: cy + dx },
      { x: cx - dx, y: cy + dy },
      { x: cx - dx, y: cy - dy },
      { x: cx - dy, y: cy - dx },
      { x: cx + dy, y: cy - dx },
      { x: cx + dx, y: cy - dy }
    )
  }
  return out
}

export function circlePoints(cx: number, cy: number, r: number): Point[] {
  if (r <= 0) return [{ x: cx, y: cy }]
  const quarter: Point[] = []
  let x = 0
  let y = r
  let p = 1 - r
  while (x <= y) {
    quarter.push({ x, y })
    x++
    if (p < 0) {
      p += 2 * x + 1
    } else {
      y--
      p += 2 * x + 1 - 2 * y
    }
  }
  return sym8(quarter, cx, cy)
}

function sym4(points: Point[], cx: number, cy: number): Point[] {
  const out: Point[] = []
  for (const p of points) {
    out.push(
      { x: cx + p.x, y: cy + p.y },
      { x: cx - p.x, y: cy + p.y },
      { x: cx + p.x, y: cy - p.y },
      { x: cx - p.x, y: cy - p.y }
    )
  }
  return out
}

export function ellipsePoints(cx: number, cy: number, rx: number, ry: number): Point[] {
  if (rx <= 0 || ry <= 0) return [{ x: cx, y: cy }]
  const quarter: Point[] = []
  let x = 0
  let y = ry
  const rx2 = rx * rx
  const ry2 = ry * ry
  let px = 0
  let py = 2 * rx2 * y
  let p = ry2 - rx2 * ry + 0.25 * rx2

  while (px < py) {
    quarter.push({ x, y })
    x++
    px += 2 * ry2
    if (p < 0) {
      p += ry2 + px
    } else {
      y--
      py -= 2 * rx2
      p += ry2 + px - py
    }
  }

  p = ry2 * (x + 0.5) * (x + 0.5) + rx2 * (y - 1) * (y - 1) - rx2 * ry2
  while (y >= 0) {
    quarter.push({ x, y })
    y--
    py -= 2 * rx2
    if (p > 0) {
      p += rx2 - py
    } else {
      x++
      px += 2 * ry2
      p += rx2 - py + px
    }
  }

  return sym4(quarter, cx, cy)
}

export function rectPoints(x0: number, y0: number, x1: number, y1: number, filled: boolean): Point[] {
  const minX = Math.min(x0, x1)
  const maxX = Math.max(x0, x1)
  const minY = Math.min(y0, y1)
  const maxY = Math.max(y0, y1)
  const points: Point[] = []
  if (filled) {
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) points.push({ x, y })
    }
    return points
  }
  for (let x = minX; x <= maxX; x++) {
    points.push({ x, y: minY }, { x, y: maxY })
  }
  for (let y = minY + 1; y < maxY; y++) {
    points.push({ x: minX, y }, { x: maxX, y })
  }
  return points
}

export function filledEllipsePoints(cx: number, cy: number, rx: number, ry: number): Point[] {
  if (rx <= 0 || ry <= 0) return [{ x: Math.round(cx), y: Math.round(cy) }]
  const points: Point[] = []
  const rx2 = rx * rx
  const ry2 = ry * ry
  const minY = Math.ceil(cy - ry)
  const maxY = Math.floor(cy + ry)
  for (let y = minY; y <= maxY; y++) {
    const dy = y - cy
    const inner = 1 - (dy * dy) / ry2
    if (inner < 0) continue
    const xSpan = rx * Math.sqrt(inner)
    const minX = Math.ceil(cx - xSpan)
    const maxX = Math.floor(cx + xSpan)
    for (let x = minX; x <= maxX; x++) {
      const dx = x - cx
      if ((dx * dx) / rx2 + (dy * dy) / ry2 <= 1.001) points.push({ x, y })
    }
  }
  return points
}

export function uniquePoints(points: Point[]): Point[] {
  const seen = new Set<string>()
  const out: Point[] = []
  for (const p of points) {
    const key = `${p.x},${p.y}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(p)
  }
  return out
}
