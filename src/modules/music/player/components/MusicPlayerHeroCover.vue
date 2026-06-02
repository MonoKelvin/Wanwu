<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  listTrackCoverFallbacks,
  upgradeCoverUrl,
  type CoverSize
} from '@shared/utils/musicCoverUrl'
import type { NormalizedTrack } from '@shared/types/music'

const props = defineProps<{
  src?: string
  videoId?: string
  provider?: NormalizedTrack['provider']
  title?: string
}>()

const fallbackIndex = ref(0)

const fallbackUrls = computed(() =>
  listTrackCoverFallbacks(
    {
      coverUrl: props.src,
      videoId: props.videoId,
      provider: props.provider,
      title: props.title
    },
    'hero' satisfies CoverSize
  )
)

const imageUrl = computed(() => {
  const list = fallbackUrls.value
  if (list.length) return list[Math.min(fallbackIndex.value, list.length - 1)]
  return upgradeCoverUrl(props.src, 'hero')
})

function onImgError() {
  if (fallbackIndex.value < fallbackUrls.value.length - 1) {
    fallbackIndex.value += 1
  }
}

watch(
  () => [props.src, props.videoId, props.provider],
  () => {
    fallbackIndex.value = 0
  }
)
</script>

<template>
  <div class="ww-music-player-hero-cover">
    <div class="ww-music-player-hero-cover__frame">
      <img
        v-if="imageUrl"
        :src="imageUrl"
        alt=""
        class="ww-music-player-hero-cover__shadow"
        draggable="false"
        loading="eager"
        fetchpriority="high"
        referrerpolicy="no-referrer"
        aria-hidden="true"
        @error="onImgError"
        @dragstart.prevent
      />
      <div class="ww-music-player-hero-cover__clip">
        <img
          v-if="imageUrl"
          :src="imageUrl"
          :alt="title ?? ''"
          class="ww-music-player-hero-cover__img"
          draggable="false"
          loading="eager"
          fetchpriority="high"
          referrerpolicy="no-referrer"
          @error="onImgError"
          @dragstart.prevent
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.ww-music-player-hero-cover {
  --ww-player-cover-radius: 1.375rem;
  --ww-player-cover-shadow-blur: 3.125rem;
  --ww-player-cover-shadow-offset: 1.375rem;
  --ww-player-cover-shadow-opacity: 0.42;
  position: relative;
  width: 100%;
  max-width: 16.5rem;
  margin: auto;
  aspect-ratio: 1 / 1.1;
  overflow: visible;
}

.ww-music-player-hero-cover__frame {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: visible;
}

.ww-music-player-hero-cover__shadow {
  position: absolute;
  inset: 0;
  z-index: 0;
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: var(--ww-player-cover-radius);
  filter: blur(var(--ww-player-cover-shadow-blur)) saturate(1.15);
  opacity: var(--ww-player-cover-shadow-opacity);
  transform: translateY(var(--ww-player-cover-shadow-offset));
  pointer-events: none;
  -webkit-user-drag: none;
  user-select: none;
}

.ww-music-player-hero-cover__clip {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
  border-radius: var(--ww-player-cover-radius);
  overflow: hidden;
  background: var(--ww-surface-raised);
}

.ww-music-player-hero-cover__img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  -webkit-user-drag: none;
  user-select: none;
}
</style>
