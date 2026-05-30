<script setup lang="ts">
defineOptions({ name: 'CaField' })

const model = defineModel<string | number>({ required: true })

withDefaults(
  defineProps<{
    type?: string
    placeholder?: string
    grow?: boolean
    min?: number
    max?: number
    maxlength?: number
    width?: string
  }>(),
  { type: 'text', grow: false }
)
</script>

<template>
  <input
    v-model="model"
    :type="type"
    class="ww-ca-field"
    :class="{ 'ww-ca-field--grow': grow }"
    :placeholder="placeholder"
    :min="min"
    :max="max"
    :maxlength="maxlength"
    :style="width ? { width } : undefined"
  />
</template>
