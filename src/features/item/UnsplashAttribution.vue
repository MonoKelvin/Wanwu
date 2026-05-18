<script setup lang="ts">
import { computed } from 'vue'
import { isMediaAttribution, mediaAttributionSource } from '@shared/utils/unsplashAttribution'
import type { MediaAttribution } from '@shared/types/unsplash'

const props = withDefaults(
  defineProps<{
    attribution?: MediaAttribution | null
    compact?: boolean
  }>(),
  { compact: false }
)

const show = computed(() => isMediaAttribution(props.attribution))

const source = computed(() => mediaAttributionSource(props.attribution))

const brandLabel = computed(() => (source.value === 'pixabay' ? 'Pixabay' : 'Unsplash'))

const creditPrefix = computed(() => {
  if (props.compact) return 'by'
  return source.value === 'pixabay' ? 'Image by' : 'Photo by'
})
</script>

<template>
  <p
    v-if="show"
    class="ww-unsplash-attribution"
    :class="compact ? 'ww-unsplash-attribution--compact' : ''"
  >
    <span class="ww-unsplash-attribution__label">{{ creditPrefix }}</span>
    <a
      :href="attribution!.photographerProfileUrl"
      target="_blank"
      rel="noopener noreferrer"
      class="ww-unsplash-attribution__link"
    >
      {{ attribution!.photographerName }}
    </a>
    <span class="ww-unsplash-attribution__label">on</span>
    <a
      :href="attribution!.photoPageUrl"
      target="_blank"
      rel="noopener noreferrer"
      class="ww-unsplash-attribution__link ww-unsplash-attribution__link--brand"
    >
      {{ brandLabel }}
    </a>
  </p>
</template>
