<script setup lang="ts">
import { ref, watch } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import WwIcon from '@shared/components/WwIcon.vue'
import { useDiagramCommandBus } from '@modules/library/diagrams/composables/useDiagramCommandBus'

const props = defineProps<{
  selectedNodeId: string | null
  selectedText: string
}>()

const bus = useDiagramCommandBus()
const text = ref(props.selectedText)

watch(
  () => props.selectedText,
  (v) => {
    text.value = v
  }
)

const pushUpdate = useDebounceFn((nodeId: string, value: string) => {
  void bus.dispatch({
    type: 'canvas.updateNode',
    payload: { nodeId, patch: { text: value } }
  })
}, 300)

watch(text, (v) => {
  if (props.selectedNodeId) pushUpdate(props.selectedNodeId, v)
})
</script>

<template>
  <aside class="dg-panel dg-panel--stacked ww-glass-blur" aria-label="属性">
    <p class="dg-section-label">属性</p>
    <template v-if="selectedNodeId">
      <label class="dg-field-label">
        文本
        <input v-model="text" type="text" class="dg-field-input" placeholder="图元文本" />
      </label>
    </template>
    <div v-else class="dg-panel__empty">
      <WwIcon name="square" size="sm" class="opacity-30" />
      <p class="dg-hint">选中图元以编辑</p>
    </div>
  </aside>
</template>
