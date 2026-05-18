<script setup lang="ts">
import InputIcon from 'primevue/inputicon'
import WwIcon from '@shared/components/WwIcon.vue'
import type { WwIconName } from '@shared/icons/registry'

withDefaults(
  defineProps<{
    name?: WwIconName
  }>(),
  { name: 'search' }
)
</script>

<template>
  <InputIcon class="ww-input-icon">
    <WwIcon :name="name" size="sm" />
  </InputIcon>
</template>
