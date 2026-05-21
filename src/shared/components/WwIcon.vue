<script setup lang="ts">
import { computed } from 'vue'
import { wwIcons, WW_ICON_STROKE, type WwIconName } from '@shared/icons/registry'

const props = withDefaults(
  defineProps<{
    name: WwIconName | string
    size?: 'xs' | 'sm' | 'md' | 'lg' | number
    strokeWidth?: number
    spin?: boolean
    filled?: boolean
  }>(),
  {
    size: 'md',
    strokeWidth: WW_ICON_STROKE,
    spin: false,
    filled: false
  }
)

const fillValue = computed(() => (props.filled ? 'currentColor' : 'none'))

const sizePx = computed(() => {
  if (typeof props.size === 'number') return props.size
  const map = { xs: 14, sm: 16, md: 18, lg: 20 } as const
  return map[props.size]
})

const icon = computed(() => wwIcons[props.name as WwIconName])
const isCustomSvg = computed(() => !icon.value)
const svgPath = computed(() => `/icons/${props.name}.svg`)
</script>

<template>
  <template v-if="icon">
    <component
      :is="icon"
      class="ww-icon"
      :class="{ 'ww-icon--spin': spin }"
      :size="sizePx"
      :stroke-width="strokeWidth"
      :fill="fillValue"
      :absolute-stroke-width="true"
      aria-hidden="true"
    />
  </template>
  <template v-else>
    <img
      :src="svgPath"
      :width="sizePx"
      :height="sizePx"
      class="ww-icon"
      :class="{ 'ww-icon--spin': spin }"
      aria-hidden="true"
    />
  </template>
</template>
