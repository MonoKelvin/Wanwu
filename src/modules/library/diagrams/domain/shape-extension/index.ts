export type {
  DiagramShapeExtension,
  DiagramShapeKindRegistration,
  DiagramShapePaletteBinding,
  IDiagramShapeExtensionRegistry,
  IDiagramShapePayloadCodec,
  IDiagramShapePropertyEditorProvider,
  IDiagramShapeRenderer
} from '@modules/library/diagrams/domain/shape-extension/interfaces'

export type {
  DiagramShapeInteractionMode,
  DiagramShapePayloadEnvelope,
  DiagramShapePropertyEditorOrder
} from '@modules/library/diagrams/domain/shape-extension/types'

export { DG_SHAPE_PAYLOAD_KEY } from '@modules/library/diagrams/domain/shape-extension/types'

export {
  DiagramShapeExtensionRegistry,
  getDiagramShapeExtensionRegistry,
  resetDiagramShapeExtensionRegistry
} from '@modules/library/diagrams/domain/shape-extension/DiagramShapeExtensionRegistry'

export {
  isDiagramShapePayloadEnvelope,
  mergeDgShapeIntoProperties,
  readDgShapeFromProperties
} from '@modules/library/diagrams/domain/shape-extension/diagramShapePayload'

export type { DiagramNodeShapeExtensionView } from '@modules/library/diagrams/lib/diagramSelectionTypes'

export {
  applyNodeShapeExtension,
  DG_SHAPE_RENDER_REV_KEY,
  patchNodeDgShape,
  readNodeShapeExtension,
  refreshLayoutHandledShapeView,
  syncNodeShapeExtensionEffects,
  syncShapeExtensionNodeAfterLoad
} from '@modules/library/diagrams/domain/shape-extension/diagramShapeBridge'
