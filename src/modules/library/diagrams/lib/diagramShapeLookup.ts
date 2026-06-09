import { DIAGRAM_SHAPE_CATEGORIES } from '@modules/library/diagrams/lib/diagramShapeCatalog'
import type { DiagramShapeItem } from '@modules/library/diagrams/lib/diagramShapeTypes'

const SHAPE_BY_ID = new Map<string, DiagramShapeItem>(
  DIAGRAM_SHAPE_CATEGORIES.flatMap((c) => c.items).map((item) => [item.id, item])
)

export function getDiagramShapeById(id: string): DiagramShapeItem | undefined {
  return SHAPE_BY_ID.get(id)
}
