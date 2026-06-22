function colorDist(a: Uint8ClampedArray, i: number, b: number[], tolerance: number): boolean {
  const dr = Math.abs(a[i] - b[0])
  const dg = Math.abs(a[i + 1] - b[1])
  const db = Math.abs(a[i + 2] - b[2])
  const da = Math.abs(a[i + 3] - b[3])
  return dr + dg + db + da <= tolerance * 4
}

function parseColor(hex: string): [number, number, number, number] {
  const h = hex.replace('#', '')
  if (h.length === 6) {
    return [
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16),
      255
    ]
  }
  if (h.length === 8) {
    return [
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16),
      parseInt(h.slice(6, 8), 16)
    ]
  }
  return [0, 0, 0, 255]
}

/** Scanline flood fill (Lospec FillTool 思路) */
export function floodFillScanline(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  sx: number,
  sy: number,
  fillHex: string,
  tolerance: number
): boolean {
  if (sx < 0 || sy < 0 || sx >= width || sy >= height) return false

  const temp = new Uint8ClampedArray(data)
  const startPos = (sy * width + sx) * 4
  const cluster = [
    temp[startPos]!,
    temp[startPos + 1]!,
    temp[startPos + 2]!,
    temp[startPos + 3]!
  ]
  const fill = parseColor(fillHex)

  if (
    cluster[0] === fill[0] &&
    cluster[1] === fill[1] &&
    cluster[2] === fill[2] &&
    cluster[3] === fill[3]
  ) {
    return false
  }

  const stack: [number, number][] = [[sx, sy]]
  let changed = false

  while (stack.length) {
    const [seedX, seedY] = stack.pop()!
    let x = seedX
    let y = seedY
    let pos = (y * width + x) * 4

    while (y >= 0 && colorDist(temp, pos, cluster, tolerance)) {
      pos -= width * 4
      y--
    }
    pos += width * 4
    y++

    let reachLeft = false
    let reachRight = false

    while (y < height && colorDist(temp, pos, cluster, tolerance)) {
      temp[pos] = fill[0]!
      temp[pos + 1] = fill[1]!
      temp[pos + 2] = fill[2]!
      temp[pos + 3] = fill[3]!
      changed = true

      if (x > 0) {
        const leftPos = pos - 4
        if (colorDist(temp, leftPos, cluster, tolerance)) {
          if (!reachLeft) {
            stack.push([x - 1, y])
            reachLeft = true
          }
        } else if (reachLeft) {
          reachLeft = false
        }
      }

      if (x < width - 1) {
        const rightPos = pos + 4
        if (colorDist(temp, rightPos, cluster, tolerance)) {
          if (!reachRight) {
            stack.push([x + 1, y])
            reachRight = true
          }
        } else if (reachRight) {
          reachRight = false
        }
      }

      y++
      pos += width * 4
    }
  }

  if (changed) data.set(temp)
  return changed
}
