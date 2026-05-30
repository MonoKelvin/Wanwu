<script setup lang="ts">
import CaMeshWash from '@modules/cloud-abode/components/CaMeshWash.vue'

defineOptions({ name: 'CaPageBanner' })

withDefaults(
  defineProps<{
    title: string
    sub?: string
    compact?: boolean
    tone?: 'default' | 'sage' | 'blush'
  }>(),
  { compact: false, tone: 'default' }
)
</script>

<template>
  <section
    class="ww-ca-page-banner ww-ca-glass-panel"
    :class="[
      compact ? 'ww-ca-page-banner--compact' : '',
      tone !== 'default' ? `ww-ca-page-banner--${tone}` : ''
    ]"
  >
    <CaMeshWash variant="banner" />
    <h1 class="ww-ca-page-banner__title ww-ca-display">{{ title }}</h1>
    <p v-if="sub" class="ww-ca-page-banner__sub">{{ sub }}</p>
  </section>
</template>
