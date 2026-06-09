<script setup lang="ts">
import DiagramShapePreview from '@modules/library/diagrams/components/DiagramShapePreview.vue'
import { getShapeTooltip } from '@modules/library/diagrams/lib/diagramShapeDescriptions'
import { writeShapeDragData } from '@modules/library/diagrams/lib/diagramShapeDrag'
import type { DiagramShapeItem } from '@modules/library/diagrams/lib/diagramShapeTypes'

const props = defineProps<{
  item: DiagramShapeItem
}>()

function onDragStart(event: DragEvent) {
  writeShapeDragData(event, {
    shapeId: props.item.id,
    defaultText: props.item.defaultText
  })
}
</script>

<template>
  <div
    v-tooltip.bottom="getShapeTooltip(item)"
    class="dg-shape-item dg-shape-item--draggable"
    draggable="true"
    role="listitem"
    :aria-label="item.label"
    @dragstart="onDragStart"
  >
    <DiagramShapePreview :spec="item.preview" />
    <span class="dg-shape-item__label">{{ item.label }}</span>
  </div>
</template>
