export type { IDiagramPropertySectionRegistry } from '@modules/library/diagrams/domain/property-panel/interfaces'

export type {
  DiagramPropertyActions,
  DiagramPropertyContext,
  DiagramPropertySectionId,
  DiagramPropertyTab,
  IDiagramPropertySectionProvider,
  ResolvedPropertySection
} from '@modules/library/diagrams/domain/property-panel/types'

export { resolveSectionPolicy } from '@modules/library/diagrams/domain/property-panel/resolveSectionPolicy'

export { buildPropertyContext } from '@modules/library/diagrams/domain/property-panel/buildPropertyContext'

export {
  hasSelectedNodes,
  hasSelectedEdges,
  hasShapeExtension,
  showNodeImageSection,
  shapeExtensionSectionKey,
  propertyPanelScopeKey
} from '@modules/library/diagrams/domain/property-panel/sectionVisibility'

export {
  DiagramPropertySectionRegistry,
  getDiagramPropertySectionRegistry,
  resetDiagramPropertySectionRegistry
} from '@modules/library/diagrams/domain/property-panel/DiagramPropertySectionRegistry'
