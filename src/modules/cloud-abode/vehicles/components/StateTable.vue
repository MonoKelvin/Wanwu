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
  <nav
    class="pointer-events-auto flex flex-col items-end gap-3"
    aria-label="展示模式"
  >
    <button
      v-for="mode in SHOWROOM_MODE_OPTIONS"
      :key="mode.id"
      type="button"
      class="group flex items-center gap-2 text-right"
      :disabled="disabled"
      @click="emit('update:modelValue', mode.id)"
    >
      <span
        class="text-[11px] transition"
        :class="
          modelValue === mode.id
            ? 'text-white'
            : 'text-white/40 group-hover:text-white/70'
        "
      >
        {{ mode.label }}
      </span>
      <span
        class="h-2.5 w-2.5 rounded-full border transition"
        :class="
          modelValue === mode.id
            ? 'border-white bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]'
            : 'border-white/35 bg-transparent group-hover:border-white/60'
        "
      />
    </button>
  </nav>
</template>
