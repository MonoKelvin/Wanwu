<script setup lang="ts">
import { computed, ref } from 'vue'
import { hslToRgb, type HsvaColor } from '@shared/lib/colorWithAlpha'

export type WwColorWheelMode = 'square' | 'wheel'

const props = defineProps<{
  hsva: HsvaColor
  mode?: WwColorWheelMode
}>()

const emit = defineEmits<{
  'update:hsva': [value: HsvaColor]
  'update:mode': [mode: WwColorWheelMode]
}>()

const innerMode = ref<WwColorWheelMode>(props.mode ?? 'square')

const modeValue = computed({
  get: () => props.mode ?? innerMode.value,
  set: (v: WwColorWheelMode) => {
    innerMode.value = v
    emit('update:mode', v)
  }
})

const svStyle = computed(() => ({
  backgroundColor: `hsl(${props.hsva.h} 100% 50%)`,
  backgroundImage:
    'linear-gradient(to top, rgb(0 0 0), transparent), linear-gradient(to right, rgb(255 255 255), transparent)'
}))

const svPointerStyle = computed(() => ({
  left: `${props.hsva.s}%`,
  top: `${100 - props.hsva.v}%`
}))

const huePointerStyle = computed(() => ({
  left: `${(props.hsva.h / 360) * 100}%`
}))

const alphaPointerStyle = computed(() => ({
  left: `${props.hsva.a * 100}%`
}))

const alphaTrackStyle = computed(() => {
  const { r, g, b } = hslToRgb(props.hsva.h, 100, 50)
  return { background: `linear-gradient(to right, transparent, rgb(${r}, ${g}, ${b}))` }
})

const wheelRingStyle = computed(() => ({
  background: `conic-gradient(from 0deg, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)`
}))

const triangleBgStyle = computed(() => ({
  background: `
    linear-gradient(to top, rgb(0 0 0), transparent 58%),
    linear-gradient(to right, rgb(255 255 255), transparent 58%),
    hsl(${props.hsva.h} 100% 50%)
  `
}))

const wheelPointerStyle = computed(() => {
  const angle = (props.hsva.h / 360) * Math.PI * 2 - Math.PI / 2
  const radius = 39.5
  return {
    left: `${50 + Math.cos(angle) * radius}%`,
    top: `${50 + Math.sin(angle) * radius}%`
  }
})

function trianglePointFromSv(s: number, v: number) {
  const wA = Math.min(1, Math.max(0, s / 100))
  let wB = v / 100 - wA
  let wC = 1 - wA - wB
  if (wB < 0) {
    wC += wB
    wB = 0
  }
  if (wC < 0) {
    wB += wC
    wC = 0
  }
  const sum = wA + wB + wC || 1
  const a = wA / sum
  const b = wB / sum
  const c = wC / sum
  return { x: a * 0.5 + b * 0 + c * 1, y: a * 0 + b * 1 + c * 1 }
}

const trianglePointerStyle = computed(() => {
  const p = trianglePointFromSv(props.hsva.s, props.hsva.v)
  return { left: `${p.x * 100}%`, top: `${p.y * 100}%` }
})

function svFromTrianglePoint(nx: number, ny: number) {
  const x0 = 0.5
  const y0 = 0
  const x1 = 0
  const y1 = 1
  const x2 = 1
  const y2 = 1
  const denom = (y1 - y2) * (x0 - x2) + (x2 - x1) * (y0 - y2)
  const wA = ((y1 - y2) * (nx - x2) + (x2 - x1) * (ny - y2)) / denom
  const wB = ((y2 - y0) * (nx - x2) + (x0 - x2) * (ny - y2)) / denom
  const wC = 1 - wA - wB
  if (wA < 0 || wB < 0 || wC < 0) return null
  return { s: wA * 100, v: (wA + wB) * 100 }
}

function patch(patch: Partial<HsvaColor>) {
  emit('update:hsva', { ...props.hsva, ...patch })
}

type DragKind = 'sv' | 'hue' | 'alpha' | 'wheel-hue' | 'wheel-triangle'
let dragKind: DragKind | null = null
let dragEl: HTMLElement | null = null

