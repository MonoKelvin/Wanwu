import type LogicFlow from '@logicflow/core'
import { ensureDiagramShapeExtensions } from '@modules/library/diagrams/app/diagramShapeExtensions'
import { mergeDgShapeIntoProperties } from '@modules/library/diagrams/domain/shape-extension'
import { DIAGRAM_SHAPE_CATEGORIES } from '@modules/library/diagrams/lib/diagramShapeCatalog'
import { getDiagramShapeById } from '@modules/library/diagrams/lib/diagramShapeLookup'
import { normalizeNodeStyleProperties } from '@modules/library/diagrams/lib/diagramStyleBridge'
import type { DiagramShapeItem } from '@modules/library/diagrams/lib/diagramShapeTypes'

export { registerAllDiagramShapes } from '@modules/library/diagrams/lib/diagramShapeRegs'
export type { DiagramShapeCategory, DiagramShapeItem } from '@modules/library/diagrams/lib/diagramShapeTypes'
export { DIAGRAM_SHAPE_CATEGORIES } from '@modules/library/diagrams/lib/diagramShapeCatalog'
export { getDiagramShapeById } from '@modules/library/diagrams/lib/diagramShapeLookup'

export function buildDiagramNodeConfig(
  shapeId: string,
  x: number,
  y: number,
  text?: string,
  properties?: Record<string, unknown>
): LogicFlow.NodeConfig {
  const item = getDiagramShapeById(shapeId)
  if (!item) throw new Error(`未知图元: ${shapeId}`)

  const base: LogicFlow.NodeConfig = {
    type: item.lfType,
    x,
    y,
    text: text ?? item.defaultText,
    properties: normalizeNodeStyleProperties(properties)
  }

  if (item.lfType === 'text') {
    base.properties = {
      fontSize: 14,
      ...base.properties
    }
  }

  if (item.lfType === 'dg-swimlane') {
    base.properties = {
      dgLane: true,
      ...base.properties
    }
  }

  const registry = ensureDiagramShapeExtensions()
  const bootstrapEnvelope = registry.createBootstrapEnvelope(shapeId)
  if (bootstrapEnvelope) {
    base.properties = mergeDgShapeIntoProperties(
      base.properties as Record<string, unknown>,
      bootstrapEnvelope
    )
    const kindReg = registry.getKind(bootstrapEnvelope.kind)
    const text = kindReg?.codec.serializeText?.(bootstrapEnvelope.data)
    if (text != null) {
      base.text = text
    }
  }

  return base
}
