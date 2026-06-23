<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import type { PixelImportCrop } from '@modules/library/pixel-art/lib/pixelImageImport'

const crop = defineModel<PixelImportCrop>({ required: true })

const props = defineProps<{
  image: HTMLImageElement | null
}>()

const rootRef = ref<HTMLElement | null>(null)
const stageRef = ref<HTMLElement | null>(null)
const imageBounds = ref({ left: 0, top: 0, width: 1, height: 1 })

type DragMode = 'move' | 'nw' | 'ne' | 'sw' | 'se' | null
let dragMode: DragMode = null
let dragStart = { x: 0, y: 0, crop: { x: 0, y: 0, w: 1, h: 1 } }

const minCrop = 0.05

const rectStyle = computed(() => {
  const b = imageBounds.value
  return {
    left: `${b.left + crop.value.x * b.width}px`,
    top: `${b.top + crop.value.y * b.height}px`,
    width: `${crop.value.w * b.width}px`,
    height: `${crop.value.h * b.height}px`
  }
})

const shadeTop = computed(() => {
  const b = imageBounds.value
  const top = b.top + crop.value.y * b.height
  return { left: `${b.left}px`, top: `${b.top}px`, width: `${b.width}px`, height: `${Math.max(0, top - b.top)}px` }
})

const shadeBottom = computed(() => {
  const b = imageBounds.value
  const cropBottom = b.top + (crop.value.y + crop.value.h) * b.height
  const height = Math.max(0, b.top + b.height - cropBottom)
  return {
    left: `${b.left}px`,
    top: `${cropBottom}px`,
    width: `${b.width}px`,
    height: `${height}px`
  }
})

const shadeLeft = computed(() => {
  const b = imageBounds.value
  const left = b.left + crop.value.x * b.width
  const top = b.top + crop.value.y * b.height
  const height = crop.value.h * b.height
  return { left: `${b.left}px`, top: `${top}px`, width: `${Math.max(0, left - b.left)}px`, height: `${height}px` }
})

const shadeRight = computed(() => {
  const b = imageBounds.value
  const cropRight = b.left + (crop.value.x + crop.value.w) * b.width
  const top = b.top + crop.value.y * b.height
  const height = crop.value.h * b.height
  return {
    left: `${cropRight}px`,
    top: `${top}px`,
    width: `${Math.max(0, b.left + b.width - cropRight)}px`,
    height: `${height}px`
  }
})

function measureImageBounds() {
  const stage = stageRef.value
  const image = props.image
  if (!stage || !image?.naturalWidth) return
  const stageRect = stage.getBoundingClientRect()
  const maxW = stage.clientWidth
  const maxH = stage.clientHeight
  const scale = Math.min(maxW / image.naturalWidth, maxH / image.naturalHeight, 1)
  const width = image.naturalWidth * scale
  const height = image.naturalHeight * scale
  const left = (maxW - width) / 2
  const top = (maxH - height) / 2
  imageBounds.value = { left, top, width, height }
}

watch(
  () => props.image,
  () => {
    void nextTick(() => measureImageBounds())
  }
)

function onResize() {
  measureImageBounds()
}

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  endDrag()
})

if (typeof window !== 'undefined') {
  window.addEventListener('resize', onResize)
}

function clampCrop(next: PixelImportCrop): PixelImportCrop {
  let { x, y, w, h } = next
  w = Math.max(minCrop, Math.min(1, w))
  h = Math.max(minCrop, Math.min(1, h))
  x = Math.max(0, Math.min(1 - w, x))
  y = Math.max(0, Math.min(1 - h, y))
  return { x, y, w, h }
}

function startDrag(mode: DragMode, e: PointerEvent) {
  if (!props.image) return
  e.preventDefault()
  e.stopPropagation()
  dragMode = mode
  dragStart = { x: e.clientX, y: e.clientY, crop: { ...crop.value } }
  ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
  document.addEventListener('pointermove', onDragMove)
  document.addEventListener('pointerup', endDrag)
  document.addEventListener('pointercancel', endDrag)
}

