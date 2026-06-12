import type LogicFlow from '@logicflow/core'
import type { CanvasGraphPatch } from '@modules/library/diagrams/interfaces/IDiagramEditorPort'
import {
  isDiagramShapePayloadEnvelope,
  patchNodeDgShape
} from '@modules/library/diagrams/domain/shape-extension'
import type { DiagramShapePayloadEnvelope } from '@modules/library/diagrams/domain/shape-extension/types'

export function applyDiagramCanvasGraphPatch(lf: LogicFlow, patch: CanvasGraphPatch): void {
  for (const node of patch.addNodes ?? []) {
    lf.addNode(node as never)
  }
  for (const item of patch.updateNodes ?? []) {
    const dgShape = item.patch.dgShape
    if (isDiagramShapePayloadEnvelope(dgShape)) {
      patchNodeDgShape(lf, item.id, dgShape as DiagramShapePayloadEnvelope)
      const { dgShape: _dgShape, ...rest } = item.patch
      if (Object.keys(rest).length > 0) {
        lf.setProperties(item.id, rest)
      }
    } else {
      lf.setProperties(item.id, item.patch)
    }
  }
  for (const id of patch.deleteNodeIds ?? []) {
    lf.deleteNode(id)
  }
  for (const edge of patch.addEdges ?? []) {
    lf.addEdge(edge as never)
  }
  for (const item of patch.updateEdges ?? []) {
    const edge = lf.getEdgeModelById(item.id)
    if (edge) Object.assign(edge, item.patch)
  }
  for (const id of patch.deleteEdgeIds ?? []) {
    lf.deleteEdge(id)
  }
}
