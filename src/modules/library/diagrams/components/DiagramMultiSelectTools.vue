<script setup lang="ts">
import WwIconButton from '@shared/components/WwIconButton.vue'
import { computed } from 'vue'
import { useDiagramCommandBus } from '@modules/library/diagrams/composables/useDiagramCommandBus'

const props = defineProps<{
  nodeCount: number
  edgeCount: number
  canGroup: boolean
  canUngroup: boolean
}>()

const bus = useDiagramCommandBus()

const showSection = computed(() => props.canGroup || props.canUngroup)

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
      v-if="canGroup"
      icon="layers"
      compact
      ariaLabel="组合"
      v-tooltip.bottom="'组合'"
      @mousedown.prevent
      @click="group"
    />
    <WwIconButton
      v-if="canUngroup"
      icon="layers"
      compact
      ariaLabel="取消组合"
      v-tooltip.bottom="'取消组合'"
      @mousedown.prevent
      @click="ungroup"
    />
  </div>
</template>
