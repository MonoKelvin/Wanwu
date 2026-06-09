export type {
  DiagramShapeExtension,
  DiagramShapeKindRegistration,
  DiagramShapePaletteBinding,
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

export {
  applyNodeShapeExtension,
  readNodeShapeExtension,
  syncNodeShapeExtensionEffects,
  type DiagramNodeShapeExtensionView
} from '@modules/library/diagrams/domain/shape-extension/diagramShapeBridge'
