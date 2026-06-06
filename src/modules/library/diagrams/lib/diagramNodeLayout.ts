export type DiagramAlignMode =
  | 'left'
  | 'center-h'
  | 'right'
  | 'top'
  | 'center-v'
  | 'bottom'

export type DiagramDistributeMode = 'horizontal' | 'vertical'

export interface DiagramNodeBounds {
  id: string
  x: number
  y: number
  width: number
  height: number
}

function boundsOf(node: DiagramNodeBounds) {
  return {
    left: node.x - node.width / 2,
    right: node.x + node.width / 2,
    top: node.y - node.height / 2,
    bottom: node.y + node.height / 2
  }
}

export function alignNodePositions(
  nodes: DiagramNodeBounds[],
  mode: DiagramAlignMode
): Array<{ id: string; x: number; y: number }> {
  if (nodes.length < 2) return []

  const boxes = nodes.map((n) => ({ node: n, ...boundsOf(n) }))
  const left = Math.min(...boxes.map((b) => b.left))
  const right = Math.max(...boxes.map((b) => b.right))
  const top = Math.min(...boxes.map((b) => b.top))
  const bottom = Math.max(...boxes.map((b) => b.bottom))
  const centerX = (left + right) / 2
  const centerY = (top + bottom) / 2

  return boxes.map(({ node, left: l, right: r, top: t, bottom: b }) => {
    let x = node.x
    let y = node.y
    switch (mode) {
      case 'left':
        x = left + node.width / 2
        break
      case 'right':
        x = right - node.width / 2
        break
      case 'center-h':
        x = centerX
        break
      case 'top':
        y = top + node.height / 2
        break
      case 'bottom':
        y = bottom - node.height / 2
        break
      case 'center-v':
        y = centerY
        break
    }
    return { id: node.id, x: Math.round(x), y: Math.round(y) }
  })
}

export function distributeNodePositions(
  nodes: DiagramNodeBounds[],
  mode: DiagramDistributeMode
): Array<{ id: string; x: number; y: number }> {
  if (nodes.length < 3) return []

  const sorted = [...nodes].sort((a, b) => (mode === 'horizontal' ? a.x - b.x : a.y - b.y))
  const first = sorted[0]
  const last = sorted[sorted.length - 1]
  const span =
    mode === 'horizontal' ? last.x - first.x : (last.y ?? 0) - (first.y ?? 0)
  const step = span / (sorted.length - 1)

  return sorted.map((node, index) => {
    if (index === 0 || index === sorted.length - 1) {
      return { id: node.id, x: node.x, y: node.y }
    }
    if (mode === 'horizontal') {
      return { id: node.id, x: Math.round(first.x + step * index), y: node.y }
    }
    return { id: node.id, x: node.x, y: Math.round(first.y + step * index) }
  })
}
