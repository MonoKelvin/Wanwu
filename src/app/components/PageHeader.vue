<script setup lang="ts">
defineProps<{
  title: string
  subtitle?: string
}>()
</script>

<template>
  <header class="ww-page-header">
    <div class="flex items-end justify-between gap-4">
      <div>
        <h1>{{ title }}</h1>
        <p v-if="subtitle" class="ww-subtitle">{{ subtitle }}</p>
      </div>
      <slot name="actions" />
    </div>
  </header>
</template>
