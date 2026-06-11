import type { DiagramPropertyContext } from '@modules/library/diagrams/domain/property-panel/types'
import {
  effectiveEdgeCount,
  effectiveNodeCount
} from '@modules/library/diagrams/lib/diagramSelectionSnapshot'

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
