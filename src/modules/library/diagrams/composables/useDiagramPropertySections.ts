import { computed, ref, watch, type Ref } from 'vue'
import { provideDiagramPropertyContext } from '@modules/library/diagrams/composables/useDiagramPropertyContext'
import { useDiagramEditorSelection } from '@modules/library/diagrams/composables/useDiagramEditorSelection'
import {
  buildPropertyContext,
  getDiagramPropertySectionRegistry,
  propertyPanelScopeKey,
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
  readonly resolvedSections: Ref<ResolvedPropertySection[]>
  readonly sectionsScopeKey: Ref<string>
  readonly selectionBanner: Ref<string>
  readonly showNodeEmpty: Ref<boolean>
  readonly showEdgeEmpty: Ref<boolean>
}

/**
 * 属性面板区块解析与选区联动。
 * 组合根在 DiagramPropertyPanel 调用；各 Section 通过 useDiagramPropertyContext 读写属性。
 */
export function useDiagramPropertySections(fileId: Ref<string | null>): DiagramPropertySectionsApi {
  const selectionApi = useDiagramEditorSelection()
  const selection = selectionApi.selection
  const selectionRevision = selectionApi.revision
  const activeTab = ref<DiagramPropertyTab>('canvas')
  const registry = getDiagramPropertySectionRegistry()

  provideDiagramPropertyContext(fileId, activeTab)

  const selectionScope = computed(() => selectionScopeKey(selection.value))

  watch(
    selectionScope,
    () => {
      const sel = selection.value
      const nodeCount = effectiveNodeCount(sel)
      const edgeCount = effectiveEdgeCount(sel)
      const total = nodeCount + edgeCount
      if (sel.kind === 'canvas' || total === 0) {
        activeTab.value = 'canvas'
        return
      }
      if (edgeCount > 0 && nodeCount === 0) {
        activeTab.value = 'edge'
        return
      }
      if (nodeCount > 0) {
        activeTab.value = 'node'
      }
    },
    { immediate: true }
  )

  const propertyContext = computed(() =>
    buildPropertyContext(activeTab.value, selection.value, fileId.value)
  )

  const resolvedSections = computed(() =>
    registry.resolve(activeTab.value, propertyContext.value)
  )

  const sectionsScopeKey = computed(() =>
    propertyPanelScopeKey(activeTab.value, selectionRevision.value, selectionScope.value)
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
    resolvedSections,
    sectionsScopeKey,
    selectionBanner,
    showNodeEmpty,
    showEdgeEmpty
  }
}
