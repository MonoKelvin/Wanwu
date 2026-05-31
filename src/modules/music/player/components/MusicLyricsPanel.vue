<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import WwMarqueeText from '@shared/components/WwMarqueeText.vue'
import { parseLrc, lrcLineAt, type LrcLine } from '@modules/music/composables/parseLrc'
import { formatPlayError } from '@modules/music/lib/formatPlayError'
import { useMusicPlayerStore } from '@modules/music/stores/musicPlayer'

const props = defineProps<{
  variant?: 'list' | 'duet' | 'immersion'
}>()

const player = useMusicPlayerStore()
const lines = ref<LrcLine[]>([])
const synced = ref(true)
const listRef = ref<HTMLElement | null>(null)

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

const activeIndex = computed(() => {
  if (!synced.value || !lines.value.length) return -1
  return lrcLineAt(lines.value, player.progress)
})

const activeLine = computed(() => lines.value[activeIndex.value]?.text ?? '')
const nextLine = computed(() => lines.value[activeIndex.value + 1]?.text ?? '')

const duetLeftText = computed(() => activeLine.value || lines.value[0]?.text || '')
const duetRightText = computed(() => nextLine.value)

const useScrollList = computed(
  () => props.variant === 'list' || props.variant === 'immersion'
)

function onLineClick(line: LrcLine) {
  if (!synced.value || !Number.isFinite(line.timeSec)) return
  player.seekAndPlay(line.timeSec)
}

watch(activeIndex, async (idx) => {
  if (!useScrollList.value || idx < 0) return
  await nextTick()
  const el = listRef.value?.querySelector(`[data-idx="${idx}"]`) as HTMLElement | null
  el?.scrollIntoView({ block: 'center', behavior: 'smooth' })
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
      <div class="ww-lyrics__duet-left">
        <WwMarqueeText :text="duetLeftText" tag="p" class="ww-lyrics__duet-line" />
      </div>
      <div v-if="duetRightText" class="ww-lyrics__duet-right">
        <WwMarqueeText :text="duetRightText" tag="p" class="ww-lyrics__duet-line" />
      </div>
    </template>

    <ul
      v-else-if="useScrollList && lines.length"
      ref="listRef"
      class="ww-lyrics__list"
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
        @click="onLineClick(line)"
      >
        {{ line.text }}
      </li>
    </ul>

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

.ww-lyrics__list {
  list-style: none;
  margin: 0;
  padding: 2rem 0;
  max-height: 100%;
  overflow-y: auto;
  scroll-behavior: smooth;
  scrollbar-width: none;
  mask-image: linear-gradient(
    180deg,
    transparent,
    #000 14%,
    #000 86%,
    transparent
  );
}

.ww-lyrics__list::-webkit-scrollbar {
  display: none;
}

.ww-lyrics__list li {
  padding: 0.5rem 0.75rem;
  font-size: 0.9375rem;
  line-height: 1.6;
  color: color-mix(in srgb, var(--ww-ink) 38%, transparent);
  text-align: center;
  border-radius: var(--ww-radius-full);
  transition:
    color 0.35s var(--ww-ease-out),
    transform 0.35s cubic-bezier(0.34, 1.1, 0.64, 1),
    opacity 0.35s var(--ww-ease-out),
    font-size 0.35s var(--ww-ease-out);
}

.ww-lyrics__list li.is-seekable {
  cursor: pointer;
}

.ww-lyrics__list li.is-seekable:hover {
  color: color-mix(in srgb, var(--ww-ink) 72%, transparent);
}

.ww-lyrics__list li.is-near {
  color: color-mix(in srgb, var(--ww-ink) 58%, transparent);
  font-size: 1rem;
}

.ww-lyrics__list li.is-active {
  color: var(--ww-ink);
  font-weight: 600;
  font-size: clamp(1.05rem, 2.2vw, 1.35rem);
  transform: scale(1.02);
  text-shadow: 0 0 24px color-mix(in srgb, var(--ww-ink) 12%, transparent);
}

.ww-lyrics--immersion .ww-lyrics__list li.is-active {
  font-size: clamp(1.25rem, 3.5vw, 2rem);
}

.ww-lyrics--duet {
  width: 100%;
  max-width: 52rem;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  justify-content: center;
  flex: 1;
  min-height: 0;
  padding: 0 0.25rem;
}

.ww-lyrics__duet-left,
.ww-lyrics__duet-right {
  max-width: 100%;
  min-width: 0;
}

.ww-lyrics__duet-left {
  align-self: flex-start;
  width: 100%;
  max-width: min(72%, 36rem);
}

.ww-lyrics__duet-right {
  align-self: flex-end;
  width: 100%;
  max-width: min(72%, 36rem);
}

.ww-lyrics__duet-line {
  margin: 0;
  font-size: clamp(1rem, 2.4vw, 1.2rem);
  line-height: 1.55;
  color: var(--ww-ink-muted);
}

.ww-lyrics__duet-left .ww-lyrics__duet-line {
  color: var(--ww-ink);
  font-weight: 600;
  text-align: left;
}

.ww-lyrics__duet-right .ww-lyrics__duet-line {
  text-align: right;
}

.ww-lyrics--immersion {
  align-items: stretch;
  justify-content: center;
}

.ww-lyrics__empty,
.ww-lyrics__plain-hint {
  margin: auto;
  text-align: center;
  font-size: 0.875rem;
  color: var(--ww-ink-faint);
}
</style>