function ratioX(event: PointerEvent, el: HTMLElement) {
  const rect = el.getBoundingClientRect()
  return Math.min(1, Math.max(0, (event.clientX - rect.left) / Math.max(rect.width, 1)))
}

function ratioY(event: PointerEvent, el: HTMLElement) {
  const rect = el.getBoundingClientRect()
  return Math.min(1, Math.max(0, (event.clientY - rect.top) / Math.max(rect.height, 1)))
}

function applyDrag(event: PointerEvent) {
  if (!dragKind || !dragEl) return
  if (dragKind === 'sv') {
    patch({ s: ratioX(event, dragEl) * 100, v: (1 - ratioY(event, dragEl)) * 100 })
    return
  }
  if (dragKind === 'hue') {
    patch({ h: ratioX(event, dragEl) * 360 })
    return
  }
  if (dragKind === 'wheel-hue') {
    const rect = dragEl.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const dx = event.clientX - cx
    const dy = event.clientY - cy
    const dist = Math.hypot(dx, dy) / Math.max(rect.width / 2, 1)
    if (dist < 0.56) return
    const angle = Math.atan2(dy, dx)
    patch({ h: ((angle * 180) / Math.PI + 360) % 360 })
    return
  }
  if (dragKind === 'alpha') {
    patch({ a: ratioX(event, dragEl) })
    return
  }
  const nx = ratioX(event, dragEl)
  const ny = ratioY(event, dragEl)
  const sv = svFromTrianglePoint(nx, ny)
  if (sv) patch(sv)
}

function onMove(event: PointerEvent) {
  if (!dragKind) return
  event.preventDefault()
  applyDrag(event)
}

function endDrag(event: PointerEvent) {
  if (!dragKind || !dragEl) return
  if (dragEl.hasPointerCapture(event.pointerId)) dragEl.releasePointerCapture(event.pointerId)
  document.removeEventListener('pointermove', onMove)
  document.removeEventListener('pointerup', endDrag)
  dragKind = null
  dragEl = null
}

function startDrag(kind: DragKind, event: PointerEvent) {
  dragKind = kind
  dragEl = event.currentTarget as HTMLElement
  dragEl.setPointerCapture(event.pointerId)
  event.preventDefault()
  applyDrag(event)
  document.addEventListener('pointermove', onMove)
  document.addEventListener('pointerup', endDrag)
}
</script>

<template>
  <div class="ww-color-wheel-core">
    <div class="ww-color-wheel-core__mode" role="tablist" aria-label="色轮模式">
      <button
        type="button"
        class="ww-color-wheel-core__mode-btn"
        :class="{ 'ww-color-wheel-core__mode-btn--active': modeValue === 'square' }"
        @click="modeValue = 'square'"
      >
        方盘
      </button>
      <button
        type="button"
        class="ww-color-wheel-core__mode-btn"
        :class="{ 'ww-color-wheel-core__mode-btn--active': modeValue === 'wheel' }"
        @click="modeValue = 'wheel'"
      >
        色轮
      </button>
    </div>

    <template v-if="modeValue === 'square'">
      <div class="ww-color-wheel-core__sv" :style="svStyle" @pointerdown="startDrag('sv', $event)">
        <span class="ww-color-wheel-core__pointer" :style="svPointerStyle" />
      </div>
    </template>
    <template v-else>
      <div class="ww-color-wheel-core__ps">
        <div
          class="ww-color-wheel-core__ps-ring"
          :style="wheelRingStyle"
          @pointerdown="startDrag('wheel-hue', $event)"
        >
          <span class="ww-color-wheel-core__wheel-pointer" :style="wheelPointerStyle" />
        </div>
        <div
          class="ww-color-wheel-core__ps-triangle"
          :style="triangleBgStyle"
          @pointerdown="startDrag('wheel-triangle', $event)"
        >
          <span class="ww-color-wheel-core__pointer" :style="trianglePointerStyle" />
        </div>
      </div>
    </template>

    <div class="ww-color-wheel-core__sliders">
      <div v-if="modeValue === 'square'" class="ww-color-wheel-core__slider" @pointerdown="startDrag('hue', $event)">
        <div class="ww-color-wheel-core__slider-track ww-color-wheel-core__slider-track--hue" />
        <span class="ww-color-wheel-core__slider-pointer" :style="huePointerStyle" />
      </div>
      <div class="ww-color-wheel-core__slider" @pointerdown="startDrag('alpha', $event)">
        <div class="ww-color-wheel-core__slider-track ww-color-wheel-core__slider-track--alpha">
          <span class="ww-color-wheel-core__alpha-checker" />
          <span class="ww-color-wheel-core__alpha-gradient" :style="alphaTrackStyle" />
        </div>
        <span class="ww-color-wheel-core__slider-pointer" :style="alphaPointerStyle" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.ww-color-wheel-core__mode {
  display: flex;
  gap: 0.125rem;
  padding: 0.125rem;
  margin-bottom: 0.5rem;
  border-radius: 0.4375rem;
  background: var(--ww-inset);
}

