<script setup lang="ts">
defineProps<{
  title: string
  subtitle?: string
}>()
</script>

<template>
  <div class="ww-music-page-heading">
    <div class="ww-music-page-heading__row">
      <div>
        <h1 class="ww-music-page-heading__title">{{ title }}</h1>
        <p v-if="subtitle" class="ww-music-page-heading__sub">{{ subtitle }}</p>
      </div>
      <slot name="actions" />
    </div>
  </div>
</template>

<style scoped>
.ww-music-page-heading__row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}
</style>
