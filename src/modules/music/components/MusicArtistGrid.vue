<script setup lang="ts">
import MusicCover from '@modules/music/components/MusicCover.vue'

export interface ArtistGridItem {
  id: string
  title: string
  coverUrl?: string
}

defineProps<{
  items: ArtistGridItem[]
  loading?: boolean
  loadingMore?: boolean
}>()

const emit = defineEmits<{ select: [item: ArtistGridItem] }>()
</script>

<template>
  <div v-if="loading" class="ww-music-artist-grid ww-music-skeleton">
    <div v-for="n in 18" :key="n" class="ww-music-artist-grid__cell">
      <div class="ww-music-artist-grid__sk-cover" />
      <div class="ww-music-artist-grid__sk-line" />
    </div>
  </div>
  <div v-else-if="items.length" class="ww-music-artist-grid">
    <button
      v-for="item in items"
      :key="item.id"
      type="button"
      class="ww-music-artist-grid__cell"
      @click="emit('select', item)"
    >
      <MusicCover
        :src="item.coverUrl"
        :title="item.title"
        shape="circle"
        size="card"
        class="ww-music-artist-grid__cover"
      />
      <span class="ww-music-artist-grid__name ww-music-text-ellipsis">{{ item.title }}</span>
    </button>
    <p v-if="loadingMore" class="ww-music-artist-grid__more">加载更多…</p>
  </div>
  <p v-else class="ww-music-state-hint">暂无歌手数据</p>
</template>

<style scoped>
.ww-music-artist-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(5.75rem, 1fr));
  gap: 1rem 0.75rem;
}

.ww-music-artist-grid__cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.45rem;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  min-width: 0;
  text-align: center;
}

.ww-music-artist-grid__cell:hover .ww-music-artist-grid__name {
  color: var(--ww-ink);
}

.ww-music-artist-grid__cover {
  width: 100%;
  max-width: 5.75rem;
  aspect-ratio: 1;
}

.ww-music-artist-grid__cover :deep(.ww-music-cover__frame) {
  border-radius: 50%;
}

.ww-music-artist-grid__name {
  width: 100%;
  font-size: var(--ww-music-fs-sm, 0.75rem);
  color: var(--ww-ink-muted, var(--ww-ink-faint));
}

.ww-music-artist-grid__more {
  grid-column: 1 / -1;
  margin: 0.25rem 0 0;
  text-align: center;
  font-size: var(--ww-music-fs-sm, 0.75rem);
  color: var(--ww-ink-faint);
}

.ww-music-artist-grid__sk-cover {
  width: 100%;
  max-width: 5.75rem;
  aspect-ratio: 1;
  margin: 0 auto;
  border-radius: 50%;
  background: var(--ww-surface-hover);
  animation: ww-music-shimmer 1.2s ease-in-out infinite;
}

.ww-music-artist-grid__sk-line {
  width: 72%;
  height: 0.5rem;
  margin: 0 auto;
  border-radius: 999px;
  background: var(--ww-surface-hover);
  animation: ww-music-shimmer 1.2s ease-in-out infinite;
}
</style>
