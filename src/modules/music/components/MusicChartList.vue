<script setup lang="ts">
import { computed, inject, ref, watch } from 'vue'
import type { NormalizedTrack } from '@modules/music/domain/types'
import MusicTrackRow from '@modules/music/components/MusicTrackRow.vue'
import { useMusicPlayerStore } from '@modules/music/stores/musicPlayer'
import { musicScrollBodyKey } from '@modules/music/lib/musicScrollBodyKey'
import { useChartListVirtual } from '@modules/music/composables/useChartListVirtual'

const props = defineProps<{
  tracks: NormalizedTrack[]
  showProvider?: boolean
  panel?: boolean
  loading?: boolean
}>()

const emit = defineEmits<{
  play: [track: NormalizedTrack, index: number]
}>()

const player = useMusicPlayerStore()
const currentKey = computed(() => player.currentTrack?.trackKey)
const loadingKey = computed(() => (player.loading ? player.currentTrack?.trackKey : undefined))

const listRef = ref<HTMLElement | null>(null)
const scrollEl = inject(musicScrollBodyKey, ref<HTMLElement | null>(null))
const { enabled, range, measure } = useChartListVirtual(
  scrollEl,
  listRef,
  computed(() => props.tracks.length)
)

const visibleTracks = computed(() => {
  if (!enabled.value) return props.tracks.map((track, index) => ({ track, index }))
  return props.tracks.slice(range.value.start, range.value.end).map((track, i) => ({
    track,
    index: range.value.start + i
  }))
})

watch(
  () => props.tracks.length,
  () => measure()
)
</script>

<template>
  <div v-if="loading" class="ww-chart-list ww-music-skeleton ww-chart-list--skeleton">
    <div v-for="n in 6" :key="n" class="ww-chart-list__skeleton-row">
      <div class="ww-chart-list__skeleton-rank" />
      <div class="ww-chart-list__skeleton-cover" />
      <div class="ww-chart-list__skeleton-lines">
        <div class="ww-chart-list__skeleton-line ww-chart-list__skeleton-line--title" />
        <div class="ww-chart-list__skeleton-line ww-chart-list__skeleton-line--sub" />
      </div>
    </div>
  </div>
  <div
    v-else
    ref="listRef"
    class="ww-chart-list"
    :class="{ 'ww-music-track-panel': props.panel, 'is-virtual': enabled }"
    :style="enabled ? { minHeight: `${range.totalHeight}px` } : undefined"
  >
    <div
      class="ww-chart-list__window"
      :style="enabled ? { transform: `translateY(${range.offsetY}px)` } : undefined"
    >
      <MusicTrackRow
        v-for="{ track, index } in visibleTracks"
        :key="track.trackKey"
        :track="track"
        :rank="index + 1"
        :playing="currentKey === track.trackKey && player.isPlaying"
        :loading="loadingKey === track.trackKey"
        :show-provider="showProvider"
        @play="emit('play', track, index)"
      />
    </div>
  </div>
</template>

<style scoped>
.ww-chart-list {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.ww-chart-list.is-virtual {
  position: relative;
}

.ww-chart-list__window {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.ww-chart-list--skeleton {
  gap: 0.55rem;
}

.ww-chart-list__skeleton-row {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.35rem 0.15rem;
}

.ww-chart-list__skeleton-rank {
  width: 1.25rem;
  height: 0.75rem;
  border-radius: 999px;
  background: var(--ww-surface-hover);
  animation: ww-music-shimmer 1.2s ease-in-out infinite;
}

.ww-chart-list__skeleton-cover {
  width: 2.75rem;
  height: 2.75rem;
  border-radius: var(--ww-music-inner-radius, 0.875rem);
  background: var(--ww-surface-hover);
  animation: ww-music-shimmer 1.2s ease-in-out infinite;
}

.ww-chart-list__skeleton-lines {
  flex: 1;
  min-width: 0;
}

.ww-chart-list__skeleton-line {
  height: 0.55rem;
  border-radius: 999px;
  background: var(--ww-surface-hover);
  animation: ww-music-shimmer 1.2s ease-in-out infinite;
}

.ww-chart-list__skeleton-line--title {
  width: 52%;
}

.ww-chart-list__skeleton-line--sub {
  width: 34%;
  margin-top: 0.35rem;
}
</style>
