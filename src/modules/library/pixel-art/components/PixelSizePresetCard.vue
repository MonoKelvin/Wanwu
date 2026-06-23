<script setup lang="ts">
import { computed } from 'vue'
import WwIcon from '@shared/components/WwIcon.vue'
import {
  computePreviewFramePercent,
  formatCanvasSizeLabel,
  formatMappingCaption
} from '@modules/library/pixel-art/lib/pixelDisplayMapping'

const props = defineProps<{
  width?: number
  height?: number
  custom?: boolean
  caption?: string
}>()

defineEmits<{ click: [] }>()

const isCustom = computed(() => props.custom === true)

const innerLabel = computed(() => {
  if (isCustom.value) return '自定义'
  if (props.width != null && props.height != null) return formatCanvasSizeLabel(props.width, props.height)
  return ''
})

const bottomCaption = computed(() => {
  if (props.caption) return props.caption
  if (isCustom.value) return '任意尺寸'
  if (props.width != null && props.height != null) return formatMappingCaption(props.width, props.height)
  return ''
})

const frameStyle = computed(() => {
  if (isCustom.value || props.width == null || props.height == null) return null
  const size = computePreviewFramePercent(props.width, props.height)
  return {
    width: size.width,
    height: size.height
  }
})
</script>

<template>
  <button type="button" class="pa-type-card" @click="$emit('click')">
    <span class="pa-type-card__art" aria-hidden="true">
      <span v-if="isCustom" class="pa-type-card__custom-icon">
        <WwIcon name="plus" size="md" />
      </span>
      <span v-else class="pa-type-card__frame" :style="frameStyle ?? undefined">
        <span class="pa-type-card__frame-label">{{ innerLabel }}</span>
      </span>
    </span>
    <span class="pa-type-card__caption">{{ bottomCaption }}</span>
  </button>
</template>
