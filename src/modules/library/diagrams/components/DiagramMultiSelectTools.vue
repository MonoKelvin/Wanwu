<script setup lang="ts">
import WwIconButton from '@shared/components/WwIconButton.vue'
import { computed } from 'vue'
import { useDiagramCommandBus } from '@modules/library/diagrams/composables/useDiagramCommandBus'
import { DG_SHORTCUT } from '@modules/library/diagrams/lib/diagramKeyboardShortcuts'

const props = defineProps<{
  nodeCount: number
  edgeCount: number
  canGroup: boolean
  canUngroup: boolean
}>()

const bus = useDiagramCommandBus()

const showSection = computed(
  () => props.nodeCount + props.edgeCount > 1 || props.canGroup || props.canUngroup
)

const groupEnabled = computed(
  () => props.canGroup || props.nodeCount + props.edgeCount >= 2
)

const ungroupEnabled = computed(() => props.canUngroup)

function group() {
  void bus.dispatch({ type: 'canvas.group' })
}

function ungroup() {
  void bus.dispatch({ type: 'canvas.ungroup' })
}
</script>

<template>
  <div v-if="showSection" class="dg-multi-tools">
    <WwIconButton
      icon="layers"
      compact
      ariaLabel="组合"
      :disabled="!groupEnabled"
      v-tooltip.bottom="`组合 (${DG_SHORTCUT.group})`"
      @mousedown.prevent
      @click="group"
    />
    <WwIconButton
      icon="ungroup"
      compact
      ariaLabel="取消组合"
      :disabled="!ungroupEnabled"
      v-tooltip.bottom="`取消组合 (${DG_SHORTCUT.ungroup})`"
      @mousedown.prevent
      @click="ungroup"
    />
  </div>
</template>
