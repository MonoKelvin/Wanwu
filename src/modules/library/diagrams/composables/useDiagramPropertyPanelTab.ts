import { ref, watch, type Ref } from 'vue'
import type { DiagramPropertyTab } from '@modules/library/diagrams/domain/property-panel'
import type { DiagramEditorSelection } from '@modules/library/diagrams/lib/diagramSelectionTypes'
import {
  effectiveEdgeCount,
  effectiveNodeCount,
  selectionScopeKey
} from '@modules/library/diagrams/lib/diagramSelectionSnapshot'

/**
 * 属性面板 Tab 与画布选区联动：无选区→画布，仅连线→连线，有图元→图元。
 * 用户手动切换 Tab 后，选区结构变化时会再次自动对齐。
 */
export function useDiagramPropertyPanelTab(
  selection: Ref<DiagramEditorSelection>
): Ref<DiagramPropertyTab> {
  const activeTab = ref<DiagramPropertyTab>('canvas')

  watch(
    () => selectionScopeKey(selection.value),
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

  return activeTab
}
