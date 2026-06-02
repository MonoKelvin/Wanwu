<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import WwMarqueeText from '@shared/components/WwMarqueeText.vue'
import { parseLrc, lrcLineAt, type LrcLine } from '@modules/music/composables/parseLrc'
import { useLyricsScroll } from '@modules/music/composables/useLyricsScroll'
import { formatPlayError } from '@modules/music/lib/formatPlayError'
import { useMusicPlayerStore } from '@modules/music/stores/musicPlayer'

const props = defineProps<{
  variant?: 'list' | 'duet' | 'immersion'
}>()

const player = useMusicPlayerStore()
const lines = ref<LrcLine[]>([])
const synced = ref(true)
const listRef = ref<HTMLElement | null>(null)
const duetStageRef = ref<HTMLElement | null>(null)
const duetPairRef = ref<HTMLElement | null>(null)

const activeIndex = computed(() => {
  if (!synced.value || !lines.value.length) return -1
  return lrcLineAt(lines.value, player.progress)
})

function resumeAutoScroll() {
  scrollToIndex(activeIndex.value, true)
}

function seekToLineIndex(index: number) {
  const line = lines.value[index]
  if (!line || !synced.value || !Number.isFinite(line.timeSec)) return
  clearAutoScrollPause()
  player.seekAndPlay(line.timeSec)
  void nextTick(() => scrollToIndex(index, true))
}

const { edgePad, isDragging, scrollToIndex, measureEdgePad, clearAutoScrollPause } = useLyricsScroll(
  listRef,
  resumeAutoScroll,
  undefined,
  seekToLineIndex
)

const playError = computed(() =>
  player.errorMessage ? formatPlayError(player.errorMessage) : null
)

watch(
  () => player.lyricsLrc,
  (raw) => {
    if (!raw?.trim()) {
      lines.value = []
      synced.value = true
      return
    }
    if (raw.includes('[')) {
      const parsed = parseLrc(raw)
      lines.value = parsed
      synced.value = parsed.length > 0
      return
    }
    lines.value = raw
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((text) => ({ timeSec: Number.NaN, text }))
    synced.value = false
  },
  { immediate: true }
)

const duetPairStart = computed(() => {
  if (!lines.value.length) return 0
  const idx = activeIndex.value
  if (idx < 0) return 0
  return Math.floor(idx / 2) * 2
})

const duetLine1 = computed(() => lines.value[duetPairStart.value]?.text ?? '')
const duetLine2 = computed(() => lines.value[duetPairStart.value + 1]?.text ?? '')
const duetLine1Active = computed(() => activeIndex.value === duetPairStart.value)
const duetLine2Active = computed(() => activeIndex.value === duetPairStart.value + 1)

const duetPairCount = computed(() => Math.max(1, Math.ceil(lines.value.length / 2)))
const duetPairIndex = computed(() => Math.floor(duetPairStart.value / 2))

const duetStageHeight = ref(0)
const duetPairHeight = ref(72)
const duetPairStride = computed(() => Math.max(duetPairHeight.value + 12, 84))

const duetEdgePad = computed(() =>
  Math.max(0, (duetStageHeight.value - duetPairHeight.value) / 2)
)

const duetPadTop = computed(() => {
  const consumed = duetPairIndex.value * duetPairStride.value
  return `${Math.max(0, duetEdgePad.value - consumed)}px`
})

const duetPadBottom = computed(() => {
  const remaining = duetPairCount.value - 1 - duetPairIndex.value
  const consumed = remaining * duetPairStride.value
  return `${Math.max(0, duetEdgePad.value - consumed)}px`
})

const useScrollList = computed(
  () => props.variant === 'list' || props.variant === 'immersion'
)

const listPadStyle = computed(() => ({
  paddingTop: `${edgePad.value}px`,
  paddingBottom: `${edgePad.value}px`
}))

function measureDuetStage() {
  duetStageHeight.value = duetStageRef.value?.clientHeight ?? 0
  duetPairHeight.value = duetPairRef.value?.offsetHeight ?? 72
}

let duetObserver: ResizeObserver | null = null

watch(activeIndex, async (idx) => {
  if (!useScrollList.value || idx < 0 || isDragging.value) return
  await nextTick()
  scrollToIndex(idx, true)
})

watch(
  () => lines.value.length,
  async () => {
    if (!useScrollList.value) return
    await nextTick()
    measureEdgePad()
    scrollToIndex(activeIndex.value, false)
  }
)

watch(isDragging, (dragging, wasDragging) => {
  if (wasDragging && !dragging && useScrollList.value) {
    void nextTick(() => scrollToIndex(activeIndex.value, true))
  }
})

