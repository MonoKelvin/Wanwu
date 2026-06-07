import type LogicFlow from '@logicflow/core'
import { DIAGRAM_SHAPE_CATEGORIES } from '@modules/library/diagrams/lib/diagramShapeCatalog'
import { normalizeNodeStyleProperties } from '@modules/library/diagrams/lib/diagramStyleBridge'
import type { DiagramShapeItem } from '@modules/library/diagrams/lib/diagramShapeTypes'

export { registerAllDiagramShapes } from '@modules/library/diagrams/lib/diagramShapeRegs'
export type { DiagramShapeCategory, DiagramShapeItem } from '@modules/library/diagrams/lib/diagramShapeTypes'
export { DIAGRAM_SHAPE_CATEGORIES } from '@modules/library/diagrams/lib/diagramShapeCatalog'

const SHAPE_BY_ID = new Map<string, DiagramShapeItem>(
  DIAGRAM_SHAPE_CATEGORIES.flatMap((c) => c.items).map((item) => [item.id, item])
)

export function getDiagramShapeById(id: string): DiagramShapeItem | undefined {
  return SHAPE_BY_ID.get(id)
}

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

  return base
}
