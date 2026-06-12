<script setup lang="ts">
import { toRef, type Component } from 'vue'
import type { DiagramPropertyContext } from '@modules/library/diagrams/domain/property-panel/types'
import { provideDiagramPropertySectionView } from '@modules/library/diagrams/composables/useDiagramPropertySectionView'

const props = defineProps<{
  propertyContext: DiagramPropertyContext
  component: Component
}>()

provideDiagramPropertySectionView(toRef(props, 'propertyContext'))
</script>

<template>
  <component :is="component" />
</template>
