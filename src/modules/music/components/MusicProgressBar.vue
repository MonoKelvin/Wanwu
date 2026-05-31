<script setup lang="ts">
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  progress: number
  duration: number
}>()

const emit = defineEmits<{ seek: [seconds: number] }>()

const trackRef = ref<HTMLElement | null>(null)
const displayPct = ref(0)
const seekEasing = ref(false)
let dragPointer: number | null = null

const targetPct = computed(() => {
  if (!props.duration) return 0
  return Math.min(100, (props.progress / props.duration) * 100)
})

watch(
  targetPct,
  (v) => {
    if (dragPointer != null) {
      displayPct.value = v
      return
    }
    seekEasing.value = false
    displayPct.value = v
  },
  { immediate: true }
)

function formatMusicTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function percentFromClientX(clientX: number): number {
  const el = trackRef.value
  if (!el || !props.duration) return targetPct.value
  const rect = el.getBoundingClientRect()
  const ratio = (clientX - rect.left) / rect.width
  return Math.max(0, Math.min(100, ratio * 100))
}

function applyPercent(p: number, animate: boolean) {
  seekEasing.value = animate
  displayPct.value = p
  emit('seek', (p / 100) * props.duration)
}

function onTrackPointerDown(e: PointerEvent) {
  if (e.button !== 0 || !props.duration) return
  const el = trackRef.value
  if (!el) return
  dragPointer = e.pointerId
  seekEasing.value = true
  el.setPointerCapture(e.pointerId)
  applyPercent(percentFromClientX(e.clientX), true)
}

function onTrackPointerMove(e: PointerEvent) {
  if (dragPointer !== e.pointerId) return
  seekEasing.value = false
  applyPercent(percentFromClientX(e.clientX), false)
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
</script>

<template>
  <div class="ww-music-progress">
    <span class="ww-music-progress__time">{{ formatMusicTime(progress) }}</span>
    <div
      ref="trackRef"
      class="ww-music-progress__track"
      :class="{ 'is-disabled': !duration }"
      role="slider"
      :aria-valuenow="Math.round(targetPct)"
      aria-valuemin="0"
      aria-valuemax="100"
      aria-label="播放进度"
      @pointerdown="onTrackPointerDown"
      @pointermove="onTrackPointerMove"
      @pointerup="onTrackPointerUp"
      @pointercancel="onTrackPointerUp"
    >
      <div class="ww-music-progress__rail">
        <div
          class="ww-music-progress__fill"
          :class="{ 'is-seek': seekEasing }"
          :style="{ width: `${displayPct}%` }"
        />
      </div>
      <div
        class="ww-music-progress__thumb"
        :class="{ 'is-seek': seekEasing }"
        :style="{ left: `${displayPct}%` }"
      />
    </div>
    <span class="ww-music-progress__time">{{ formatMusicTime(duration) }}</span>
  </div>
</template>

<style scoped>
.ww-music-progress {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  width: 100%;
  --ww-progress-track: color-mix(in srgb, var(--ww-ink) 9%, transparent);
  --ww-progress-fill: color-mix(in srgb, var(--ww-ink) 52%, transparent);
  --ww-progress-thumb: var(--ww-ink);
}

[data-theme='dark'] .ww-music-progress {
  --ww-progress-track: color-mix(in srgb, var(--ww-ink) 14%, transparent);
  --ww-progress-fill: color-mix(in srgb, var(--ww-ink) 68%, transparent);
  --ww-progress-thumb: color-mix(in srgb, var(--ww-ink) 92%, white);
}

.ww-music-progress__time {
  flex-shrink: 0;
  width: 2.35rem;
  font-size: 0.6875rem;
  font-variant-numeric: tabular-nums;
  color: var(--ww-ink-faint);
}

.ww-music-progress__time:last-child {
  text-align: right;
}

.ww-music-progress__track {
  position: relative;
  flex: 1;
  height: 1rem;
  display: flex;
  align-items: center;
  cursor: pointer;
  touch-action: none;
}

.ww-music-progress__track.is-disabled {
  opacity: 0.4;
  cursor: not-allowed;
  pointer-events: none;
}

.ww-music-progress__rail {
  position: relative;
  width: 100%;
  height: 0.3rem;
  border-radius: 999px;
  overflow: hidden;
  background: var(--ww-progress-track);
}

.ww-music-progress__fill {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  min-width: 0.3rem;
  border-radius: 999px;
  background: var(--ww-progress-fill);
  transition: width 0.24s linear;
}

.ww-music-progress__fill.is-seek {
  transition: width 0.38s cubic-bezier(0.22, 1, 0.36, 1);
}

.ww-music-progress__thumb {
  position: absolute;
  top: 50%;
  width: 0.3125rem;
  height: 0.875rem;
  margin-left: -0.15625rem;
  margin-top: -0.4375rem;
  border-radius: 999px;
  background: var(--ww-progress-thumb);
  box-shadow: 0 1px 4px color-mix(in srgb, black 18%, transparent);
  pointer-events: none;
  transition: left 0.24s linear, transform 0.15s var(--ww-ease-out);
}

.ww-music-progress__thumb.is-seek {
  transition: left 0.38s cubic-bezier(0.22, 1, 0.36, 1), transform 0.15s var(--ww-ease-out);
}

.ww-music-progress__track:active .ww-music-progress__thumb {
  transform: scale(1.12);
}
</style>
