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

<style>
.ww-unsplash-attribution {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0 0.25em;
  margin: 0;
  font-size: 0.6875rem;
  line-height: 1.45;
  color: var(--ww-ink-muted);
}

.ww-unsplash-attribution--compact {
  font-size: 0.625rem;
  line-height: 1.35;
}

.ww-unsplash-attribution__link {
  color: var(--ww-ink);
  font-weight: 500;
  text-decoration: none;
}

.ww-unsplash-attribution__link:hover {
  color: var(--ww-accent);
  text-decoration: underline;
}

.ww-unsplash-attribution__link--brand {
  font-weight: 600;
}
</style>