.ww-color-wheel-core__mode-btn {
  flex: 1;
  padding: 0.3125rem;
  border: none;
  border-radius: 0.3125rem;
  background: transparent;
  font-size: 0.625rem;
  font-weight: 600;
  color: var(--ww-ink-muted);
  cursor: pointer;
}

.ww-color-wheel-core__mode-btn--active {
  color: var(--ww-ink);
  background: var(--ww-content);
}

.ww-color-wheel-core__sv {
  position: relative;
  height: 7rem;
  border-radius: 0.4375rem;
  overflow: hidden;
  touch-action: none;
  cursor: crosshair;
}

.ww-color-wheel-core__ps {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  max-height: 8.5rem;
}

.ww-color-wheel-core__ps-ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  touch-action: none;
  cursor: crosshair;
  -webkit-mask: radial-gradient(circle, transparent 56%, #000 57%);
  mask: radial-gradient(circle, transparent 56%, #000 57%);
}

.ww-color-wheel-core__ps-triangle {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 44%;
  aspect-ratio: 1 / 0.866;
  transform: translate(-50%, -46%);
  clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
  touch-action: none;
  cursor: crosshair;
  box-shadow: 0 0 0 1px rgb(0 0 0 / 0.12);
}

.ww-color-wheel-core__pointer,
.ww-color-wheel-core__wheel-pointer {
  position: absolute;
  z-index: 1;
  width: 0.75rem;
  height: 0.75rem;
  margin: -0.375rem 0 0 -0.375rem;
  border: 2px solid #fff;
  border-radius: 50%;
  box-shadow: 0 0 0 1px rgb(0 0 0 / 0.35);
  pointer-events: none;
}

.ww-color-wheel-core__slider-pointer {
  position: absolute;
  z-index: 1;
  top: 50%;
  width: 0.75rem;
  height: 0.75rem;
  margin: -0.375rem 0 0 -0.375rem;
  border: 2px solid #fff;
  border-radius: 50%;
  box-shadow: 0 0 0 1px rgb(0 0 0 / 0.35);
  pointer-events: none;
}

.ww-color-wheel-core__sliders {
  display: flex;
  flex-direction: column;
  gap: 0.4375rem;
  margin-top: 0.4375rem;
}

.ww-color-wheel-core__slider {
  position: relative;
  height: 0.875rem;
  touch-action: none;
  display: flex;
  align-items: center;
}

.ww-color-wheel-core__slider-track {
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  height: 0.5rem;
  margin-top: -0.25rem;
  border-radius: 999px;
  overflow: hidden;
}

.ww-color-wheel-core__slider-track--hue {
  background: linear-gradient(to right, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00);
}

.ww-color-wheel-core__alpha-checker {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background-color: #fff;
  background-image:
    linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%),
    linear-gradient(45deg, #ccc 25%, transparent 25%, transparent 75%, #ccc 75%);
  background-size: 0.5rem 0.5rem;
  background-position:
    0 0,
    0.25rem 0.25rem;
}

.ww-color-wheel-core__alpha-gradient {
  position: absolute;
  inset: 0;
  border-radius: inherit;
}
</style>
