<script setup lang="ts">
defineProps<{
  label: string
  subtitle?: string
}>()
</script>

<template>
  <div class="ww-settings-row">
    <div class="ww-settings-row__label" :class="{ 'is-centered': !subtitle }">
      <span class="ww-settings-row__title">{{ label }}</span>
      <span v-if="subtitle" class="ww-settings-row__subtitle">{{ subtitle }}</span>
    </div>
    <div v-if="$slots.default" class="ww-settings-row__control">
      <slot />
    </div>
  </div>
</template>
