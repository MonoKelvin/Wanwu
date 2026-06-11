<script setup lang="ts">
import { toRef } from 'vue'
import WwIcon from '@shared/components/WwIcon.vue'
import WwIconButton from '@shared/components/WwIconButton.vue'
import { registerDiagramPropertyPanel } from '@modules/library/diagrams/app/diagramPropertyPanelBootstrap'
import { useDiagramPropertySections } from '@modules/library/diagrams/composables/useDiagramPropertySections'
import DiagramPropertySectionsHost from '@modules/library/diagrams/components/property-panel/DiagramPropertySectionsHost.vue'
import {
  togglePropsPanelCollapsed,
  useDiagramEditorLayout
} from '@modules/library/diagrams/composables/useDiagramEditorLayout'

registerDiagramPropertyPanel()

const props = defineProps<{
  fileId: string | null
}>()

const layout = useDiagramEditorLayout()
const {
  activeTab,
  selection,
  resolvedSections,
  sectionsScopeKey,
  selectionBanner,
  showNodeEmpty,
  showEdgeEmpty
} = useDiagramPropertySections(toRef(props, 'fileId'))
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
