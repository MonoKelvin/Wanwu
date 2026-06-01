<script setup lang="ts">
import type { MusicArtistPhoto } from '@shared/types/music'

defineProps<{
  photos: MusicArtistPhoto[]
}>()
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
      />
      <figcaption v-if="photo.title" class="ww-artist-photos__caption">{{ photo.title }}</figcaption>
    </figure>
  </div>
  <p v-else class="ww-music-state-hint">暂无写真</p>
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

.ww-artist-photos__img {
  display: block;
  width: 100%;
  height: auto;
  vertical-align: middle;
}

.ww-artist-photos__caption {
  padding: 0.35rem 0.5rem 0.45rem;
  font-size: 0.6875rem;
  line-height: 1.35;
  color: var(--ww-ink-faint);
}
</style>
