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
  background: `conic-gradient(from -90deg, #f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)`
}))

const triangleBgStyle = computed(() => ({
  background: `
    linear-gradient(to top, rgb(0 0 0), transparent 58%),
    linear-gradient(to right, rgb(255 255 255), transparent 58%),
    hsl(${props.hsva.h} 100% 50%)
  `
}))

function wheelAngleToHue(angle: number) {
  return (((angle + Math.PI / 2) / (Math.PI * 2)) * 360 + 360) % 360
}

const wheelPointerStyle = computed(() => ({
  transform: `translate(-50%, -50%) rotate(${props.hsva.h}deg) translateY(calc(var(--ww-wheel-ring-mid-offset) * -1))`
}))

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
  const xOff = p.x - 0.5
  return {
    left: `calc(50% + ${xOff} * var(--ww-wheel-triangle))`,
    top: `calc(50% - var(--ww-wheel-inner-radius) * var(--ww-wheel-triangle-inset) + ${p.y} * var(--ww-wheel-triangle-height))`
  }
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
let dragCaptureEl: HTMLElement | null = null

function ratioX(event: PointerEvent, el: HTMLElement, clamp = true) {
  const rect = el.getBoundingClientRect()
  const v = (event.clientX - rect.left) / Math.max(rect.width, 1)
  return clamp ? Math.min(1, Math.max(0, v)) : v
}

function ratioY(event: PointerEvent, el: HTMLElement, clamp = true) {
  const rect = el.getBoundingClientRect()
  const v = (event.clientY - rect.top) / Math.max(rect.height, 1)
  return clamp ? Math.min(1, Math.max(0, v)) : v
}

function closestPointOnSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
) {
  const dx = x2 - x1
  const dy = y2 - y1
  const lenSq = dx * dx + dy * dy
  if (lenSq === 0) return { x: x1, y: y1 }
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq
  t = Math.max(0, Math.min(1, t))
  return { x: x1 + t * dx, y: y1 + t * dy }
}

function svFromTrianglePointClamped(nx: number, ny: number) {
  const direct = svFromTrianglePoint(nx, ny)
  if (direct) return direct

  const edges: [number, number, number, number][] = [
    [0.5, 0, 0, 1],
    [0, 1, 1, 1],
    [1, 1, 0.5, 0]
  ]
  let best = { x: 0.5, y: 0 }
  let bestDist = Infinity
  for (const [x1, y1, x2, y2] of edges) {
    const p = closestPointOnSegment(nx, ny, x1, y1, x2, y2)
    const d = (nx - p.x) ** 2 + (ny - p.y) ** 2
    if (d < bestDist) {
      bestDist = d
      best = p
    }
  }
  return svFromTrianglePoint(best.x, best.y)!
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
    patch({ h: wheelAngleToHue(Math.atan2(dy, dx)) })
    return
  }
  if (dragKind === 'alpha') {
    patch({ a: ratioX(event, dragEl) })
    return
  }
  const nx = ratioX(event, dragEl, false)
  const ny = ratioY(event, dragEl, false)
  patch(svFromTrianglePointClamped(nx, ny))
}

function onMove(event: PointerEvent) {
  if (!dragKind) return
  event.preventDefault()
  event.stopPropagation()
  applyDrag(event)
}

function endDrag(event: PointerEvent) {
  if (!dragKind || !dragCaptureEl) return
  if (dragCaptureEl.hasPointerCapture(event.pointerId)) {
    dragCaptureEl.releasePointerCapture(event.pointerId)
  }
  document.removeEventListener('pointermove', onMove, true)
  document.removeEventListener('pointerup', endDrag, true)
  document.removeEventListener('pointercancel', endDrag, true)
  dragKind = null
  dragEl = null
  dragCaptureEl = null
}

function resolveDragElements(kind: DragKind, target: HTMLElement) {
  const ps = target.closest('.ww-color-wheel-core__ps') as HTMLElement | null
  if (kind === 'wheel-hue') {
    return { captureEl: ps ?? target, metricEl: ps ?? target }
  }
  if (kind === 'wheel-triangle') {
    const triangle =
      (target.closest('.ww-color-wheel-core__ps-triangle') as HTMLElement | null) ?? target
    return { captureEl: ps ?? triangle, metricEl: triangle }
  }
  return { captureEl: target, metricEl: target }
}

function startDrag(kind: DragKind, event: PointerEvent) {
  if (event.button !== 0) return
  const target = event.currentTarget as HTMLElement
  const { captureEl, metricEl } = resolveDragElements(kind, target)
  dragKind = kind
  dragCaptureEl = captureEl
  dragEl = metricEl
  captureEl.setPointerCapture(event.pointerId)
  event.preventDefault()
  event.stopPropagation()
  applyDrag(event)
  document.addEventListener('pointermove', onMove, true)
  document.addEventListener('pointerup', endDrag, true)
  document.addEventListener('pointercancel', endDrag, true)
}
</script>

