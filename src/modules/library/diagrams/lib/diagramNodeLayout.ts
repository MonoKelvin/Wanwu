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
  const boxes = sorted.map((node) => ({ node, ...boundsOf(node) }))
  const first = boxes[0]
  const last = boxes[boxes.length - 1]

  if (mode === 'horizontal') {
    const totalWidth = boxes.reduce((sum, b) => sum + b.node.width, 0)
    const span = last.right - first.left
    const gap = Math.max(0, (span - totalWidth) / (boxes.length - 1))
    let cursor = first.left

    return boxes.map(({ node, node: { width } }, index) => {
      if (index === 0 || index === boxes.length - 1) {
        cursor += width + gap
        return { id: node.id, x: node.x, y: node.y }
      }
      const x = cursor + width / 2
      cursor += width + gap
      return { id: node.id, x: Math.round(x), y: node.y }
    })
  }

  const totalHeight = boxes.reduce((sum, b) => sum + b.node.height, 0)
  const span = last.bottom - first.top
  const gap = Math.max(0, (span - totalHeight) / (boxes.length - 1))
  let cursor = first.top

  return boxes.map(({ node, node: { height } }, index) => {
    if (index === 0 || index === boxes.length - 1) {
      cursor += height + gap
      return { id: node.id, x: node.x, y: node.y }
    }
    const y = cursor + height / 2
    cursor += height + gap
    return { id: node.id, x: node.x, y: Math.round(y) }
  })
}

/** 选择集几何包围盒中心（用于粘贴定位） */
export function selectionBoundsCenter(
  nodes: Array<{ x: number; y: number; width?: number; height?: number }>
): { x: number; y: number } {
  const rect = selectionUnionBounds(nodes)
  if (!rect) return { x: 0, y: 0 }
  return { x: rect.cx, y: rect.cy }
}

export type DiagramSelectionRect = {
  minX: number
  minY: number
  maxX: number
  maxY: number
  width: number
  height: number
  cx: number
  cy: number
}

export function selectionUnionBounds(
  nodes: Array<{ x: number; y: number; width?: number; height?: number }>
): DiagramSelectionRect | null {
  if (!nodes.length) return null
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const n of nodes) {
    const w = n.width ?? 100
    const h = n.height ?? 80
    minX = Math.min(minX, n.x - w / 2)
    maxX = Math.max(maxX, n.x + w / 2)
    minY = Math.min(minY, n.y - h / 2)
    maxY = Math.max(maxY, n.y + h / 2)
  }
  const width = maxX - minX
  const height = maxY - minY
  return {
    minX,
    minY,
    maxX,
    maxY,
    width,
    height,
    cx: (minX + maxX) / 2,
    cy: (minY + maxY) / 2
  }
}

/** 从 LogicFlow 节点模型读取布局边界 */
export function readDiagramNodeBounds(
  lf: { getNodeModelById(id: string): { x: number; y: number; width: number; height: number } | undefined } | null,
  nodeId: string
): DiagramNodeBounds | null {
  const model = lf?.getNodeModelById(nodeId)
  if (!model) return null
  return {
    id: nodeId,
    x: model.x,
    y: model.y,
    width: model.width,
    height: model.height
  }
}
