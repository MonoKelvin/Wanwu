<script setup lang="ts">
import DiagramShapePreview from '@modules/library/diagrams/components/DiagramShapePreview.vue'
import { DIAGRAM_SHAPE_CATEGORIES } from '@modules/library/diagrams/lib/diagramShapeRegistry'
import { useDiagramCommandBus } from '@modules/library/diagrams/composables/useDiagramCommandBus'

const bus = useDiagramCommandBus()
const categories = DIAGRAM_SHAPE_CATEGORIES

function addShape(shapeId: string, defaultText: string) {
  void bus.dispatch({
    type: 'canvas.addNode',
    payload: {
      shape: shapeId,
      x: 240 + Math.random() * 80,
      y: 160 + Math.random() * 80,
      text: defaultText
    }
  })
}
</script>

<template>
  <aside class="dg-shape-panel dg-float dg-float--left ww-glass-blur ww-scrollbar" aria-label="图元">
    <section v-for="group in categories" :key="group.id" class="dg-shape-group">
      <h4 class="dg-shape-group__label">{{ group.label }}</h4>
      <div class="dg-shape-group__grid">
        <button
          v-for="item in group.items"
          :key="item.id"
          type="button"
          class="dg-shape-item"
          :title="item.label"
          :aria-label="`添加${item.label}`"
          @click="addShape(item.id, item.defaultText)"
        >
          <DiagramShapePreview :spec="item.preview" />
          <span class="dg-shape-item__label">{{ item.label }}</span>
        </button>
      </div>
    </section>
  </aside>
</template>
