<script setup lang="ts">
import { computed } from 'vue'
import WwIcon from '@shared/components/WwIcon.vue'

const props = defineProps<{
  size: number | 'custom'
  label: string
  hint?: string
}>()

defineEmits<{ click: [] }>()

const gridStyle = computed(() => {
  if (props.size === 'custom') return null
  const n = Math.min(props.size, 16)
  return {
    gridTemplateColumns: `repeat(${n}, 1fr)`,
    gridTemplateRows: `repeat(${n}, 1fr)`
  }
})

const gridCells = computed(() => {
  if (props.size === 'custom') return 0
  const n = Math.min(props.size, 16)
  return n * n
})
</script>

<template>
  <button type="button" class="pa-type-card" @click="$emit('click')">
    <span class="pa-type-card__art" aria-hidden="true">
      <span v-if="size === 'custom'" class="pa-type-card__custom-icon">
        <WwIcon name="plus" size="md" />
      </span>
      <span
        v-else
        class="pa-type-card__grid"
        :style="gridStyle ?? undefined"
      >
        <span v-for="i in gridCells" :key="i" class="pa-type-card__cell" />
      </span>
    </span>
    <span class="pa-type-card__name">{{ label }}</span>
    <span v-if="hint" class="pa-type-card__hint">{{ hint }}</span>
  </button>
</template>
