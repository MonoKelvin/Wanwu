<script setup lang="ts">
defineOptions({ name: 'CaCornerAccent' })

withDefaults(
  defineProps<{
    position?: 'tl' | 'tr' | 'br' | 'bl'
  }>(),
  { position: 'tl' }
)
</script>

<template>
  <span class="ww-ca-corner-accent" :class="`ww-ca-corner-accent--${position}`" aria-hidden="true" />
</template>
