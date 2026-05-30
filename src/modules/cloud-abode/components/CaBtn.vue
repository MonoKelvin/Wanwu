<script setup lang="ts">
defineOptions({ name: 'CaBtn' })

withDefaults(
  defineProps<{
    variant?: 'primary' | 'secondary' | 'text'
    type?: 'button' | 'submit'
    disabled?: boolean
  }>(),
  { variant: 'secondary', type: 'button', disabled: false }
)
</script>

<template>
  <button
    :type="type"
    class="ww-ca-btn"
    :class="`ww-ca-btn--${variant}`"
    :disabled="disabled"
  >
    <slot />
  </button>
</template>
