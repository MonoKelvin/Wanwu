<script setup lang="ts">
import { computed } from 'vue'
import type { ShapePreviewSpec } from '@modules/library/diagrams/lib/diagramShapePreview'
import {
  circlePreviewAttrs,
  diamondPreviewPoints,
  ellipsePreviewAttrs,
  polygonPreviewPoints,
  previewViewBox,
  rectPreviewAttrs
} from '@modules/library/diagrams/lib/diagramShapePreview'

const props = defineProps<{
  spec: ShapePreviewSpec
}>()

const viewBox = previewViewBox()

const rectAttrs = computed(() => (props.spec.kind === 'rect' ? rectPreviewAttrs(props.spec) : null))
const circleAttrs = computed(() => (props.spec.kind === 'circle' ? circlePreviewAttrs(props.spec) : null))
const ellipseAttrs = computed(() => (props.spec.kind === 'ellipse' ? ellipsePreviewAttrs(props.spec) : null))
const diamondPoints = computed(() => (props.spec.kind === 'diamond' ? diamondPreviewPoints(props.spec) : ''))
const polygonPoints = computed(() =>
  props.spec.kind === 'polygon' ? polygonPreviewPoints(props.spec.points) : ''
)
</script>

<template>
  <svg
    class="dg-shape-preview"
    :viewBox="viewBox"
    aria-hidden="true"
    focusable="false"
  >
    <rect
      v-if="rectAttrs"
      :x="rectAttrs.x"
      :y="rectAttrs.y"
      :width="rectAttrs.width"
      :height="rectAttrs.height"
      :rx="rectAttrs.rx"
      class="dg-shape-preview__stroke"
    />
    <circle
      v-else-if="circleAttrs"
      :cx="circleAttrs.cx"
      :cy="circleAttrs.cy"
      :r="circleAttrs.r"
      class="dg-shape-preview__stroke"
    />
    <ellipse
      v-else-if="ellipseAttrs"
      :cx="ellipseAttrs.cx"
      :cy="ellipseAttrs.cy"
      :rx="ellipseAttrs.rx"
      :ry="ellipseAttrs.ry"
      class="dg-shape-preview__stroke"
    />
    <polygon
      v-else-if="spec.kind === 'diamond'"
      :points="diamondPoints"
      class="dg-shape-preview__stroke"
    />
    <polygon
      v-else-if="spec.kind === 'polygon'"
      :points="polygonPoints"
      class="dg-shape-preview__stroke"
    />
    <path
      v-else-if="spec.kind === 'path'"
      :d="spec.d"
      class="dg-shape-preview__stroke"
    />
    <text
      v-else-if="spec.kind === 'text'"
      x="11"
      y="15"
      text-anchor="middle"
      class="dg-shape-preview__text"
    >
      T
    </text>
  </svg>
</template>

<style scoped>
.dg-shape-preview {
  display: block;
  width: 1.375rem;
  height: 1.375rem;
  flex-shrink: 0;
}

.dg-shape-preview__stroke {
  fill: var(--ww-inset);
  stroke: var(--ww-ink-muted);
  stroke-width: 1.25;
  vector-effect: non-scaling-stroke;
}

.dg-shape-preview__text {
  fill: var(--ww-ink-muted);
  font-size: 11px;
  font-weight: 600;
  font-family: inherit;
}
</style>
