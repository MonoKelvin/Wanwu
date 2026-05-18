<script setup lang="ts">
import ImageViewer from '@shared/components/ImageViewer.vue'
import type { ImageViewerSlide } from '@shared/types/image-viewer'

/** @deprecated 请优先使用 @shared/components/ImageViewer */
export type LightboxSlide = ImageViewerSlide

const props = defineProps<{
  open: boolean
  slides: ImageViewerSlide[]
  index: number
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'update:index': [value: number]
}>()
</script>

<template>
  <ImageViewer
    :open="props.open"
    :slides="props.slides"
    :index="props.index"
    @update:open="emit('update:open', $event)"
    @update:index="emit('update:index', $event)"
  />
</template>
