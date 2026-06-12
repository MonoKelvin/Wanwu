<script setup lang="ts">
import DiagramPropertySectionSlot from '@modules/library/diagrams/components/property-panel/DiagramPropertySectionSlot.vue'
import type {
  DiagramPropertyContext,
  ResolvedPropertySection
} from '@modules/library/diagrams/domain/property-panel/types'

defineProps<{
  sections: ResolvedPropertySection[]
  scopeKey: string
  propertyContext: DiagramPropertyContext
}>()
</script>

<template>
  <div :key="scopeKey" class="dg-property-sections">
    <DiagramPropertySectionSlot
      v-for="section in sections"
      :key="section.key"
      :property-context="propertyContext"
      :component="section.component"
    />
  </div>
</template>
