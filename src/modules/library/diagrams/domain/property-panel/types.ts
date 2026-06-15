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

export interface DiagramPropertyActions {
  isMixed(field: string): boolean
  isTextAlignActive(value: string): boolean
  isFontWeightActive(): boolean
  parseNumber(value: unknown, fallback: number, min?: number, max?: number): number
  nodeTopLeft(node: { x: number; y: number; width: number; height: number }): {
    left: number
    top: number
  }
  patchNode(patch: Record<string, unknown>): void
  patchNodeNow(nodeProps: Record<string, unknown>): void
  patchNodeNumeric(patch: Record<string, unknown>): void
  patchNodeTextStyle(patch: Record<string, unknown>): void
  patchNodeLeft(left: number): void
  patchNodeTop(top: number): void
  patchNodeWidth(width: number): void
  patchNodeHeight(height: number): void
  patchNodePositionFromTopLeft(left: number, top: number): void
  patchNodeSizeKeepTopLeft(width: number, height: number): void
  patchEdge(patch: Record<string, unknown>): void
  dispatchEdgeNumeric(edgeProps: Record<string, unknown>): void
  patchCanvas(patch: Record<string, unknown>): void
  patchDefaultEdge(patch: Record<string, unknown>): void
  patchGroupStyle(patch: Record<string, unknown>): void
  patchGroupAlwaysVisible(value: boolean): void
  toggleUnderline(): void
  toggleItalic(): void
  toggleStrikethrough(): void
  setTextAlign(align: 'left' | 'center' | 'right'): void
  pickNodeImage(): Promise<void>
  clearNodeImage(): void
  hideTextContent(): boolean
  textSectionTitle(): string
}

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
