import { computed, shallowRef, watch, type Ref } from 'vue'
import { provideDiagramPropertyContext } from '@modules/library/diagrams/composables/useDiagramPropertyContext'
import type { DiagramDocumentMutationCommands } from '@modules/library/diagrams/composables/useDiagramCanvasCommands'
import { useDiagramPropertyPanelTab } from '@modules/library/diagrams/composables/useDiagramPropertyPanelTab'
import { useDiagramEditorSelection } from '@modules/library/diagrams/composables/useDiagramEditorSelection'
import {
  buildPropertyContext,
  getDiagramPropertySectionRegistry,
  propertyPanelScopeKey,
  sectionResolveKey,
  type DiagramPropertyContext,
  type DiagramPropertyTab,
  type ResolvedPropertySection
} from '@modules/library/diagrams/domain/property-panel'
import {
  effectiveEdgeCount,
  effectiveNodeCount,
  selectionScopeKey
} from '@modules/library/diagrams/lib/diagramSelectionSnapshot'
import type { DiagramEditorSelection } from '@modules/library/diagrams/lib/diagramSelectionTypes'

export interface DiagramPropertySectionsApi {
  readonly activeTab: Ref<DiagramPropertyTab>
  readonly selection: Ref<DiagramEditorSelection>
  readonly propertyContext: Ref<DiagramPropertyContext>
  readonly resolvedSections: Ref<ResolvedPropertySection[]>
  readonly sectionsScopeKey: Ref<string>
  readonly selectionBanner: Ref<string>
  readonly showNodeEmpty: Ref<boolean>
  readonly showEdgeEmpty: Ref<boolean>
}

/**
 * 属性面板区块解析与选区联动。
 * 组合根在 DiagramPropertyPanel 调用；各 Section 通过 useDiagramPropertySectionView 读快照、useDiagramPropertyContext 写属性。
 */
export function useDiagramPropertySections(
  fileId: Ref<string | null>,
  canvasCommands: DiagramDocumentMutationCommands
): DiagramPropertySectionsApi {
  const selectionApi = useDiagramEditorSelection()
  const selection = selectionApi.selection
  const activeTab = useDiagramPropertyPanelTab(selection)
  const registry = getDiagramPropertySectionRegistry()

  provideDiagramPropertyContext(fileId, activeTab, canvasCommands)

  const selectionScope = computed(() => selectionScopeKey(selection.value))

  const propertyContext = computed(() =>
    buildPropertyContext(activeTab.value, selection.value, fileId.value)
  )

  const sectionListKey = computed(() =>
    sectionResolveKey(activeTab.value, selection.value)
  )

  const resolvedSections = shallowRef<ResolvedPropertySection[]>([])

  watch(
    sectionListKey,
    () => {
      resolvedSections.value = registry.resolve(activeTab.value, propertyContext.value)
    },
    { immediate: true }
  )

  const sectionsScopeKey = computed(() =>
    propertyPanelScopeKey(activeTab.value, selectionScope.value)
  )

  const selectionBanner = computed(() => {
    const nc = effectiveNodeCount(selection.value)
    const ec = effectiveEdgeCount(selection.value)
    if (nc > 0 && ec > 0) return `${nc} 图元 · ${ec} 连线`
    if (nc > 1) return `${nc} 图元`
    if (ec > 1) return `${ec} 连线`
    return ''
  })

  const showNodeEmpty = computed(
    () => activeTab.value === 'node' && selection.value.selectedNodeCount === 0
  )
  const showEdgeEmpty = computed(
    () => activeTab.value === 'edge' && selection.value.selectedEdgeCount === 0
  )

  return {
    activeTab,
    selection,
    propertyContext,
    resolvedSections,
    sectionsScopeKey,
    selectionBanner,
    showNodeEmpty,
    showEdgeEmpty
  }
}
