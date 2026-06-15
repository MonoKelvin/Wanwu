/** 编辑器选区领域：合成快照、能力解析（统一从此 barrel 导入） */
export type {
  DiagramSelectionCapabilities,
  DiagramSelectionComposeInput
} from '@modules/library/diagrams/domain/composeDiagramEditorSelection'

export type { DiagramSelectionCapabilityPorts } from '@modules/library/diagrams/domain/resolveSelectionCapabilities'

export {
  composeDiagramEditorSelection,
  emptyDiagramEditorSelection
} from '@modules/library/diagrams/domain/composeDiagramEditorSelection'

export { resolveSelectionCapabilities } from '@modules/library/diagrams/domain/resolveSelectionCapabilities'
