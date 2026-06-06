<script setup lang="ts">
import WwIconButton from '@shared/components/WwIconButton.vue'
import type { WwIconName } from '@shared/icons/registry'
import { useDiagramCommandBus } from '@modules/library/diagrams/composables/useDiagramCommandBus'
import type { DiagramAlignMode, DiagramDistributeMode } from '@modules/library/diagrams/lib/diagramNodeLayout'

defineProps<{
  nodeCount: number
}>()

const bus = useDiagramCommandBus()

const alignActions: Array<{ mode: DiagramAlignMode; icon: WwIconName; label: string }> = [
  { mode: 'left', icon: 'layout-panel-left', label: '左对齐' },
  { mode: 'center-h', icon: 'columns-2', label: '水平居中' },
  { mode: 'right', icon: 'arrow-right', label: '右对齐' },
  { mode: 'top', icon: 'arrow-up-to-line', label: '顶对齐' },
  { mode: 'center-v', icon: 'rows', label: '垂直居中' },
  { mode: 'bottom', icon: 'arrow-down-from-line', label: '底对齐' }
]

const distributeActions: Array<{ mode: DiagramDistributeMode; icon: WwIconName; label: string }> = [
  { mode: 'horizontal', icon: 'sliders-horizontal', label: '水平分布' },
  { mode: 'vertical', icon: 'gallery-vertical', label: '垂直分布' }
]

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
      v-for="action in alignActions.slice(0, 3)"
      :key="action.mode"
      :icon="action.icon"
      icon-size="xs"
      compact
      :ariaLabel="action.label"
      v-tooltip.bottom="action.label"
      class="dg-align-bar__btn dg-toolbar-icon-btn"
      @click="align(action.mode)"
    />
    <span class="dg-align-bar__sep" aria-hidden="true" />
    <WwIconButton
      v-for="action in alignActions.slice(3)"
      :key="action.mode"
      :icon="action.icon"
      icon-size="xs"
      compact
      :ariaLabel="action.label"
      v-tooltip.bottom="action.label"
      class="dg-align-bar__btn dg-toolbar-icon-btn"
      @click="align(action.mode)"
    />
    <template v-if="nodeCount >= 3">
      <span class="dg-align-bar__sep" aria-hidden="true" />
      <WwIconButton
        v-for="action in distributeActions"
        :key="action.mode"
        :icon="action.icon"
        icon-size="xs"
        compact
        :ariaLabel="action.label"
        v-tooltip.bottom="action.label"
        class="dg-align-bar__btn dg-toolbar-icon-btn"
        @click="distribute(action.mode)"
      />
    </template>
  </div>
</template>
