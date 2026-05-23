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
  <div
    class="pointer-events-auto flex items-center gap-2 rounded-full bg-black/35 px-3 py-2 backdrop-blur-md"
    role="toolbar"
    aria-label="车身颜色"
  >
    <button
      v-for="c in PRESETS"
      :key="c"
      type="button"
      class="h-8 w-8 rounded-full border-2 transition-transform hover:scale-110"
      :class="props.modelValue === c ? 'border-white' : 'border-white/30'"
      :style="{ backgroundColor: c }"
      :aria-label="`颜色 ${c}`"
      @click="select(c)"
    />
  </div>
</template>
