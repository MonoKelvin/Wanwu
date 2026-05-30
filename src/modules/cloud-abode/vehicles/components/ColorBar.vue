<script setup lang="ts">
const PRESETS = [
  '#c0c0c0',
  '#1a1a1a',
  '#8b1e2f',
  '#1e3a5f',
  '#f5f5f5',
  '#2d5016',
  '#d4af37',
  '#5c4033'
] as const

const props = defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

function select(color: string) {
  emit('update:modelValue', color)
}
</script>

<template>
  <div class="ww-showroom-colorbar" role="toolbar" aria-label="车身颜色">
    <button
      v-for="c in PRESETS"
      :key="c"
      type="button"
      class="ww-showroom-colorbar__swatch"
      :class="{ 'ww-showroom-colorbar__swatch--active': props.modelValue === c }"
      :style="{ backgroundColor: c }"
      :aria-label="`颜色 ${c}`"
      @click="select(c)"
    />
  </div>
</template>
