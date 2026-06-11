import type LogicFlow from '@logicflow/core'
import type {
  DiagramCanvasSettings,
  DiagramEditorSelection
} from '@modules/library/diagrams/lib/diagramSelectionTypes'
import { computeMixedNodeFields } from '@modules/library/diagrams/lib/diagramSelectionMixed'
import { readEdgeProperties, readNodeProperties } from '@modules/library/diagrams/lib/diagramStyleBridge'
import {
  deriveSelectionCounts,
  filterAlignableNodeIds,
  resolvePrimaryNodeId,
  sanitizeSelectionIds
} from '@modules/library/diagrams/lib/diagramSelectionSnapshot'

/** 选区快照合成时的工具栏能力（由编辑器端口解析后注入） */
export interface DiagramSelectionCapabilities {
  canGroup: boolean
  canUngroup: boolean
}

export interface DiagramSelectionComposeInput {
  lf: LogicFlow
  nodeIds: readonly string[]
  edgeIds: readonly string[]
  canvas: DiagramCanvasSettings
  formatPainterActive: boolean
  capabilities: DiagramSelectionCapabilities
}

/** 由 LogicFlow 选区 id 列表合成编辑器选区快照（单一事实来源） */
export function composeDiagramEditorSelection(
  input: DiagramSelectionComposeInput
): DiagramEditorSelection {
  const { lf, nodeIds, edgeIds, canvas, formatPainterActive, capabilities } = input
  const { nodeIds: selectedNodeIds, edgeIds: selectedEdgeIds } = sanitizeSelectionIds(
    lf,
    [...nodeIds],
    [...edgeIds]
  )
  const { selectedNodeCount, selectedEdgeCount } = deriveSelectionCounts(
    lf,
    selectedNodeIds,
    selectedEdgeIds
  )
  const canClearStyle = selectedNodeCount + selectedEdgeCount > 0
  const alignableIds = filterAlignableNodeIds(lf, selectedNodeIds)
  const mixedNodeFields =
    alignableIds.length >= 2 ? computeMixedNodeFields(lf, alignableIds) : []
  const primaryNodeId = resolvePrimaryNodeId(lf, selectedNodeIds)
  const primaryEdgeId = selectedEdgeIds[0] ?? null
  const { canGroup, canUngroup } = capabilities

  if (selectedNodeCount > 0) {
    const edgeId =
      primaryEdgeId && selectedEdgeIds.includes(primaryEdgeId) ? primaryEdgeId : null
    return {
      kind: 'node',
      node: primaryNodeId ? readNodeProperties(lf, primaryNodeId) : null,
      edge: edgeId ? readEdgeProperties(lf, edgeId) : null,
      canvas,
      selectedNodeCount,
      selectedEdgeCount,
      selectedNodeIds,
      selectedEdgeIds,
      mixedNodeFields,
      formatPainterActive,
      canGroup,
      canUngroup,
      canClearStyle
    }
  }

  if (selectedEdgeCount > 0) {
    return {
      kind: 'edge',
      node: null,
      edge: primaryEdgeId ? readEdgeProperties(lf, primaryEdgeId) : null,
      canvas,
      selectedNodeCount,
      selectedEdgeCount,
      selectedNodeIds,
      selectedEdgeIds,
      mixedNodeFields,
      formatPainterActive,
      canGroup,
      canUngroup,
      canClearStyle
    }
  }

  return emptyDiagramEditorSelection(canvas, formatPainterActive)
}

export function emptyDiagramEditorSelection(
  canvas: DiagramCanvasSettings,
  formatPainterActive = false
): DiagramEditorSelection {
  return {
    kind: 'canvas',
    node: null,
    edge: null,
    canvas,
    selectedNodeCount: 0,
    selectedEdgeCount: 0,
    selectedNodeIds: [],
    selectedEdgeIds: [],
    mixedNodeFields: [],
    formatPainterActive,
    canGroup: false,
    canUngroup: false,
    canClearStyle: false
  }
}
