import type { Component } from 'vue'
import type { DiagramShapeKindRegistration } from '@modules/library/diagrams/domain/shape-extension/interfaces'
import type { DiagramPropertySectionPolicy } from '@modules/library/diagrams/domain/shape-extension/interfaces'
import type {
  DiagramEditorSelection,
  DiagramEdgeProperties,
  DiagramNodeProperties
} from '@modules/library/diagrams/lib/diagramSelectionTypes'

export type DiagramPropertyTab = 'node' | 'edge' | 'canvas'

export type DiagramPropertySectionId =
  | 'multi-select-tools'
  | 'node-group-frame'
  | 'node-grouped-banner'
  | 'node-shape-extension'
  | 'node-text'
  | 'node-size'
  | 'node-appearance'
  | 'node-image'
  | 'edge-text'
  | 'edge-line'
  | 'edge-arrow'
  | 'canvas-settings'
  | 'canvas-default-edge'

export interface DiagramPropertyContext {
  tab: DiagramPropertyTab
  fileId: string | null
  selection: DiagramEditorSelection
  selectedNode: DiagramNodeProperties | null
  selectedEdge: DiagramEdgeProperties | null
  multiNode: boolean
  multiEdge: boolean
  multiSelect: boolean
  isGroupFrame: boolean
  isGroupedMember: boolean
  shapeExtKind: string | null
  shapeKindReg: DiagramShapeKindRegistration | null
  sectionPolicy: DiagramPropertySectionPolicy | null
}

export interface IDiagramPropertySectionProvider {
  id: DiagramPropertySectionId | string
  tab: DiagramPropertyTab | DiagramPropertyTab[]
  order: number
  visible(ctx: DiagramPropertyContext): boolean
  component: Component
  sectionKey?(ctx: DiagramPropertyContext): string | undefined
}

export interface ResolvedPropertySection {
  id: string
  key: string
  order: number
  component: Component
}
