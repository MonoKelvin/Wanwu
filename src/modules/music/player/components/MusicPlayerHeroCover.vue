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

const coverKey = computed(
  () => `${props.provider ?? ''}:${props.videoId ?? ''}:${props.src ?? ''}`
)

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
        <Transition name="ww-cover-fade" mode="out-in">
          <img
            v-if="imageUrl"
            :key="coverKey"
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
        </Transition>
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

.ww-cover-fade-enter-active {
  transition:
    opacity 0.28s cubic-bezier(0.22, 1, 0.36, 1),
    transform 0.32s cubic-bezier(0.22, 1, 0.36, 1);
}

.ww-cover-fade-leave-active {
  transition:
    opacity 0.16s cubic-bezier(0.55, 0, 1, 0.45),
    transform 0.18s cubic-bezier(0.55, 0, 1, 0.45);
}

.ww-cover-fade-enter-from {
  opacity: 0;
  transform: scale(0.92);
}

.ww-cover-fade-leave-to {
  opacity: 0;
  transform: scale(1.04);
}

@media (prefers-reduced-motion: reduce) {
  .ww-cover-fade-enter-active,
  .ww-cover-fade-leave-active {
    transition-duration: 0.01ms;
  }

  .ww-cover-fade-enter-from,
  .ww-cover-fade-leave-to {
    transform: none;
  }
}
</style>
