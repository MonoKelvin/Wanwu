<script setup lang="ts">
defineOptions({ name: 'CaOrnamentDivider' })

withDefaults(
  defineProps<{
    label?: string
  }>(),
  {}
)
</script>

<template>
  <div class="ww-ca-ornament-divider" role="presentation">
    <span class="ww-ca-ornament-divider__line" />
    <span class="ww-ca-ornament-divider__mark" aria-hidden="true">
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
        <path d="M5 0L6.2 3.8H10L6.9 6.2L8.1 10L5 7.6L1.9 10L3.1 6.2L0 3.8H3.8L5 0Z" fill="currentColor" />
      </svg>
    </span>
    <span v-if="label" class="ww-ca-ornament-divider__label">{{ label }}</span>
    <span class="ww-ca-ornament-divider__line" />
  </div>
</template>
