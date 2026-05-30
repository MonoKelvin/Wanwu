<script setup lang="ts">
defineOptions({ name: 'CaPageTitle' })

defineProps<{
  title: string
  lead?: string
  eyebrow?: string
}>()
</script>

<template>
  <header class="ww-ca-page-title">
    <p v-if="eyebrow" class="ww-ca-kicker">{{ eyebrow }}</p>
    <h1 class="ww-ca-page-title__heading ww-ca-display">{{ title }}</h1>
    <p v-if="lead" class="ww-ca-page-title__lead">{{ lead }}</p>
  </header>
</template>
