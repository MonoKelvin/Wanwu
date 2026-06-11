export type {
  DiagramPropertyContext,
  DiagramPropertySectionId,
  DiagramPropertyTab,
  IDiagramPropertySectionProvider,
  ResolvedPropertySection
} from '@modules/library/diagrams/domain/property-panel/types'

export { buildPropertyContext } from '@modules/library/diagrams/domain/property-panel/buildPropertyContext'

export {
  hasSelectedNodes,
  hasSelectedEdges,
  hasShapeExtension,
  showNodeImageSection,
  shapeExtensionSectionKey
} from '@modules/library/diagrams/domain/property-panel/sectionVisibility'

export {
  DiagramPropertySectionRegistry,
  getDiagramPropertySectionRegistry,
  resetDiagramPropertySectionRegistry
} from '@modules/library/diagrams/domain/property-panel/DiagramPropertySectionRegistry'