<template>
  <div class="ww-color-wheel-core" :class="{ 'ww-color-wheel-core--wheel': modeValue === 'wheel' }">
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

    <div class="ww-color-wheel-core__stage">
      <div
        v-show="modeValue === 'square'"
        class="ww-color-wheel-core__sv"
        :style="svStyle"
        @pointerdown="startDrag('sv', $event)"
      >
        <span class="ww-color-wheel-core__pointer" :style="svPointerStyle" />
      </div>
      <div v-show="modeValue === 'wheel'" class="ww-color-wheel-core__ps" @lostpointercapture="endDrag">
        <div
          class="ww-color-wheel-core__ps-ring"
          :style="wheelRingStyle"
          @pointerdown="startDrag('wheel-hue', $event)"
        />
        <div
          class="ww-color-wheel-core__ps-triangle"
          :style="triangleBgStyle"
          @pointerdown="startDrag('wheel-triangle', $event)"
        />
        <div class="ww-color-wheel-core__ps-overlay" aria-hidden="true">
          <span class="ww-color-wheel-core__pointer ww-color-wheel-core__triangle-pointer" :style="trianglePointerStyle" />
          <span class="ww-color-wheel-core__pointer ww-color-wheel-core__wheel-pointer" :style="wheelPointerStyle" />
        </div>
      </div>
    </div>

    <div class="ww-color-wheel-core__sliders">
      <div
        v-if="modeValue === 'square'"
        class="ww-color-wheel-core__slider ww-color-wheel-core__slider--hue"
        @pointerdown="startDrag('hue', $event)"
      >
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
.ww-color-wheel-core {
  --ww-slider-stack: calc(0.875rem + 0.3125rem);
}

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
  transition:
    background var(--ww-duration-fast, 0.16s) var(--ww-ease-out, ease),
    color var(--ww-duration-fast, 0.16s) var(--ww-ease-out, ease),
    box-shadow var(--ww-duration-fast, 0.16s) var(--ww-ease-out, ease);
}

.ww-color-wheel-core__mode-btn--active {
  color: var(--ww-ink);
  background: var(--ww-content);
  box-shadow: 0 1px 2px rgb(18 18 22 / 0.08);
}

.ww-color-wheel-core__stage {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 9rem;
  margin-bottom: 0.3125rem;
  overflow: visible;
}

.ww-color-wheel-core--wheel .ww-color-wheel-core__stage {
  height: calc(9rem + var(--ww-slider-stack));
}

.ww-color-wheel-core__sv {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 0.4375rem;
  overflow: hidden;
  touch-action: none;
  cursor: crosshair;
  box-shadow: inset 0 0 0 1px rgb(0 0 0 / 0.06);
}

.ww-color-wheel-core__ps {
  --ww-wheel-size: 8rem;
  --ww-wheel-ring-inner-stop: 78%;
  --ww-wheel-ring-inner-norm: 0.78;
  --ww-wheel-ring-mid-norm: 0.89;
  --ww-wheel-inner-radius: calc(var(--ww-wheel-size) * 0.5 * var(--ww-wheel-ring-inner-norm));
  --ww-wheel-triangle-inset: 0.9;
  --ww-wheel-triangle: calc(var(--ww-wheel-inner-radius) * 1.732051 * var(--ww-wheel-triangle-inset));
  --ww-wheel-triangle-height: calc(var(--ww-wheel-inner-radius) * 1.5 * var(--ww-wheel-triangle-inset));
  --ww-wheel-ring-mid-offset: calc(var(--ww-wheel-size) * 0.5 * var(--ww-wheel-ring-mid-norm));

  position: relative;
  width: var(--ww-wheel-size);
  height: var(--ww-wheel-size);
  flex-shrink: 0;
  overflow: visible;
  touch-action: none;
}

.ww-color-wheel-core--wheel .ww-color-wheel-core__ps {
  --ww-wheel-size: calc(9rem + var(--ww-slider-stack) - 0.3125rem);
}

.ww-color-wheel-core__ps-ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  touch-action: none;
  cursor: crosshair;
  -webkit-mask: radial-gradient(
    circle closest-side,
    transparent calc(var(--ww-wheel-ring-inner-stop) - 0.35%),
    #000 var(--ww-wheel-ring-inner-stop),
    #000 100%
  );
  mask: radial-gradient(
    circle closest-side,
    transparent calc(var(--ww-wheel-ring-inner-stop) - 0.35%),
    #000 var(--ww-wheel-ring-inner-stop),
    #000 100%
  );
}

.ww-color-wheel-core__ps-triangle {
  position: absolute;
  left: 50%;
  top: calc(50% - var(--ww-wheel-inner-radius) * var(--ww-wheel-triangle-inset));
  width: var(--ww-wheel-triangle);
  height: var(--ww-wheel-triangle-height);
  transform: translateX(-50%);
  clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
  touch-action: none;
  cursor: crosshair;
}

.ww-color-wheel-core__ps-overlay {
  position: absolute;
  inset: 0;
  overflow: visible;
  pointer-events: none;
}

.ww-color-wheel-core__pointer {
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

.ww-color-wheel-core__triangle-pointer {
  z-index: 1;
}

.ww-color-wheel-core__wheel-pointer {
  left: 50%;
  top: 50%;
  z-index: 2;
  margin: 0;
  transform-origin: center center;
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
  gap: 0.3125rem;
  min-height: calc(0.875rem * 2 + 0.3125rem);
}

.ww-color-wheel-core--wheel .ww-color-wheel-core__sliders {
  min-height: 0.875rem;
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
