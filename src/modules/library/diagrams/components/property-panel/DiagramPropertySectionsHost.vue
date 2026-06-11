<script setup lang="ts">
import type { ResolvedPropertySection } from '@modules/library/diagrams/domain/property-panel/types'

defineProps<{
  sections: ResolvedPropertySection[]
  scopeKey: string
}>()
</script>

<template>
  <div :key="scopeKey" class="dg-property-sections">
    <component
      v-for="section in sections"
      :is="section.component"
      :key="section.key"
    />
  </div>
</template>
