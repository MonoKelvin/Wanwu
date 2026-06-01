<script setup lang="ts">
import MusicCover from '@modules/music/components/MusicCover.vue'

withDefaults(
  defineProps<{
    title: string
    subtitle?: string
    coverUrl?: string
    /** 艺人名、发行信息等单行摘要 */
    meta?: string
    /** 简介（多行，可选） */
    description?: string
    coverShape?: 'square' | 'circle'
  }>(),
  { coverShape: 'square' }
)
</script>

<template>
  <div class="ww-album-hero">
    <MusicCover
      :src="coverUrl"
      :title="title"
      size="hero"
      :shape="coverShape"
      class="ww-album-hero__cover"
    />
    <div class="ww-album-hero__info">
      <span v-if="subtitle" class="ww-album-hero__type">{{ subtitle }}</span>
      <h1 class="ww-album-hero__title">{{ title }}</h1>
      <p v-if="meta" class="ww-album-hero__meta">{{ meta }}</p>
      <p v-if="description" class="ww-album-hero__desc">{{ description }}</p>
      <slot />
    </div>
  </div>
</template>

<style scoped>
.ww-album-hero {
  display: grid;
  grid-template-columns: minmax(8rem, 12rem) 1fr;
  gap: 1.125rem;
  align-items: start;
  margin: 0 0 1.5rem;
  padding: 0 0 1.125rem;
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
  box-shadow: var(--ww-music-hero-cover-box-shadow);
}

.ww-album-hero__info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-start;
  min-width: 0;
  padding-top: 0.125rem;
}

.ww-album-hero__type {
  display: inline-block;
  margin: 0 0 0.5rem;
  padding: 0.28rem 0.65rem;
  font-size: 0.8125rem;
  font-weight: 600;
  letter-spacing: 0.03em;
  line-height: 1.2;
  color: var(--ww-ink);
  background: color-mix(in srgb, var(--ww-accent) 14%, var(--ww-inset));
  border: 1px solid color-mix(in srgb, var(--ww-accent) 22%, var(--ww-border-subtle));
  border-radius: var(--ww-radius-sm, 0.375rem);
}

.ww-album-hero__title {
  margin: 0;
  font-size: clamp(1.35rem, 3.2vw, 1.875rem);
  font-weight: 700;
  color: var(--ww-ink);
  letter-spacing: -0.02em;
  line-height: 1.2;
}

.ww-album-hero__meta {
  margin: 0.4rem 0 0;
  font-size: 0.875rem;
  line-height: 1.45;
  color: var(--ww-ink-muted);
}

.ww-album-hero__desc {
  margin: 0.5rem 0 0;
  font-size: 0.8125rem;
  line-height: 1.55;
  color: var(--ww-ink-faint);
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 4;
  overflow: hidden;
}
</style>
