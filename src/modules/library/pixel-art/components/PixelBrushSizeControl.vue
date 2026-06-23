<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import WwSlider from '@shared/components/WwSlider.vue'
import type { ToolOptions } from '@modules/library/pixel-art/domain/tools'

const props = defineProps<{
  modelValue: number
  shape: ToolOptions['brushShape']
  min?: number
  max?: number
  /** 屏幕像素 / 画布像素，用于预览圆圈尺寸 */
  previewScale?: number
}>()

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

const local = computed({
  get: () => props.modelValue,
  set: (v: number | number[]) => {
    const n = Array.isArray(v) ? v[0] : v
    if (Number.isFinite(n)) emit('update:modelValue', Math.round(n))
  }
})

const previewVisible = ref(false)
const previewPos = ref({ x: 0, y: 0 })

const previewDiameter = computed(() => Math.max(6, props.modelValue * (props.previewScale ?? 1)))

function onPointerMove(e: PointerEvent) {
  if (!previewVisible.value) return
  previewPos.value = { x: e.clientX, y: e.clientY }
}

function showPreview(e: PointerEvent) {
  previewVisible.value = true
  previewPos.value = { x: e.clientX, y: e.clientY }
  document.addEventListener('pointermove', onPointerMove)
}

function hidePreview() {
  previewVisible.value = false
  document.removeEventListener('pointermove', onPointerMove)
}

watch(
  () => props.modelValue,
  () => {
    if (previewVisible.value) return
  }
)

onBeforeUnmount(hidePreview)
</script>

<template>
  <div class="pa-brush-size" @pointerdown="showPreview" @pointerup="hidePreview" @pointercancel="hidePreview">
    <WwSlider v-model="local" class="pa-brush-size__slider" :min="min ?? 1" :max="max ?? 8" :step="1" />
    <span class="pa-brush-size__value">{{ modelValue }}</span>
  </div>

  <Teleport to="body">
    <div
      v-if="previewVisible"
      class="pa-brush-preview"
      :class="{ 'pa-brush-preview--circle': shape === 'circle' }"
      :style="{
        left: `${previewPos.x}px`,
        top: `${previewPos.y}px`,
        width: `${previewDiameter}px`,
        height: `${previewDiameter}px`
      }"
      aria-hidden="true"
    />
  </Teleport>
</template>

<style scoped>
.pa-brush-size {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  min-width: 0;
}

.pa-brush-size__slider {
  flex: 1;
  min-width: 0;
}

.pa-brush-size__value {
  flex-shrink: 0;
  min-width: 1rem;
  font-size: 0.6875rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--ww-ink-muted);
  text-align: right;
}
</style>

<style>
.pa-brush-preview {
  position: fixed;
  z-index: 10000;
  pointer-events: none;
  transform: translate(-50%, -50%);
  border: 1.5px solid color-mix(in srgb, var(--ww-accent) 85%, #fff);
  background: color-mix(in srgb, var(--ww-accent) 18%, transparent);
  box-shadow: 0 0 0 1px rgb(0 0 0 / 0.25);
}

.pa-brush-preview--circle {
  border-radius: 50%;
}
</style>