onMounted(() => {
  measureDuetStage()
  duetObserver = new ResizeObserver(() => measureDuetStage())
  if (duetStageRef.value) duetObserver.observe(duetStageRef.value)
  if (duetPairRef.value) duetObserver.observe(duetPairRef.value)
})

onUnmounted(() => {
  duetObserver?.disconnect()
})
</script>

<template>
  <div
    class="ww-lyrics"
    :class="{
      'ww-lyrics--duet': variant === 'duet',
      'ww-lyrics--immersion': variant === 'immersion',
      'ww-lyrics--plain': !synced
    }"
  >
    <p v-if="playError" class="ww-lyrics__error">{{ playError }}</p>

    <template v-else-if="variant === 'duet'">
      <div ref="duetStageRef" class="ww-lyrics__duet-stage">
        <div class="ww-lyrics__duet-spacer" :style="{ height: duetPadTop }" aria-hidden="true" />
        <div ref="duetPairRef" class="ww-lyrics__duet-pair">
          <div
            class="ww-lyrics__duet-left"
            :class="{
              'is-active': duetLine1Active,
              'is-seekable': synced && Number.isFinite(lines[duetPairStart]?.timeSec)
            }"
            @click="seekToLineIndex(duetPairStart)"
          >
            <WwMarqueeText :text="duetLine1" tag="p" class="ww-lyrics__duet-line" />
          </div>
          <div
            v-if="duetLine2"
            class="ww-lyrics__duet-right"
            :class="{
              'is-active': duetLine2Active,
              'is-seekable': synced && Number.isFinite(lines[duetPairStart + 1]?.timeSec)
            }"
            @click="seekToLineIndex(duetPairStart + 1)"
          >
            <WwMarqueeText :text="duetLine2" tag="p" class="ww-lyrics__duet-line" />
          </div>
        </div>
        <div class="ww-lyrics__duet-spacer" :style="{ height: duetPadBottom }" aria-hidden="true" />
      </div>
    </template>

    <div v-else-if="useScrollList && lines.length" class="ww-lyrics__viewport">
      <ul
        ref="listRef"
        class="ww-lyrics__list"
        :class="{ 'is-dragging': isDragging }"
        :style="listPadStyle"
      >
        <li
          v-for="(line, i) in lines"
          :key="i"
          :data-idx="i"
          :class="{
            'is-active': synced && i === activeIndex,
            'is-near': synced && Math.abs(i - activeIndex) === 1,
            'is-seekable': synced && Number.isFinite(line.timeSec)
          }"
        >
          {{ line.text }}
        </li>
      </ul>
    </div>

    <p v-else-if="!lines.length" class="ww-lyrics__empty">暂无歌词</p>
    <p v-else-if="!synced" class="ww-lyrics__plain-hint">暂无时间轴，仅展示文本歌词</p>
  </div>
</template>

<style scoped>
.ww-lyrics {
  min-height: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  height: 100%;
}

