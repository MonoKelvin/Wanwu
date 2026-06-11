<script setup lang="ts">
import { computed, ref, toRef, watch } from 'vue'
import WwIcon from '@shared/components/WwIcon.vue'
import WwIconButton from '@shared/components/WwIconButton.vue'
import { registerDiagramPropertyPanel } from '@modules/library/diagrams/app/diagramPropertyPanelBootstrap'
import { provideDiagramPropertyContext } from '@modules/library/diagrams/composables/useDiagramPropertyContext'
import { useDiagramEditorSelection } from '@modules/library/diagrams/composables/useDiagramEditorSelection'
import {
  buildPropertyContext,
  getDiagramPropertySectionRegistry,
  type DiagramPropertyTab
} from '@modules/library/diagrams/domain/property-panel'
import DiagramPropertySectionsHost from '@modules/library/diagrams/components/property-panel/DiagramPropertySectionsHost.vue'
import {
  effectiveEdgeCount,
  effectiveNodeCount,
  selectionScopeKey
} from '@modules/library/diagrams/lib/diagramSelectionSnapshot'
import {
  togglePropsPanelCollapsed,
  useDiagramEditorLayout
} from '@modules/library/diagrams/composables/useDiagramEditorLayout'

registerDiagramPropertyPanel()

const props = defineProps<{
  fileId: string | null
}>()

const { selection } = useDiagramEditorSelection()
const activeTab = ref<DiagramPropertyTab>('canvas')
const layout = useDiagramEditorLayout()
const registry = getDiagramPropertySectionRegistry()

provideDiagramPropertyContext(toRef(props, 'fileId'), activeTab)

watch(
  selection,
  (sel) => {
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
  { immediate: true, deep: true }
)

const propertyContext = computed(() =>
  buildPropertyContext(activeTab.value, selection.value, props.fileId)
)

const resolvedSections = computed(() =>
  registry.resolve(activeTab.value, propertyContext.value)
)

/** 选区结构变化时重挂载 Section，避免 UML 扩展块叠加与 PrimeVue 控件滞留旧值 */
const sectionsScopeKey = computed(
  () => `${activeTab.value}|${selectionScopeKey(selection.value)}`
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
</script>

<template>
  <aside
    class="dg-panel dg-panel--stacked dg-panel--props dg-float dg-float--right ww-glass-blur"
    aria-label="属性"
  >
    <header class="dg-panel__head">
      <WwIcon name="sliders-horizontal" size="sm" class="dg-panel__head-icon" />
      <span class="dg-panel__head-title">属性</span>
      <WwIconButton
        icon="chevron-right"
        icon-size="sm"
        class="dg-panel__collapse-btn"
        aria-label="收起属性面板"
        compact
        @click="togglePropsPanelCollapsed(layout)"
      />
    </header>
    <div class="dg-panel-tabs" role="tablist">
      <button
        type="button"
        role="tab"
        class="dg-panel-tab"
        :class="{ 'dg-panel-tab--active': activeTab === 'node' }"
        :aria-selected="activeTab === 'node'"
        :disabled="selection.selectedNodeCount === 0"
        @click="activeTab = 'node'"
      >
        图元
      </button>
      <button
        type="button"
        role="tab"
        class="dg-panel-tab"
        :class="{ 'dg-panel-tab--active': activeTab === 'edge' }"
        :aria-selected="activeTab === 'edge'"
        :disabled="selection.selectedEdgeCount === 0"
        @click="activeTab = 'edge'"
      >
        连线
      </button>
      <button
        type="button"
        role="tab"
        class="dg-panel-tab"
        :class="{ 'dg-panel-tab--active': activeTab === 'canvas' }"
        :aria-selected="activeTab === 'canvas'"
        @click="activeTab = 'canvas'"
      >
        画布
      </button>
    </div>

    <div class="dg-panel__body ww-scroll-main">
      <p v-if="selectionBanner" class="dg-prop-selection-banner">{{ selectionBanner }}</p>

      <DiagramPropertySectionsHost
        :sections="resolvedSections"
        :scope-key="sectionsScopeKey"
      />

      <div v-if="showNodeEmpty" class="dg-panel__empty">
        <WwIcon name="square" size="sm" class="opacity-30" />
        <p class="dg-hint">选中图元以编辑属性</p>
      </div>

      <div v-else-if="showEdgeEmpty" class="dg-panel__empty">
        <WwIcon name="link" size="sm" class="opacity-30" />
        <p class="dg-hint">选中连线以编辑样式</p>
      </div>
    </div>
  </aside>
</template>
