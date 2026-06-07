<script setup lang="ts">
import WwButton from '@shared/components/WwButton.vue'
import { computed } from 'vue'
import { useDiagramCommandBus } from '@modules/library/diagrams/composables/useDiagramCommandBus'

const props = defineProps<{
  nodeCount: number
  edgeCount: number
  canUngroup: boolean
}>()

const bus = useDiagramCommandBus()

const canGroup = computed(() => props.nodeCount + props.edgeCount >= 2)

function group() {
  void bus.dispatch({ type: 'canvas.group' })
}

function ungroup() {
  void bus.dispatch({ type: 'canvas.ungroup' })
}

function duplicate() {
  void bus.dispatch({ type: 'canvas.duplicate' })
}
</script>

<template>
  <section v-if="canGroup || canUngroup" class="dg-prop-section dg-prop-group">
    <p class="dg-prop-section__title">多选操作</p>
    <p v-if="nodeCount >= 2" class="dg-prop-multi-hint">对齐与分布请使用画布顶栏</p>
    <div class="dg-multi-tools__actions">
      <WwButton
        v-if="canGroup && !canUngroup"
        label="组合"
        icon="layers"
        size="small"
        severity="secondary"
        @click="group"
      />
      <WwButton
        v-if="canUngroup"
        label="取消组合"
        icon="layers"
        size="small"
        severity="secondary"
        @click="ungroup"
      />
      <WwButton
        v-if="nodeCount > 0"
        label="创建副本"
        icon="copy"
        size="small"
        severity="secondary"
        @click="duplicate"
      />
    </div>
  </section>
</template>
