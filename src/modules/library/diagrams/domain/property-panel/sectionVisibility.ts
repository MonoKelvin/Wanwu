import type {
  DiagramPropertyContext,
  DiagramPropertyTab
} from '@modules/library/diagrams/domain/property-panel/types'
import {
  effectiveEdgeCount,
  effectiveNodeCount,
  selectionScopeKey
} from '@modules/library/diagrams/lib/diagramSelectionSnapshot'
import type { DiagramEditorSelection } from '@modules/library/diagrams/lib/diagramSelectionTypes'

export function hasSelectedNodes(ctx: DiagramPropertyContext): boolean {
  return effectiveNodeCount(ctx.selection) > 0
}

export function hasSelectedEdges(ctx: DiagramPropertyContext): boolean {
  return effectiveEdgeCount(ctx.selection) > 0
}

export function hasShapeExtension(ctx: DiagramPropertyContext): boolean {
  const kind = ctx.selectedNode?.shapeExtension?.kind
  return typeof kind === 'string' && kind.length > 0
}

export function showNodeImageSection(ctx: DiagramPropertyContext): boolean {
  const node = ctx.selectedNode
  if (!node || ctx.multiNode) return false
  return node.type === 'dg-image' || Boolean(node.imageAsset?.url)
}

export function shapeExtensionSectionKey(ctx: DiagramPropertyContext): string | undefined {
  const node = ctx.selectedNode
  const kind = node?.shapeExtension?.kind
  if (!node || !kind) return undefined
  return `${node.id}:${kind}`
}

/** 属性面板可见 Section 列表解析键（结构指纹 + Tab，不含 fill 等属性值） */
export function sectionResolveKey(
  tab: DiagramPropertyTab,
  selection: DiagramEditorSelection
): string {
  return `${tab}|${selectionScopeKey(selection)}`
}

/** 属性面板区块容器 :key（结构指纹 + 发布世代，避免 PrimeVue / 扩展编辑器滞留） */
export function propertyPanelScopeKey(
  tab: string,
  selectionRevision: number,
  selectionScope: string
): string {
  return `${tab}|${selectionRevision}|${selectionScope}`
}
