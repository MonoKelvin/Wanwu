<script setup lang="ts">
defineOptions({ name: 'CaSectionHead' })

withDefaults(
  defineProps<{
    eyebrow?: string
    title: string
    lead?: string
  }>(),
  {}
)
</script>

<template>
  <header class="ww-ca-section-center ww-ca-section-center--decor">
    <p v-if="eyebrow" class="ww-ca-section-center__eyebrow">{{ eyebrow }}</p>
    <h2 class="ww-ca-section-center__title ww-ca-display">{{ title }}</h2>
    <p v-if="lead" class="ww-ca-page__lead ww-ca-section-center__lead">{{ lead }}</p>
  </header>
</template>