.ww-lyrics__error {
  margin: auto;
  max-width: 20rem;
  padding: 0.85rem 1rem;
  text-align: center;
  font-size: 0.875rem;
  line-height: 1.55;
  color: var(--ww-danger, #ef4444);
  border-radius: var(--ww-music-card-radius);
  background: color-mix(in srgb, var(--ww-danger, #ef4444) 8%, transparent);
  border: 1px solid color-mix(in srgb, var(--ww-danger, #ef4444) 22%, transparent);
}

.ww-lyrics__viewport {
  --ww-lyrics-edge-fade: 3.25rem;
  position: relative;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  padding: 0.25rem 0 0.35rem;
  -webkit-mask-image: linear-gradient(
    to bottom,
    transparent 0,
    #000 var(--ww-lyrics-edge-fade),
    #000 calc(100% - var(--ww-lyrics-edge-fade)),
    transparent 100%
  );
  mask-image: linear-gradient(
    to bottom,
    transparent 0,
    #000 var(--ww-lyrics-edge-fade),
    #000 calc(100% - var(--ww-lyrics-edge-fade)),
    transparent 100%
  );
}

.ww-lyrics--immersion .ww-lyrics__viewport {
  --ww-lyrics-edge-fade: 4.5rem;
}

.ww-lyrics__list {
  list-style: none;
  margin: 0;
  padding-left: 0;
  padding-right: 0;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: none;
  user-select: none;
  -webkit-user-select: none;
  touch-action: none;
  cursor: grab;
  overscroll-behavior: contain;
}

.ww-lyrics__list.is-dragging {
  cursor: grabbing;
}

.ww-lyrics__list::-webkit-scrollbar {
  display: none;
}

.ww-lyrics__list li {
  padding: 0.5rem 0.75rem;
  font-size: 1.1875rem;
  line-height: 1.55;
  color: color-mix(in srgb, var(--ww-ink) 38%, transparent);
  text-align: center;
  border-radius: var(--ww-radius-full);
  transform-origin: center center;
  transition:
    color 0.42s cubic-bezier(0.22, 1, 0.36, 1),
    font-size 0.48s cubic-bezier(0.22, 1, 0.36, 1),
    font-weight 0.38s cubic-bezier(0.22, 1, 0.36, 1);
}

.ww-lyrics__list.is-dragging li {
  transition-duration: 0.18s;
}

.ww-lyrics__list li.is-seekable {
  cursor: pointer;
}

.ww-lyrics__list li.is-seekable:hover {
  color: color-mix(in srgb, var(--ww-ink) 72%, transparent);
}

.ww-lyrics__list li.is-near {
  color: color-mix(in srgb, var(--ww-ink) 58%, transparent);
  font-size: 1.25rem;
}

.ww-lyrics__list li.is-active {
  color: var(--ww-ink);
  font-weight: 600;
  font-size: clamp(1.28rem, 2.5vw, 1.55rem);
}

[data-theme='dark'] .ww-lyrics__list li {
  color: color-mix(in srgb, var(--ww-ink) 34%, transparent);
}

[data-theme='dark'] .ww-lyrics__list li.is-near {
  color: color-mix(in srgb, var(--ww-ink) 52%, transparent);
}

[data-theme='dark'] .ww-lyrics__list li.is-active {
  color: var(--ww-ink);
  text-shadow: 0 1px 12px color-mix(in srgb, black 35%, transparent);
}

.ww-lyrics--immersion .ww-lyrics__list li.is-active {
  font-size: clamp(1.55rem, 3.8vw, 2.15rem);
}

.ww-lyrics--duet {
  width: 100%;
  max-width: 52rem;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  padding: 0 1.35rem;
}

.ww-lyrics__duet-stage {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  flex: 1;
  min-height: 0;
  width: 100%;
  overflow: hidden;
}

.ww-lyrics__duet-spacer {
  flex-shrink: 0;
  width: 100%;
  transition: height 0.52s cubic-bezier(0.22, 1, 0.36, 1);
}

.ww-lyrics__duet-pair {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  flex-shrink: 0;
  width: 100%;
  padding: 0 0.65rem;
}

.ww-lyrics__duet-left,
.ww-lyrics__duet-right {
  max-width: 100%;
  min-width: 0;
}

.ww-lyrics__duet-left.is-seekable,
.ww-lyrics__duet-right.is-seekable {
  cursor: pointer;
}

.ww-lyrics__duet-left.is-seekable:hover .ww-lyrics__duet-line,
.ww-lyrics__duet-right.is-seekable:hover .ww-lyrics__duet-line {
  color: color-mix(in srgb, var(--ww-ink) 72%, transparent);
}

.ww-lyrics__duet-left {
  align-self: flex-start;
  width: 100%;
  max-width: min(68%, 34rem);
  padding-left: 0.35rem;
}

.ww-lyrics__duet-right {
  align-self: flex-end;
  width: 100%;
  max-width: min(68%, 34rem);
  padding-right: 0.35rem;
}

.ww-lyrics__duet-line {
  margin: 0;
  font-size: clamp(1.15rem, 2.75vw, 1.4rem);
  line-height: 1.55;
  color: color-mix(in srgb, var(--ww-ink) 42%, transparent);
  font-weight: 400;
  transform-origin: left center;
  transition:
    color 0.45s cubic-bezier(0.22, 1, 0.36, 1),
    font-weight 0.4s cubic-bezier(0.22, 1, 0.36, 1),
    transform 0.48s cubic-bezier(0.22, 1, 0.36, 1),
    font-size 0.48s cubic-bezier(0.22, 1, 0.36, 1);
}

.ww-lyrics__duet-right .ww-lyrics__duet-line {
  transform-origin: right center;
}

.ww-lyrics__duet-left .ww-lyrics__duet-line {
  text-align: left;
}

.ww-lyrics__duet-right .ww-lyrics__duet-line {
  text-align: right;
}

.ww-lyrics__duet-left.is-active .ww-lyrics__duet-line,
.ww-lyrics__duet-right.is-active .ww-lyrics__duet-line {
  color: var(--ww-ink);
  font-weight: 600;
  font-size: clamp(1.2rem, 2.7vw, 1.45rem);
}

.ww-lyrics--immersion {
  align-items: stretch;
}

.ww-lyrics__empty,
.ww-lyrics__plain-hint {
  margin: auto;
  text-align: center;
  font-size: 0.875rem;
  color: var(--ww-ink-faint);
  user-select: none;
}
</style>
