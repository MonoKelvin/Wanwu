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

const shadowStyle = computed(() =>
  imageUrl.value ? { backgroundImage: `url("${imageUrl.value}")` } : undefined
)

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
    <div
      v-if="imageUrl"
      class="ww-music-player-hero-cover__shadow"
      :style="shadowStyle"
      aria-hidden="true"
    />
    <div class="ww-music-player-hero-cover__frame">
      <img
        v-if="imageUrl"
        :src="imageUrl"
        :alt="title ?? ''"
        class="ww-music-player-hero-cover__img"
        draggable="false"
        referrerpolicy="no-referrer"
        @error="onImgError"
        @dragstart.prevent
      />
    </div>
  </div>
</template>

<style scoped>
.ww-music-player-hero-cover {
  position: relative;
  width: 100%;
  max-width: 16.5rem;
  margin: auto;
  aspect-ratio: 1 / 1.1;
}

.ww-music-player-hero-cover__frame {
  position: relative;
  z-index: 1;
  width: 100%;
  height: 100%;
  border-radius: 0.75rem;
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

.ww-music-player-hero-cover__shadow {
  position: absolute;
  z-index: 0;
  inset: -4%;
  border-radius: 0.75rem;
  background-size: cover;
  background-position: center;
  filter: blur(44px) saturate(1.05);
  opacity: 0.36;
  transform: translateY(25%) scale(1.18);
  pointer-events: none;
}
</style>
