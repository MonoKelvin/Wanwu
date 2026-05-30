<script setup lang="ts">
defineOptions({ name: 'CaPatternDecor' })

withDefaults(
  defineProps<{
    variant?: 'dots' | 'grid' | 'rings' | 'diagonal' | 'cross' | 'arc'
  }>(),
  { variant: 'dots' }
)
</script>

<template>
  <div class="ww-ca-pattern" :class="`ww-ca-pattern--${variant}`" aria-hidden="true" />
</template>
