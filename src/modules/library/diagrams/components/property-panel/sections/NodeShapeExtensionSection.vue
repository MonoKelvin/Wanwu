<script setup lang="ts">
import { computed } from 'vue'
import DiagramShapePropertyHost from '@modules/library/diagrams/components/DiagramShapePropertyHost.vue'
import { useDiagramPropertySectionView } from '@modules/library/diagrams/composables/useDiagramPropertySectionView'
import { hasShapeExtension, shapeExtensionSectionKey } from '@modules/library/diagrams/domain/property-panel'

const { ctx } = useDiagramPropertySectionView()

const hostKey = computed(() => shapeExtensionSectionKey(ctx.value))
const showHost = computed(() => hasShapeExtension(ctx.value))
</script>

<template>
  <DiagramShapePropertyHost v-if="showHost && hostKey" :key="hostKey" />
</template>
