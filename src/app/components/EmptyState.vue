<script setup lang="ts">
import { computed } from 'vue'
import emptyGhost from '@assets/icons/empty-ghost.svg'
import emptyLibrary from '@assets/icons/empty-library.svg'
import emptyNotFound from '@assets/icons/empty-not-found.svg'
import emptyRss from '@assets/icons/empty-rss.svg'

const props = withDefaults(
  defineProps<{
    variant?: 'empty' | 'ghost' | 'rss' | 'not-found'
    title: string
    description?: string
    code?: string
    compact?: boolean
  }>(),
  { variant: 'empty', compact: false }
)

const EMPTY_ART: Record<typeof props.variant, string> = {
  empty: emptyLibrary,
  ghost: emptyGhost,
  rss: emptyRss,
  'not-found': emptyNotFound
}

const artSrc = computed(() => EMPTY_ART[props.variant])
</script>

<template>
  <div class="ww-empty-state" :class="{ 'ww-empty-state--compact': compact }" role="status">
    <div class="ww-empty-state__glow ww-empty-state__glow--a" aria-hidden="true" />
    <div class="ww-empty-state__glow ww-empty-state__glow--b" aria-hidden="true" />

    <div class="ww-empty-state__card">
      <div class="ww-empty-state__content">
        <p v-if="compact && code" class="ww-empty-state__code">{{ code }}</p>
        <div class="ww-empty-state__img" aria-hidden="true">
          <img class="ww-empty-state__art" :src="artSrc" alt="" />
        </div>
        <h3 class="ww-empty-state__title">{{ title }}</h3>
        <p v-if="description" class="ww-empty-state__desc">{{ description }}</p>
      </div>
      <div v-if="$slots.default" class="ww-empty-state__actions">
        <slot />
      </div>
    </div>
  </div>
</template>
