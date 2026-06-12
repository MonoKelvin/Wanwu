import type LogicFlow from '@logicflow/core'
import { snapCoordinateToGrid } from '@modules/library/diagrams/lib/diagramCanvasTheme'

/** 应用对齐/分布产生的位置补丁，返回实际移动的节点 id */
export function applyDiagramNodePositionPatches(
  lf: LogicFlow,
  patches: Array<{ id: string; x: number; y: number }>,
  snapGrid: boolean
): string[] {
  const movedIds: string[] = []
  for (const patch of patches) {
    const model = lf.getNodeModelById(patch.id)
    if (!model) continue
    let { x, y } = patch
    if (snapGrid) {
      x = snapCoordinateToGrid(x)
      y = snapCoordinateToGrid(y)
    }
    const dx = x - model.x
    const dy = y - model.y
    if (dx !== 0 || dy !== 0) {
      lf.graphModel.moveNode(patch.id, dx, dy, true)
      movedIds.push(patch.id)
    }
  }
  return movedIds
}
