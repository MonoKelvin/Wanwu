<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useMusicPlayerStore } from '@modules/music/stores/musicPlayer'

const player = useMusicPlayerStore()
const trackRef = ref<HTMLElement | null>(null)
const fillPercent = ref(player.muted ? 0 : player.volumePercent)
const animateFill = ref(false)
let dragPointer: number | null = null

const targetPercent = computed(() => (player.muted ? 0 : player.volumePercent))

watch(
  targetPercent,
  (v) => {
    if (dragPointer != null) {
      fillPercent.value = v
      return
    }
    animateFill.value = true
    fillPercent.value = v
  },
  { immediate: true }
)

function percentFromClientY(clientY: number): number {
  const el = trackRef.value
  if (!el) return targetPercent.value
  const rect = el.getBoundingClientRect()
  const ratio = 1 - (clientY - rect.top) / rect.height
  return Math.max(0, Math.min(100, Math.round(ratio * 100)))
}

function applyPercent(p: number, animate: boolean) {
  animateFill.value = animate
  fillPercent.value = p
  player.setVolumePercent(p)
}

function onTrackPointerDown(e: PointerEvent) {
  if (e.button !== 0) return
  const el = trackRef.value
  if (!el) return
  dragPointer = e.pointerId
  animateFill.value = true
  el.setPointerCapture(e.pointerId)
  applyPercent(percentFromClientY(e.clientY), true)
}

function onTrackPointerMove(e: PointerEvent) {
  if (dragPointer !== e.pointerId) return
  animateFill.value = false
  applyPercent(percentFromClientY(e.clientY), false)
}

function onTrackPointerUp(e: PointerEvent) {
  if (dragPointer !== e.pointerId) return
  dragPointer = null
  try {
    trackRef.value?.releasePointerCapture(e.pointerId)
  } catch {
    /* ignore */
  }
}

const WHEEL_STEP = 5

function onWheel(e: WheelEvent) {
  e.preventDefault()
  e.stopPropagation()
  const current = player.muted ? 0 : player.volumePercent
  const delta = e.deltaY < 0 ? WHEEL_STEP : -WHEEL_STEP
  applyPercent(Math.max(0, Math.min(100, current + delta)), true)
}
</script>

<template>
  <div
    ref="trackRef"
    class="ww-music-volume-slider"
    role="slider"
    :aria-valuenow="targetPercent"
    aria-valuemin="0"
    aria-valuemax="100"
    aria-label="音量"
    @pointerdown="onTrackPointerDown"
    @pointermove="onTrackPointerMove"
    @pointerup="onTrackPointerUp"
    @pointercancel="onTrackPointerUp"
    @wheel.prevent="onWheel"
  >
    <div class="ww-music-volume-slider__rail">
      <div
        class="ww-music-volume-slider__fill"
        :class="{ 'is-animated': animateFill }"
        :style="{ height: `${fillPercent}%` }"
      />
    </div>
    <div
      class="ww-music-volume-slider__thumb"
      :class="{ 'is-animated': animateFill }"
      :style="{ bottom: `calc(${fillPercent}% - 0.15625rem)` }"
    />
  </div>
</template>

<style scoped>
.ww-music-volume-slider {
  position: relative;
  width: 1.35rem;
  height: 5.5rem;
  cursor: pointer;
  touch-action: none;
  --ww-vol-track: color-mix(in srgb, var(--ww-ink) 9%, transparent);
  --ww-vol-fill: color-mix(in srgb, var(--ww-ink) 52%, transparent);
  --ww-vol-thumb: var(--ww-ink);
}

[data-theme='dark'] .ww-music-volume-slider {
  --ww-vol-track: color-mix(in srgb, var(--ww-ink) 14%, transparent);
  --ww-vol-fill: color-mix(in srgb, var(--ww-ink) 68%, transparent);
  --ww-vol-thumb: color-mix(in srgb, var(--ww-ink) 92%, white);
}

.ww-music-volume-slider__rail {
  position: absolute;
  left: 50%;
  top: 0;
  bottom: 0;
  width: 0.3rem;
  transform: translateX(-50%);
  border-radius: 999px;
  overflow: hidden;
  background: var(--ww-vol-track);
}

.ww-music-volume-slider__fill {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  min-height: 0.3rem;
  border-radius: 999px;
  background: var(--ww-vol-fill);
}

.ww-music-volume-slider__fill.is-animated,
.ww-music-volume-slider__thumb.is-animated {
  transition:
    height 0.42s cubic-bezier(0.22, 1, 0.36, 1),
    bottom 0.42s cubic-bezier(0.22, 1, 0.36, 1);
}

.ww-music-volume-slider__thumb {
  position: absolute;
  left: 50%;
  width: 0.875rem;
  height: 0.3125rem;
  margin-left: -0.4375rem;
  border-radius: 999px;
  background: var(--ww-vol-thumb);
  box-shadow: 0 1px 4px color-mix(in srgb, black 18%, transparent);
  pointer-events: none;
}
</style>
