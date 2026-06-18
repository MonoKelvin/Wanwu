<script setup lang="ts">
import WwSettingsRow from '@shared/components/settings/WwSettingsRow.vue'

defineProps<{
  label: string
  subtitle?: string
}>()
</script>

<template>
  <WwSettingsRow :label="label" :subtitle="subtitle">
    <slot />
  </WwSettingsRow>
</template>
