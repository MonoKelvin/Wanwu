<script setup lang="ts">
import { computed } from 'vue'
import WwIcon from '@shared/components/WwIcon.vue'
import type { WwIconName } from '@shared/icons/registry'

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

const iconName = computed((): WwIconName => {
  switch (props.variant) {
    case 'guide':
      return 'compass'
    case 'rss':
      return 'globe'
    case 'not-found':
      return 'search'
    default:
      return 'inbox'
  }
})
</script>

<template>
  <div class="ww-empty-state" :class="{ 'ww-empty-state--compact': compact }" role="status">
    <div class="ww-empty-state__glow ww-empty-state__glow--a" aria-hidden="true" />
    <div class="ww-empty-state__glow ww-empty-state__glow--b" aria-hidden="true" />

    <div class="ww-empty-state__card">
      <p v-if="code" class="ww-empty-state__code">{{ code }}</p>
      <div class="ww-empty-state__img" aria-hidden="true">
        <WwIcon :name="iconName" class="ww-empty-state__icon" />
      </div>
      <h3 class="ww-empty-state__title">{{ title }}</h3>
      <p v-if="description" class="ww-empty-state__desc">{{ description }}</p>
      <div v-if="$slots.default" class="ww-empty-state__actions">
        <slot />
      </div>
    </div>
  </div>
</template>
