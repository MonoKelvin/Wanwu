<script setup lang="ts">
defineOptions({ name: 'CaAuroraLayer' })

withDefaults(
  defineProps<{
    variant?: 'ambient' | 'panel' | 'band'
  }>(),
  { variant: 'panel' }
)
</script>

<template>
  <div class="ww-ca-aurora" :class="`ww-ca-aurora--${variant}`" aria-hidden="true">
    <span class="ww-ca-aurora__sheet ww-ca-aurora__sheet--a" />
    <span class="ww-ca-aurora__sheet ww-ca-aurora__sheet--b" />
    <span class="ww-ca-aurora__sheet ww-ca-aurora__sheet--c" />
  </div>
</template>
