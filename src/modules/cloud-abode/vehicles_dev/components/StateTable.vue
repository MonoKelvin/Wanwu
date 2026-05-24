<script setup lang="ts">
import {
  SHOWROOM_MODE_OPTIONS,
  type ShowroomViewMode
} from '../types/showroom'

defineProps<{
  modelValue: ShowroomViewMode
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: ShowroomViewMode]
}>()
</script>

<template>
  <nav class="ww-showroom-mode-plain" aria-label="展示模式">
    <button
      v-for="mode in SHOWROOM_MODE_OPTIONS"
      :key="mode.id"
      type="button"
      class="ww-showroom-mode-plain__item"
      :class="{ 'ww-showroom-mode-plain__item--active': modelValue === mode.id }"
      :disabled="disabled"
      @click="emit('update:modelValue', mode.id)"
    >
      {{ mode.label }}
    </button>
  </nav>
</template>
