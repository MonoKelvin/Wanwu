import { computed, inject, provide, ref, type ComputedRef, type InjectionKey, type Ref } from 'vue'
import { createDiagramPropertyActions } from '@modules/library/diagrams/app/diagramPropertyActions'
import { useDiagramCommandBus } from '@modules/library/diagrams/composables/useDiagramCommandBus'
import { useDiagramEditorSelection } from '@modules/library/diagrams/composables/useDiagramEditorSelection'
import { buildPropertyContext } from '@modules/library/diagrams/domain/property-panel/buildPropertyContext'
import type {
  DiagramPropertyActions,
  DiagramPropertyContext,
  DiagramPropertyTab
} from '@modules/library/diagrams/domain/property-panel/types'
import type { DiagramCanvasSettings } from '@modules/library/diagrams/lib/diagramSelectionTypes'
import {
  effectiveEdgeCount,
  effectiveNodeCount
} from '@modules/library/diagrams/lib/diagramSelectionSnapshot'
import { useWanwuToast } from '@shared/composables/useWanwuToast'

export type { DiagramPropertyActions }

export interface DiagramPropertyContextApi {
  readonly ctx: ComputedRef<DiagramPropertyContext>
  readonly canvas: ComputedRef<DiagramCanvasSettings>
  readonly imageBusy: Readonly<Ref<boolean>>
  readonly actions: DiagramPropertyActions
}

const propertyContextKey = Symbol('diagramPropertyContext') as InjectionKey<DiagramPropertyContextApi>

export function provideDiagramPropertyContext(
  fileId: Ref<string | null> | ComputedRef<string | null>,
  activeTab: Ref<DiagramPropertyTab>
): DiagramPropertyContextApi {
  const { selection } = useDiagramEditorSelection()
  const bus = useDiagramCommandBus()
  const toast = useWanwuToast()
  const imageBusy = ref(false)

  const ctx = computed(() =>
    buildPropertyContext(activeTab.value, selection.value, fileId.value)
  )

  const canvas = computed(() => selection.value.canvas)

  const actions = createDiagramPropertyActions({
    bus,
    getSelection: () => selection.value,
    getSelectedNode: () => ctx.value.selectedNode,
    getSectionPolicy: () => ctx.value.sectionPolicy,
    getCanvas: () => canvas.value,
    isMultiNode: () => effectiveNodeCount(selection.value) > 1,
    isMultiEdge: () => effectiveEdgeCount(selection.value) > 1,
    getFileId: () => fileId.value,
    imageBusy,
    toast
  })

  const api: DiagramPropertyContextApi = {
    ctx,
    canvas,
    imageBusy,
    actions
  }

  provide(propertyContextKey, api)
  return api
}

export function useDiagramPropertyContext(): DiagramPropertyContextApi {
  const api = inject(propertyContextKey)
  if (!api) {
    throw new Error('useDiagramPropertyContext 需在 provideDiagramPropertyContext 之后使用')
  }
  return api
}
