import { DIAGRAM_GRID_SIZE } from '@modules/library/diagrams/lib/diagramCanvasTheme'
import type { DiagramDocumentNudgeDirection } from '@modules/library/diagrams/app/command/domain/payloads'

export interface CanvasNudgeDelta {
  dx: number
  dy: number
}

/** 根据方向、步进与网格设置计算微移偏移 */
export function resolveCanvasNudgeDelta(
  direction: DiagramDocumentNudgeDirection,
  options: { snapGrid: boolean; large?: boolean; fine?: boolean }
): CanvasNudgeDelta | null {
  if (options.fine) {
    switch (direction) {
      case 'left':
        return { dx: -1, dy: 0 }
      case 'right':
        return { dx: 1, dy: 0 }
      case 'up':
        return { dx: 0, dy: -1 }
      case 'down':
        return { dx: 0, dy: 1 }
      default:
        return null
    }
  }

  const large = Boolean(options.large)
  const step = options.snapGrid
    ? DIAGRAM_GRID_SIZE * (large ? 5 : 1)
    : large
      ? 10
      : 1

  switch (direction) {
    case 'left':
      return { dx: -step, dy: 0 }
    case 'right':
      return { dx: step, dy: 0 }
    case 'up':
      return { dx: 0, dy: -step }
    case 'down':
      return { dx: 0, dy: step }
    default:
      return null
  }
}
