<script setup lang="ts">
import { ref } from 'vue'
import type { NormalizedTrack } from '@shared/types/music'
import MusicCover from '@modules/music/components/MusicCover.vue'
import WwMarqueeText from '@shared/components/WwMarqueeText.vue'
import { useDragScroll } from '@modules/music/composables/useDragScroll'

defineProps<{
  tracks: NormalizedTrack[]
  loading?: boolean
}>()

const emit = defineEmits<{
  play: [track: NormalizedTrack, index: number]
}>()

const rowRef = ref<HTMLElement | null>(null)
const { shouldIgnoreClick } = useDragScroll(rowRef)

function onCardClick(track: NormalizedTrack, index: number) {
  if (shouldIgnoreClick()) return
  emit('play', track, index)
}
</script>

<template>
  <div v-if="loading" class="ww-music-track-carousel ww-music-skeleton ww-music-carousel-wrap">
    <div class="ww-music-scroll-row">
      <div v-for="n in 6" :key="n" class="ww-music-skeleton__discover-card">
      <div class="ww-music-skeleton__discover-cover" />
      <div class="ww-music-skeleton__discover-line ww-music-skeleton__discover-line--title" />
      <div class="ww-music-skeleton__discover-line ww-music-skeleton__discover-line--sub" />
      </div>
    </div>
  </div>
  <div v-else-if="!tracks.length" class="ww-music-state-hint">暂无曲目</div>
  <div v-else class="ww-music-track-carousel ww-music-carousel-wrap">
    <div ref="rowRef" class="ww-music-scroll-row">
      <div
        v-for="(track, i) in tracks"
        :key="track.trackKey"
        role="button"
        tabindex="0"
        class="ww-music-card-item"
        @click="onCardClick(track, i)"
        @keydown.enter.prevent="onCardClick(track, i)"
        @keydown.space.prevent="onCardClick(track, i)"
      >
        <MusicCover
          :src="track.coverUrl"
          :video-id="track.videoId"
          :provider="track.provider"
          :title="track.title"
          size="card"
          shape="square"
          show-play
          class="ww-music-card-item__cover"
          @play="emit('play', track, i)"
        />
        <span class="ww-music-card-item__meta">
          <WwMarqueeText :text="track.title" class="ww-music-card-item__title" />
          <span class="ww-music-card-item__sub ww-music-text-ellipsis">{{ track.artist }}</span>
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ww-music-track-carousel {
  --ww-music-card-size: 8.25rem;
}

.ww-music-track-carousel :deep(.ww-music-card-item) {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  text-align: center;
}

.ww-music-track-carousel :deep(.ww-music-card-item__cover) {
  width: 100%;
  height: auto;
  aspect-ratio: 1;
  border-radius: 0.65rem;
  overflow: hidden;
}

.ww-music-track-carousel :deep(.ww-music-card-item__cover .ww-music-cover__frame) {
  border-radius: 0.65rem;
}

.ww-music-track-carousel :deep(.ww-music-card-item__meta) {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-width: 0;
  margin-top: 0.3rem;
  gap: 0.05rem;
}

.ww-music-track-carousel :deep(.ww-music-card-item__title) {
  margin-top: 0;
  font-size: 0.75rem;
  line-height: 1.25;
  font-weight: 500;
  color: var(--ww-ink);
}

.ww-music-track-carousel :deep(.ww-music-card-item__sub) {
  margin-top: 0;
  font-size: 0.6875rem;
  line-height: 1.1;
}

.ww-music-track-carousel.ww-music-skeleton .ww-music-scroll-row {
  display: flex;
  gap: var(--ww-music-card-gap);
  overflow: hidden;
}

.ww-music-skeleton__discover-card {
  flex: 0 0 var(--ww-music-card-size);
  width: var(--ww-music-card-size);
  display: flex;
  flex-direction: column;
  align-items: stretch;
}

.ww-music-skeleton__discover-cover {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 0.65rem;
  background: linear-gradient(
    115deg,
    var(--ww-surface-hover) 0%,
    color-mix(in srgb, var(--ww-surface-hover) 55%, transparent) 45%,
    var(--ww-surface-hover) 90%
  );
  background-size: 200% 200%;
  animation: ww-music-shimmer 1.2s ease-in-out infinite;
}

.ww-music-skeleton__discover-line {
  height: 0.5rem;
  margin-top: 0.35rem;
  border-radius: 999px;
  background: linear-gradient(
    115deg,
    var(--ww-surface-hover) 0%,
    color-mix(in srgb, var(--ww-surface-hover) 55%, transparent) 45%,
    var(--ww-surface-hover) 90%
  );
  background-size: 200% 200%;
  animation: ww-music-shimmer 1.2s ease-in-out infinite;
}

.ww-music-skeleton__discover-line--title {
  width: 88%;
  align-self: center;
}

.ww-music-skeleton__discover-line--sub {
  width: 62%;
  align-self: center;
  margin-top: 0.25rem;
}
</style>
