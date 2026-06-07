<script setup lang="ts">
import WwIconButton from '@shared/components/WwIconButton.vue'
import type { WwIconName } from '@shared/icons/registry'

defineProps<{
  side: 'left' | 'right'
  icon: string
  label: string
}>()

const emit = defineEmits<{ click: [] }>()
</script>

<template>
  <WwIconButton
    :icon="icon as WwIconName"
    icon-size="sm"
    class="dg-panel-restore ww-glass-blur"
    :class="side === 'left' ? 'dg-panel-restore--left' : 'dg-panel-restore--right'"
    :aria-label="label"
    compact
    @click="emit('click')"
  />
</template>
