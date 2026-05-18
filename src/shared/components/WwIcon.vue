<script setup lang="ts">
import { computed } from 'vue'
import { wwIcons, WW_ICON_STROKE, type WwIconName } from '@shared/icons/registry'

const props = withDefaults(
  defineProps<{
    name: WwIconName
    size?: 'xs' | 'sm' | 'md' | 'lg' | number
    strokeWidth?: number
    spin?: boolean
  }>(),
  {
    size: 'md',
    strokeWidth: WW_ICON_STROKE,
    spin: false
  }
)

const sizePx = computed(() => {
  if (typeof props.size === 'number') return props.size
  const map = { xs: 14, sm: 16, md: 18, lg: 20 } as const
  return map[props.size]
})

const icon = computed(() => wwIcons[props.name])
</script>

<template>
  <component
    :is="icon"
    class="ww-icon"
    :class="{ 'ww-icon--spin': spin }"
    :size="sizePx"
    :stroke-width="strokeWidth"
    :absolute-stroke-width="true"
    aria-hidden="true"
  />
</template>
