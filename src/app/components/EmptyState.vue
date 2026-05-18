<script setup lang="ts">
import { computed } from 'vue'
import emptyCollection from '@assets/empty/empty-collection.svg'
import emptyGuide from '@assets/empty/empty-guide.svg'
import emptyRss from '@assets/empty/empty-rss.svg'

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

const illustration = computed(() => {
  switch (props.variant) {
    case 'guide':
      return emptyGuide
    case 'rss':
      return emptyRss
    case 'not-found':
      return emptyCollection
    default:
      return emptyCollection
  }
})
</script>

<template>
  <div class="ww-empty-state" :class="{ 'ww-empty-state--compact': compact }" role="status">
    <div class="ww-empty-state__glow ww-empty-state__glow--a" aria-hidden="true" />
    <div class="ww-empty-state__glow ww-empty-state__glow--b" aria-hidden="true" />

    <div class="ww-empty-state__card">
      <p v-if="code" class="ww-empty-state__code">{{ code }}</p>
      <img :src="illustration" alt="" class="ww-empty-state__img" />
      <h3 class="ww-empty-state__title">{{ title }}</h3>
      <p v-if="description" class="ww-empty-state__desc">{{ description }}</p>
      <div v-if="$slots.default" class="ww-empty-state__actions">
        <slot />
      </div>
    </div>
  </div>
</template>
