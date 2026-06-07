<script setup lang="ts">
import WwIconButton from '@shared/components/WwIconButton.vue'
import { useDiagramCommandBus } from '@modules/library/diagrams/composables/useDiagramCommandBus'
import {
  DIAGRAM_ALIGN_ACTIONS,
  DIAGRAM_DISTRIBUTE_ACTIONS
} from '@modules/library/diagrams/lib/diagramAlignActions'
import type { DiagramAlignMode, DiagramDistributeMode } from '@modules/library/diagrams/lib/diagramNodeLayout'

defineProps<{
  nodeCount: number
}>()

const bus = useDiagramCommandBus()

function align(mode: DiagramAlignMode) {
  void bus.dispatch({ type: 'canvas.alignNodes', payload: { mode } })
}

function distribute(mode: DiagramDistributeMode) {
  void bus.dispatch({ type: 'canvas.distributeNodes', payload: { mode } })
}
</script>

<template>
  <div
    v-if="nodeCount >= 2"
    class="dg-align-bar dg-float ww-glass-blur"
    role="toolbar"
    aria-label="对齐与分布"
  >
    <span class="dg-align-bar__label">{{ nodeCount }} 选</span>
    <WwIconButton
      v-for="action in DIAGRAM_ALIGN_ACTIONS.slice(0, 3)"
      :key="action.mode"
      :icon="action.icon"
      icon-size="xs"
      compact
      :aria-label="action.label"
      v-tooltip.bottom="action.label"
      class="dg-align-bar__btn dg-toolbar-icon-btn"
      @click="align(action.mode)"
    />
    <span class="dg-align-bar__sep" aria-hidden="true" />
    <WwIconButton
      v-for="action in DIAGRAM_ALIGN_ACTIONS.slice(3)"
      :key="action.mode"
      :icon="action.icon"
      icon-size="xs"
      compact
      :aria-label="action.label"
      v-tooltip.bottom="action.label"
      class="dg-align-bar__btn dg-toolbar-icon-btn"
      @click="align(action.mode)"
    />
    <template v-if="nodeCount >= 3">
      <span class="dg-align-bar__sep" aria-hidden="true" />
      <WwIconButton
        v-for="action in DIAGRAM_DISTRIBUTE_ACTIONS"
        :key="action.mode"
        :icon="action.icon"
        icon-size="xs"
        compact
        :aria-label="action.label"
        v-tooltip.bottom="action.label"
        class="dg-align-bar__btn dg-toolbar-icon-btn"
        @click="distribute(action.mode)"
      />
    </template>
  </div>
</template>
