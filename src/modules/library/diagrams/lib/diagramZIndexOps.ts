import type LogicFlow from '@logicflow/core'
import { ensureAllGroupFramesAtBottom } from '@modules/library/diagrams/lib/diagramGroupBounds'

export function getDiagramGraphZIndexBounds(lf: LogicFlow): { min: number; max: number } {
  const elements = [...lf.graphModel.nodes, ...lf.graphModel.edges]
  if (!elements.length) return { min: 0, max: 0 }
  const indexes = elements.map((element) => element.zIndex)
  return { min: Math.min(...indexes), max: Math.max(...indexes) }
}

export function bringDiagramNodesToFront(lf: LogicFlow, nodeIds: string[]): void {
  const ids = nodeIds.filter((id) => Boolean(lf.getNodeModelById(id)))
  if (!ids.length) return
  let maxZ = getDiagramGraphZIndexBounds(lf).max
  for (const id of ids) {
    maxZ += 1
    lf.setElementZIndex(id, maxZ)
  }
  ensureAllGroupFramesAtBottom(lf)
}

export function sendDiagramNodesToBack(lf: LogicFlow, nodeIds: string[]): void {
  const ids = nodeIds.filter((id) => Boolean(lf.getNodeModelById(id)))
  if (!ids.length) return
  let minZ = getDiagramGraphZIndexBounds(lf).min
  for (let i = ids.length - 1; i >= 0; i--) {
    minZ -= 1
    lf.setElementZIndex(ids[i], minZ)
  }
  ensureAllGroupFramesAtBottom(lf)
}
