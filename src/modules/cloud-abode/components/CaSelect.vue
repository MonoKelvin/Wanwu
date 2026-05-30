<script setup lang="ts">
defineOptions({ name: 'CaSelect' })

const model = defineModel<string>({ required: true })

withDefaults(
  defineProps<{
    grow?: boolean
  }>(),
  { grow: false }
)
</script>

<template>
  <select
    v-model="model"
    class="ww-ca-field ww-ca-field--select"
    :class="{ 'ww-ca-field--grow': grow }"
  >
    <slot />
  </select>
</template>
