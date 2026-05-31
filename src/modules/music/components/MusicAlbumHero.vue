<script setup lang="ts">
import MusicCover from '@modules/music/components/MusicCover.vue'

defineProps<{
  title: string
  subtitle?: string
  coverUrl?: string
  meta?: string
}>()
</script>

<template>
  <div class="ww-album-hero">
    <MusicCover :src="coverUrl" :title="title" size="hero" shadow-glow class="ww-album-hero__cover" />
    <div class="ww-album-hero__info">
      <p v-if="subtitle" class="ww-album-hero__type">{{ subtitle }}</p>
      <h1 class="ww-album-hero__title">{{ title }}</h1>
      <p v-if="meta" class="ww-album-hero__meta">{{ meta }}</p>
      <slot />
    </div>
  </div>
</template>

<style scoped>
.ww-album-hero {
  display: grid;
  grid-template-columns: minmax(8rem, 12rem) 1fr;
  gap: 1.25rem;
  align-items: end;
  margin-bottom: 1.5rem;
  padding-bottom: 1.25rem;
  border-bottom: 1px solid var(--ww-border-subtle);
}
@media (max-width: 640px) {
  .ww-album-hero {
    grid-template-columns: 1fr;
  }
}
.ww-album-hero__cover {
  width: 100%;
  aspect-ratio: 1;
  border-radius: var(--ww-music-cover-radius, var(--ww-radius-md));
  overflow: hidden;
  box-shadow: 0 16px 40px color-mix(in srgb, var(--ww-ink) 14%, transparent);
}
.ww-album-hero__type {
  margin: 0 0 0.35rem;
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ww-ink-faint);
}
.ww-album-hero__title {
  margin: 0;
  font-size: clamp(1.25rem, 3vw, 1.75rem);
  font-weight: 700;
  color: var(--ww-ink);
  letter-spacing: -0.02em;
}
.ww-album-hero__meta {
  margin: 0.5rem 0 0;
  font-size: 0.8125rem;
  color: var(--ww-ink-muted);
}
</style>
