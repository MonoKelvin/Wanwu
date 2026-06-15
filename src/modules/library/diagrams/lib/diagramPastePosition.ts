export type DiagramPasteClientPosition = {
  clientX: number
  clientY: number
}

function isFiniteClientCoord(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

/**
 * 解析粘贴锚点（屏幕坐标）：显式坐标 > 画布最近指针 > undefined（走默认偏移）。
 * 快捷键与右键菜单粘贴共用此逻辑。
 */
export function resolveDiagramPasteClientPosition(
  explicitX?: number,
  explicitY?: number,
  lastPointer?: { x: number; y: number } | null
): DiagramPasteClientPosition | undefined {
  if (isFiniteClientCoord(explicitX) && isFiniteClientCoord(explicitY)) {
    return { clientX: explicitX, clientY: explicitY }
  }
  if (lastPointer && isFiniteClientCoord(lastPointer.x) && isFiniteClientCoord(lastPointer.y)) {
    return { clientX: lastPointer.x, clientY: lastPointer.y }
  }
  return undefined
}
