import type { Ref } from 'vue'
import type { DiagramPropertySectionPolicy } from '@modules/library/diagrams/domain/shape-extension/interfaces'
import type { DiagramPropertyActions } from '@modules/library/diagrams/domain/property-panel/types'
import type { IDiagramCommandBus } from '@modules/library/diagrams/interfaces/IDiagramCommandBus'
import type {
  DiagramCanvasSettings,
  DiagramEditorSelection,
  DiagramNodeProperties
} from '@modules/library/diagrams/lib/diagramSelectionTypes'
import { createDiagramPropertyAssetActions } from '@modules/library/diagrams/app/property-actions/diagramPropertyAssetActions'
import { createDiagramPropertyCommandDispatch } from '@modules/library/diagrams/app/property-actions/diagramPropertyCommandDispatch'
import { createDiagramPropertyEdgeActions } from '@modules/library/diagrams/app/property-actions/diagramPropertyEdgeActions'
import { createDiagramPropertyNodeActions } from '@modules/library/diagrams/app/property-actions/diagramPropertyNodeActions'

export interface DiagramPropertyActionsDeps {
  bus: IDiagramCommandBus
  getSelection: () => DiagramEditorSelection
  getSelectedNode: () => DiagramNodeProperties | null | undefined
  getSectionPolicy: () => DiagramPropertySectionPolicy | null | undefined
  getCanvas: () => DiagramCanvasSettings
  isMultiNode: () => boolean
  isMultiEdge: () => boolean
  getFileId: () => string | null
  imageBusy: Ref<boolean>
  toast: {
    info(message: string): void
    error(message: string): void
  }
}

function parseNumber(value: unknown, fallback: number, min = -Infinity, max = Infinity): number {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

/** 属性面板写操作：通过 command bus 修改画布，与 Section UI 解耦 */
export function createDiagramPropertyActions(deps: DiagramPropertyActionsDeps): DiagramPropertyActions {
  const { bus, getSelection, getSelectedNode, getSectionPolicy, getCanvas, isMultiNode, isMultiEdge } =
    deps

  function isMixed(field: string): boolean {
    return isMultiNode() && getSelection().mixedNodeFields.includes(field)
  }

  const dispatch = createDiagramPropertyCommandDispatch({
    bus,
    getSelection,
    getSelectedNode,
    isMultiNode,
    isMultiEdge
  })

  const nodeActions = createDiagramPropertyNodeActions({
    dispatch,
    getSelectedNode,
    getSectionPolicy,
    isMultiNode,
    isMixed
  })

  const edgeActions = createDiagramPropertyEdgeActions({
    dispatch,
    getSelection,
    isMultiEdge
  })

  const assetActions = createDiagramPropertyAssetActions({
    bus,
    dispatch,
    getSelectedNode,
    getFileId: deps.getFileId,
    imageBusy: deps.imageBusy,
    toast: deps.toast
  })

  function patchDefaultEdge(patch: Record<string, unknown>) {
    dispatch.patchCanvas({
      defaultEdge: { ...getCanvas().defaultEdge, ...patch }
    })
  }

  return {
    isMixed,
    parseNumber,
    patchCanvas: dispatch.patchCanvas,
    patchDefaultEdge,
    ...nodeActions,
    ...edgeActions,
    ...assetActions
  }
}
