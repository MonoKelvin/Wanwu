import type LogicFlow from '@logicflow/core'
import {
  isDiagramShapePayloadEnvelope,
  patchNodeDgShape
} from '@modules/library/diagrams/domain/shape-extension'
import type { DiagramShapePayloadEnvelope } from '@modules/library/diagrams/domain/shape-extension/types'
import { ensureGroupFrameAtBottom } from '@modules/library/diagrams/lib/diagramGroupBounds'
import { isGroupFrameModel } from '@modules/library/diagrams/lib/diagramGroupFrame'

export function applyDiagramNodePatch(
  lf: LogicFlow,
  nodeId: string,
  patch: Record<string, unknown>
): boolean {
  const model = lf.getNodeModelById(nodeId)
  if (!model) return false

  if (typeof patch.lfType === 'string' && patch.lfType !== model.type) {
    ;(model as { type: string }).type = patch.lfType
    if ('setAttributes' in model && typeof model.setAttributes === 'function') {
      ;(model as { setAttributes: () => void }).setAttributes()
    }
  }
  if ('text' in patch && typeof patch.text === 'string') {
    model.updateText(patch.text)
  }
  if ('x' in patch || 'y' in patch) {
    const nx = typeof patch.x === 'number' ? patch.x : model.x
    const ny = typeof patch.y === 'number' ? patch.y : model.y
    const dx = nx - model.x
    const dy = ny - model.y
    if (dx !== 0 || dy !== 0) lf.graphModel.moveNode(nodeId, dx, dy, true)
  }
  const props = patch.properties ?? patch.style
  if (props && typeof props === 'object') {
    const incoming = { ...(props as Record<string, unknown>) }
    if (incoming.dgGroupStyle && model.properties?.dgGroupStyle) {
      incoming.dgGroupStyle = {
        ...(model.properties.dgGroupStyle as Record<string, unknown>),
        ...(incoming.dgGroupStyle as Record<string, unknown>)
      }
    }

    const dgShapePatch = incoming.dgShape
    if (isDiagramShapePayloadEnvelope(dgShapePatch)) {
      patchNodeDgShape(lf, nodeId, dgShapePatch as DiagramShapePayloadEnvelope)
      const { dgShape: _dgShape, ...rest } = incoming
      if (Object.keys(rest).length > 0) {
        lf.setProperties(nodeId, rest)
      }
    } else {
      lf.setProperties(nodeId, incoming)
    }

    if (isGroupFrameModel(model)) {
      ensureGroupFrameAtBottom(lf, nodeId)
    }
  }
  return true
}
