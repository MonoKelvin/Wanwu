<script setup lang="ts">
import type { NormalizedTrack } from '@modules/music/domain/types'
import MusicCover from '@modules/music/components/MusicCover.vue'
import MusicPlayingBars from '@modules/music/components/MusicPlayingBars.vue'
import MusicProviderBadge from '@modules/music/components/MusicProviderBadge.vue'
import MusicTrackBadges from '@modules/music/components/MusicTrackBadges.vue'
import WwIcon from '@shared/components/WwIcon.vue'

const props = defineProps<{
  track: NormalizedTrack
  index?: number
  rank?: number
  playing?: boolean
  loading?: boolean
  showProvider?: boolean
}>()

const emit = defineEmits<{ play: [track: NormalizedTrack] }>()

function formatDuration(sec?: number): string {
  if (!sec || sec <= 0) return ''
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}
</script>

<template>
  <button
    type="button"
    class="ww-track-row"
    :class="{ 'is-playing': playing, 'is-loading': loading }"
    @click="emit('play', track)"
  >
    <span v-if="rank != null" class="ww-track-row__rank">{{ rank }}</span>
    <span v-else-if="index != null" class="ww-track-row__rank">{{ index + 1 }}</span>
        <MusicCover
          :src="track.coverUrl"
          :video-id="track.videoId"
          :provider="track.provider"
          :title="track.title"
          size="thumb"
          class="ww-track-row__cover"
        />
    <span class="ww-track-row__meta">
      <span class="ww-track-row__title-row">
        <span class="ww-track-row__title">{{ track.title }}</span>
        <MusicTrackBadges v-if="track.badges?.length || track.isTrial" :track="track" compact />
        <MusicProviderBadge v-if="showProvider && track.provider !== 'verome'" :provider="track.provider" />
      </span>
      <span class="ww-track-row__artist">{{ track.artist }}</span>
    </span>
    <span class="ww-track-row__tail">
      <span class="ww-track-row__action">
        <span
          v-show="!playing && !loading && track.durationSec"
          class="ww-track-row__duration"
        >{{ formatDuration(track.durationSec) }}</span>
        <WwIcon
          v-if="loading"
          name="loader"
          size="sm"
          spin
          class="ww-track-row__status-item ww-track-row__loading"
        />
        <MusicPlayingBars
          v-else-if="playing"
          class="ww-track-row__status-item ww-track-row__playing-bars"
        />
        <WwIcon
          v-else
          name="play"
          size="sm"
          filled
          class="ww-track-row__status-item ww-track-row__play-hint"
        />
      </span>
    </span>
  </button>
</template>

<style scoped>
.ww-track-row {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  width: 100%;
  padding: 0.55rem 0.85rem;
  border: none;
  border-radius: var(--ww-music-inner-radius, 0.875rem);
  background: transparent;
  cursor: pointer;
  text-align: left;
  transition:
    background 0.15s var(--ww-ease-out),
    transform 0.15s var(--ww-ease-out);
}
.ww-track-row:hover {
  background: var(--ww-list-hover-bg);
}
.ww-track-row:active {
  transform: scale(0.995);
}
.ww-track-row.is-playing {
  background: color-mix(in srgb, var(--ww-list-selected-accent, var(--ww-accent)) 10%, transparent);
}

[data-theme='dark'] .ww-track-row.is-playing {
  background: color-mix(in srgb, var(--ww-accent) 12%, transparent);
}
.ww-track-row__rank {
  width: 1.75rem;
  flex-shrink: 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--ww-ink-faint);
  text-align: center;
}

.ww-track-row.is-playing .ww-track-row__rank {
  color: var(--ww-accent);
}
.ww-track-row__cover {
  width: 2.75rem;
  height: 2.75rem;
  flex-shrink: 0;
  border-radius: var(--ww-music-inner-radius, 0.875rem);
  overflow: hidden;
}

.ww-track-row__cover :deep(.ww-music-cover__frame) {
  border-radius: var(--ww-music-inner-radius, 0.875rem);
}
.ww-track-row__meta {
  flex: 1;
  min-width: 0;
}
.ww-track-row__title-row {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  min-width: 0;
}
.ww-track-row__title {
  font-size: var(--ww-music-fs-md);
  font-weight: 500;
  color: var(--ww-ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ww-track-row.is-playing .ww-track-row__title {
  color: var(--ww-accent);
}
.ww-track-row__artist {
  display: block;
  margin-top: 0.125rem;
  font-size: var(--ww-music-fs-sm);
  color: var(--ww-ink-faint);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ww-track-row__tail {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  height: 2.75rem;
  min-width: 2rem;
  padding-right: 0.8rem;
}

.ww-track-row__action {
  position: relative;
  width: 2rem;
  height: 1rem;
  line-height: 1;
}

.ww-track-row__duration,
.ww-track-row__status-item {
  position: absolute;
  right: 0;
  top: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  transform: translateY(-50%);
  line-height: 1;
}

.ww-track-row__duration {
  font-size: var(--ww-music-fs-sm);
  color: var(--ww-ink-faint);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  transition: opacity 0.15s var(--ww-ease-out);
}

.ww-track-row__play-hint {
  color: var(--ww-ink);
  opacity: 0;
  transition: opacity 0.15s var(--ww-ease-out);
}

.ww-track-row__play-hint :deep(svg) {
  display: block;
}

.ww-track-row:hover:not(.is-playing):not(.is-loading) .ww-track-row__play-hint {
  opacity: 0.72;
}

.ww-track-row:hover:not(.is-playing):not(.is-loading) .ww-track-row__duration {
  opacity: 0;
}

.ww-track-row.is-loading {
  opacity: 0.85;
}

.ww-track-row__loading {
  color: var(--ww-ink-muted);
}

.ww-track-row__loading :deep(svg) {
  display: block;
}

.ww-track-row__playing-bars :deep(.ww-music-playing-bars) {
  align-items: center;
}
</style>
