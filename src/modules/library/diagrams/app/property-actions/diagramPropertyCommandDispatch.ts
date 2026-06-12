import { useDebounceFn } from '@vueuse/core'
import type { IDiagramCommandBus } from '@modules/library/diagrams/interfaces/IDiagramCommandBus'
import type {
  DiagramEditorSelection,
  DiagramNodeProperties
} from '@modules/library/diagrams/lib/diagramSelectionTypes'

export interface DiagramPropertyCommandDispatchDeps {
  bus: IDiagramCommandBus
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

/** 属性面板 → command bus 的防抖/批量派发 */
export function createDiagramPropertyCommandDispatch(
  deps: DiagramPropertyCommandDispatchDeps
): DiagramPropertyCommandDispatch {
  const { bus, getSelection, getSelectedNode, isMultiNode, isMultiEdge } = deps

  function activeNodeId(): string | null {
    return getSelectedNode()?.id ?? null
  }

  const dispatchBatchNode = useDebounceFn((nodeProps: Record<string, unknown>) => {
    void bus.dispatch({ type: 'canvas.batchUpdateNodes', payload: { nodeProps } })
  }, 200)

  const dispatchNodeText = useDebounceFn((nodeProps: Record<string, unknown>) => {
    const id = activeNodeId()
    if (!id) return
    void bus.dispatch({ type: 'canvas.updateNode', payload: { nodeId: id, nodeProps } })
  }, 200)

  function patchNodeNow(nodeProps: Record<string, unknown>) {
    if (isMultiNode()) {
      void bus.dispatch({ type: 'canvas.batchUpdateNodes', payload: { nodeProps } })
      return
    }
    const id = activeNodeId()
    if (!id) return
    void bus.dispatch({ type: 'canvas.updateNode', payload: { nodeId: id, nodeProps } })
  }

  const dispatchNodeNumeric = useDebounceFn((nodeProps: Record<string, unknown>) => {
    patchNodeNow(nodeProps)
  }, 200)

  const dispatchEdgeNumeric = useDebounceFn((edgeProps: Record<string, unknown>) => {
    patchEdgeNow(edgeProps)
  }, 200)

  function patchEdgeNow(edgeProps: Record<string, unknown>) {
    if (isMultiEdge()) {
      void bus.dispatch({ type: 'canvas.batchUpdateEdges', payload: { edgeProps } })
      return
    }
    const id = getSelection().edge?.id
    if (!id) return
    void bus.dispatch({ type: 'canvas.updateEdge', payload: { edgeId: id, edgeProps } })
  }

  const dispatchBatchEdge = useDebounceFn((edgeProps: Record<string, unknown>) => {
    void bus.dispatch({ type: 'canvas.batchUpdateEdges', payload: { edgeProps } })
  }, 200)

  const dispatchEdgeText = useDebounceFn((edgeProps: Record<string, unknown>) => {
    const id = getSelection().edge?.id
    if (!id) return
    void bus.dispatch({ type: 'canvas.updateEdge', payload: { edgeId: id, edgeProps } })
  }, 200)

  function patchCanvas(patch: Record<string, unknown>) {
    void bus.dispatch({ type: 'canvas.updateSettings', payload: { settings: patch } })
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
