import type { ShapePreviewSpec } from '@modules/library/diagrams/lib/diagramShapePreview'

export interface DiagramShapeItem {
  id: string
  label: string
  lfType: string
  defaultText: string
  preview: ShapePreviewSpec
}

export interface DiagramShapeCategory {
  id: string
  label: string
  items: DiagramShapeItem[]
}
