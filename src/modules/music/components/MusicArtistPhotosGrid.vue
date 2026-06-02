<script setup lang="ts">
import { computed, ref } from 'vue'
import ImageViewer from '@shared/components/ImageViewer.vue'
import type { ImageViewerSlide } from '@shared/types/image-viewer'
import type { MusicArtistPhoto } from '@shared/types/music'

const props = defineProps<{
  photos: MusicArtistPhoto[]
}>()

const viewerOpen = ref(false)
const viewerIndex = ref(0)

const viewerSlides = computed<ImageViewerSlide[]>(() =>
  props.photos.map((photo) => ({
    url: photo.url,
    alt: photo.title ?? '写真'
  }))
)

function openViewer(index: number) {
  viewerIndex.value = index
  viewerOpen.value = true
}
</script>

<template>
  <div v-if="photos.length" class="ww-artist-photos">
    <figure v-for="(photo, idx) in photos" :key="`${photo.url}-${idx}`" class="ww-artist-photos__item">
      <img
        :src="photo.url"
        :alt="photo.title ?? ''"
        loading="lazy"
        referrerpolicy="no-referrer"
        class="ww-artist-photos__img"
        @click="openViewer(idx)"
      />
      <figcaption v-if="photo.title" class="ww-artist-photos__caption">{{ photo.title }}</figcaption>
    </figure>
  </div>
  <p v-else class="ww-music-state-hint">暂无写真</p>
  <ImageViewer v-model:open="viewerOpen" v-model:index="viewerIndex" :slides="viewerSlides" />
</template>

<style scoped>
.ww-artist-photos {
  column-count: 2;
  column-gap: 0.75rem;
}

@media (min-width: 720px) {
  .ww-artist-photos {
    column-count: 3;
    column-gap: 1rem;
  }
}

@media (min-width: 1024px) {
  .ww-artist-photos {
    column-count: 4;
  }
}

.ww-artist-photos__item {
  break-inside: avoid;
  margin: 0 0 0.75rem;
  border-radius: var(--ww-music-inner-radius, 0.875rem);
  overflow: hidden;
  background: var(--ww-inset);
  box-shadow: 0 4px 16px color-mix(in srgb, var(--ww-ink) 8%, transparent);
}

[data-theme='dark'] .ww-artist-photos__item {
  box-shadow:
    0 10px 30px -12px rgb(0 0 0 / 0.5),
    0 2px 8px -4px rgb(0 0 0 / 0.35);
}

.ww-artist-photos__img {
  display: block;
  width: 100%;
  height: auto;
  vertical-align: middle;
  cursor: zoom-in;
}

.ww-artist-photos__caption {
  padding: 0.35rem 0.5rem 0.45rem;
  font-size: 0.6875rem;
  line-height: 1.35;
  color: var(--ww-ink-faint);
}
</style>
