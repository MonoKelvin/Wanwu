<script setup lang="ts">
defineProps<{
  label?: string
}>()
</script>

<template>
  <div class="ww-settings-group">
    <h3 v-if="label" class="ww-settings-group__label">{{ label }}</h3>
    <slot />
  </div>
</template>
