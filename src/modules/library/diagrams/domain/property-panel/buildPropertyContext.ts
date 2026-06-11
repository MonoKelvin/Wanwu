import { ensureDiagramShapeExtensions } from '@modules/library/diagrams/app/diagramShapeExtensions'
import type { DiagramPropertyContext, DiagramPropertyTab } from '@modules/library/diagrams/domain/property-panel/types'
import { resolveSectionPolicy } from '@modules/library/diagrams/domain/property-panel/resolveSectionPolicy'
import { DIAGRAM_GROUP_FRAME_TYPE } from '@modules/library/diagrams/lib/diagramGroupFrame'
import type { DiagramEditorSelection } from '@modules/library/diagrams/lib/diagramSelectionTypes'
import {
  effectiveEdgeCount,
  effectiveNodeCount
} from '@modules/library/diagrams/lib/diagramSelectionSnapshot'

export function buildPropertyContext(
  tab: DiagramPropertyTab,
  selection: DiagramEditorSelection,
  fileId: string | null
): DiagramPropertyContext {
  const nodeCount = effectiveNodeCount(selection)
  const edgeCount = effectiveEdgeCount(selection)
  const multiNode = nodeCount > 1
  const multiEdge = edgeCount > 1
  const multiSelect = nodeCount + edgeCount > 1

  const selectedNode =
    selection.kind === 'node' && nodeCount === 1 ? selection.node : null
  const selectedEdge = edgeCount > 0 ? selection.edge : null

  const isGroupFrame = nodeCount === 1 && selection.node?.type === DIAGRAM_GROUP_FRAME_TYPE
  const isGroupedMember = !multiNode && Boolean(selectedNode?.groupId)
  const shapeExtKind =
    typeof selectedNode?.shapeExtension?.kind === 'string' &&
    selectedNode.shapeExtension.kind.length > 0
      ? selectedNode.shapeExtension.kind
      : null

  const shapeKindReg = shapeExtKind
    ? ensureDiagramShapeExtensions().getKind(shapeExtKind) ?? null
    : null

  return {
    tab,
    fileId,
    selection,
    selectedNode,
    selectedEdge,
    multiNode,
    multiEdge,
    multiSelect,
    isGroupFrame,
    isGroupedMember,
    shapeExtKind,
    shapeKindReg,
    sectionPolicy: resolveSectionPolicy(shapeKindReg ?? undefined)
  }
}
