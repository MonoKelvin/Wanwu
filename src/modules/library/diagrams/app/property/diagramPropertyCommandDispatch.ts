import { useDebounceFn } from '@vueuse/core'
import type { DiagramDocumentMutationCommands } from '@modules/library/diagrams/composables/useDiagramCanvasCommands'
import type {
  DiagramEditorSelection,
  DiagramNodeProperties
} from '@modules/library/diagrams/lib/diagramSelectionTypes'

export interface DiagramPropertyCommandDispatchDeps {
  canvas: DiagramDocumentMutationCommands
  getSelection: () => DiagramEditorSelection
  getSelectedNode: () => DiagramNodeProperties | null | undefined
  isMultiNode: () => boolean
  isMultiEdge: () => boolean
}

export interface DiagramPropertyCommandDispatch {
  activeNodeId(): string | null
  patchNodeNow(nodeProps: Record<string, unknown>): void
  patchEdgeNow(edgeProps: Record<string, unknown>): void
  patchCanvas(patch: Record<string, unknown>): void
  dispatchBatchNode: (nodeProps: Record<string, unknown>) => void
  dispatchNodeText: (nodeProps: Record<string, unknown>) => void
  dispatchNodeNumeric: (nodeProps: Record<string, unknown>) => void
  dispatchBatchEdge: (edgeProps: Record<string, unknown>) => void
  dispatchEdgeText: (edgeProps: Record<string, unknown>) => void
  dispatchEdgeNumeric: (edgeProps: Record<string, unknown>) => void
}

/** 属性面板 → 画布命令的防抖/批量派发 */
export function createDiagramPropertyCommandDispatch(
  deps: DiagramPropertyCommandDispatchDeps
): DiagramPropertyCommandDispatch {
  const { canvas, getSelection, getSelectedNode, isMultiNode, isMultiEdge } = deps

  function activeNodeId(): string | null {
    return getSelectedNode()?.id ?? null
  }

  const dispatchBatchNode = useDebounceFn((nodeProps: Record<string, unknown>) => {
    canvas.batchModifyNodes({ nodeProps })
  }, 200)

  const dispatchNodeText = useDebounceFn((nodeProps: Record<string, unknown>) => {
    const id = activeNodeId()
    if (!id) return
    canvas.modifyNode({ nodeId: id, nodeProps })
  }, 200)

  function patchNodeNow(nodeProps: Record<string, unknown>) {
    if (isMultiNode()) {
      canvas.batchModifyNodes({ nodeProps })
      return
    }
    const id = activeNodeId()
    if (!id) return
    canvas.modifyNode({ nodeId: id, nodeProps })
  }

  const dispatchNodeNumeric = useDebounceFn((nodeProps: Record<string, unknown>) => {
    patchNodeNow(nodeProps)
  }, 200)

  const dispatchEdgeNumeric = useDebounceFn((edgeProps: Record<string, unknown>) => {
    patchEdgeNow(edgeProps)
  }, 200)

  function patchEdgeNow(edgeProps: Record<string, unknown>) {
    if (isMultiEdge()) {
      canvas.batchModifyEdges({ edgeProps })
      return
    }
    const id = getSelection().edge?.id
    if (!id) return
    canvas.modifyEdge({ edgeId: id, edgeProps })
  }

  const dispatchBatchEdge = useDebounceFn((edgeProps: Record<string, unknown>) => {
    canvas.batchModifyEdges({ edgeProps })
  }, 200)

  const dispatchEdgeText = useDebounceFn((edgeProps: Record<string, unknown>) => {
    const id = getSelection().edge?.id
    if (!id) return
    canvas.modifyEdge({ edgeId: id, edgeProps })
  }, 200)

  function patchCanvas(patch: Record<string, unknown>) {
    canvas.modifyCanvasSettings({ settings: patch })
  }

  return {
    activeNodeId,
    patchNodeNow,
    patchEdgeNow,
    patchCanvas,
    dispatchBatchNode,
    dispatchNodeText,
    dispatchNodeNumeric,
    dispatchBatchEdge,
    dispatchEdgeText,
    dispatchEdgeNumeric
  }
}
