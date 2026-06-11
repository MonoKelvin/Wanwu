<script setup lang="ts">
import { computed } from 'vue'
import DiagramShapePropertyHost from '@modules/library/diagrams/components/shape-properties/DiagramShapePropertyHost.vue'
import { useDiagramPropertyContext } from '@modules/library/diagrams/composables/useDiagramPropertyContext'
import { hasShapeExtension, shapeExtensionSectionKey } from '@modules/library/diagrams/domain/property-panel'

const { ctx } = useDiagramPropertyContext()

const node = computed(() => ctx.value.selectedNode)
const hostKey = computed(() => shapeExtensionSectionKey(ctx.value))
const showHost = computed(() => hasShapeExtension(ctx.value) && node.value != null)
</script>

<template>
  <DiagramShapePropertyHost
    v-if="showHost && hostKey && node"
    :key="hostKey"
    :node="node"
  />
</template>
