import type { DiagramEditorSelection } from '@modules/library/diagrams/lib/diagramSelectionTypes'
import type { DiagramPropertyCommandDispatch } from '@modules/library/diagrams/app/property/diagramPropertyCommandDispatch'

export interface DiagramPropertyEdgeActionsDeps {
  dispatch: DiagramPropertyCommandDispatch
  getSelection: () => DiagramEditorSelection
  isMultiEdge: () => boolean
}

export function createDiagramPropertyEdgeActions(deps: DiagramPropertyEdgeActionsDeps) {
  const { dispatch, isMultiEdge } = deps

  function patchEdge(patch: Record<string, unknown>) {
    if ('text' in patch) {
      if (isMultiEdge()) void dispatch.dispatchBatchEdge(patch)
      else void dispatch.dispatchEdgeText(patch)
      return
    }
    dispatch.patchEdgeNow(patch)
  }

  return {
    patchEdge,
    dispatchEdgeNumeric: dispatch.dispatchEdgeNumeric
  }
}