function onDragMove(e: PointerEvent) {
  if (!dragMode || !props.image) return
  const b = imageBounds.value
  const dx = (e.clientX - dragStart.x) / b.width
  const dy = (e.clientY - dragStart.y) / b.height
  const base = dragStart.crop

  if (dragMode === 'move') {
    crop.value = clampCrop({ ...base, x: base.x + dx, y: base.y + dy })
    return
  }

  let x = base.x
  let y = base.y
  let w = base.w
  let h = base.h

  if (dragMode === 'nw') {
    x = base.x + dx
    y = base.y + dy
    w = base.w - dx
    h = base.h - dy
  } else if (dragMode === 'ne') {
    y = base.y + dy
    w = base.w + dx
    h = base.h - dy
  } else if (dragMode === 'sw') {
    x = base.x + dx
    w = base.w - dx
    h = base.h + dy
  } else if (dragMode === 'se') {
    w = base.w + dx
    h = base.h + dy
  }

  crop.value = clampCrop({ x, y, w, h })
}

function endDrag() {
  dragMode = null
  document.removeEventListener('pointermove', onDragMove)
  document.removeEventListener('pointerup', endDrag)
  document.removeEventListener('pointercancel', endDrag)
}

defineExpose({ remeasure: measureImageBounds })
</script>

<template>
  <div ref="rootRef" class="pa-crop-editor">
    <div ref="stageRef" class="pa-crop-editor__stage">
      <img
        v-if="image"
        class="pa-crop-editor__image"
        :src="image.src"
        draggable="false"
        alt=""
        @load="measureImageBounds"
      />
      <div v-if="image" class="pa-crop-editor__overlay">
        <div class="pa-crop-editor__shade" :style="shadeTop" />
        <div class="pa-crop-editor__shade" :style="shadeBottom" />
        <div class="pa-crop-editor__shade" :style="shadeLeft" />
        <div class="pa-crop-editor__shade" :style="shadeRight" />
        <div
          class="pa-crop-editor__rect"
          :style="rectStyle"
          @pointerdown="startDrag('move', $event)"
        >
          <span class="pa-crop-editor__handle pa-crop-editor__handle--nw" @pointerdown.stop="startDrag('nw', $event)" />
          <span class="pa-crop-editor__handle pa-crop-editor__handle--ne" @pointerdown.stop="startDrag('ne', $event)" />
          <span class="pa-crop-editor__handle pa-crop-editor__handle--sw" @pointerdown.stop="startDrag('sw', $event)" />
          <span class="pa-crop-editor__handle pa-crop-editor__handle--se" @pointerdown.stop="startDrag('se', $event)" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pa-crop-editor {
  width: 100%;
  height: 100%;
  min-height: 14rem;
}

.pa-crop-editor__stage {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 14rem;
  border-radius: calc(var(--pa-radius, 0.75rem) - 0.125rem);
  background: var(--ww-inset);
  overflow: hidden;
}

.pa-crop-editor__image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  pointer-events: none;
  user-select: none;
}

.pa-crop-editor__overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.pa-crop-editor__shade {
  position: absolute;
  background: rgb(0 0 0 / 0.42);
  pointer-events: none;
}

.pa-crop-editor__rect {
  position: absolute;
  box-sizing: border-box;
  border: 2px solid color-mix(in srgb, var(--ww-accent) 82%, #fff);
  box-shadow: 0 0 0 1px rgb(0 0 0 / 0.25);
  cursor: move;
  pointer-events: auto;
  touch-action: none;
}

.pa-crop-editor__handle {
  position: absolute;
  width: 0.625rem;
  height: 0.625rem;
  border: 2px solid #fff;
  border-radius: 999px;
  background: var(--ww-accent);
  box-shadow: 0 0 0 1px rgb(0 0 0 / 0.2);
  pointer-events: auto;
  touch-action: none;
}

.pa-crop-editor__handle--nw {
  top: -0.375rem;
  left: -0.375rem;
  cursor: nwse-resize;
}

.pa-crop-editor__handle--ne {
  top: -0.375rem;
  right: -0.375rem;
  cursor: nesw-resize;
}

.pa-crop-editor__handle--sw {
  bottom: -0.375rem;
  left: -0.375rem;
  cursor: nesw-resize;
}

.pa-crop-editor__handle--se {
  bottom: -0.375rem;
  right: -0.375rem;
  cursor: nwse-resize;
}
</style>
