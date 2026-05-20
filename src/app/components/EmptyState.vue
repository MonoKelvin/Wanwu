<script setup lang="ts">
import { computed } from 'vue'
import emptyCollectionRaw from '@assets/icons/empty-collection.svg?raw'
import emptyGuideRaw from '@assets/icons/empty-guide.svg?raw'
import emptyNotFoundRaw from '@assets/icons/empty-not-found.svg?raw'
import emptyRssRaw from '@assets/icons/empty-rss.svg?raw'

const props = withDefaults(
  defineProps<{
    variant?: 'empty' | 'guide' | 'rss' | 'not-found'
    title: string
    description?: string
    code?: string
    compact?: boolean
  }>(),
  { variant: 'empty', compact: false }
)

const illustrationRaw = computed(() => {
  switch (props.variant) {
    case 'guide':
      return emptyGuideRaw
    case 'rss':
      return emptyRssRaw
    case 'not-found':
      return emptyNotFoundRaw
    default:
      return emptyCollectionRaw
  }
})
</script>

<template>
  <div class="ww-empty-state" :class="{ 'ww-empty-state--compact': compact }" role="status">
    <div class="ww-empty-state__glow ww-empty-state__glow--a" aria-hidden="true" />
    <div class="ww-empty-state__glow ww-empty-state__glow--b" aria-hidden="true" />

    <div class="ww-empty-state__card">
      <p v-if="code" class="ww-empty-state__code">{{ code }}</p>
      <div class="ww-empty-state__img" v-html="illustrationRaw" />
      <h3 class="ww-empty-state__title">{{ title }}</h3>
      <p v-if="description" class="ww-empty-state__desc">{{ description }}</p>
      <div v-if="$slots.default" class="ww-empty-state__actions">
        <slot />
      </div>
    </div>
  </div>
</template>
