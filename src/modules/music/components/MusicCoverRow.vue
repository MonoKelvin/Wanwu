<script setup lang="ts">
import { ref } from 'vue'
import MusicCover from '@modules/music/components/MusicCover.vue'
import { useDragScroll } from '@modules/music/composables/useDragScroll'

export interface CoverRowItem {
  id: string
  title: string
  subtitle?: string
  coverUrl?: string
  shape?: 'square' | 'circle'
}

export type CoverRowSize = 'default' | 'album' | 'artist'

withDefaults(
  defineProps<{
    items: CoverRowItem[]
    loading?: boolean
    skeletonCount?: number
    skeletonShape?: 'square' | 'circle'
    size?: CoverRowSize
  }>(),
  { skeletonCount: 6, skeletonShape: 'square', size: 'default' }
)

const emit = defineEmits<{ select: [item: CoverRowItem] }>()

const rowRef = ref<HTMLElement | null>(null)
const { shouldIgnoreClick } = useDragScroll(rowRef)

function onSelect(item: CoverRowItem) {
  if (shouldIgnoreClick()) return
  emit('select', item)
}
</script>

<template>
  <div
    v-if="loading"
    class="ww-music-cover-row ww-music-skeleton ww-music-carousel-wrap"
    :class="`ww-music-cover-row--${size}`"
  >
    <div class="ww-music-scroll-row">
      <div v-for="n in skeletonCount" :key="n" class="ww-music-skeleton__discover-card">
        <div
          class="ww-music-skeleton__discover-cover"
          :class="{ 'ww-music-skeleton__discover-cover--circle': skeletonShape === 'circle' }"
        />
        <div class="ww-music-skeleton__discover-line ww-music-skeleton__discover-line--title" />
        <div
          v-if="size !== 'artist'"
          class="ww-music-skeleton__discover-line ww-music-skeleton__discover-line--sub"
        />
      </div>
    </div>
  </div>
  <div v-else-if="!items.length" class="ww-music-state-hint">暂无内容</div>
  <div v-else class="ww-music-cover-row ww-music-carousel-wrap" :class="`ww-music-cover-row--${size}`">
    <div ref="rowRef" class="ww-music-scroll-row">
      <div
        v-for="item in items"
        :key="item.id"
        role="button"
        tabindex="0"
        class="ww-music-card-item"
        :class="{ 'ww-music-card-item--artist': size === 'artist' || item.shape === 'circle' }"
        @click="onSelect(item)"
        @keydown.enter.prevent="onSelect(item)"
        @keydown.space.prevent="onSelect(item)"
      >
        <MusicCover
          :src="item.coverUrl"
          :title="item.title"
          :shape="item.shape ?? (size === 'artist' ? 'circle' : 'square')"
          size="card"
          class="ww-music-card-item__cover"
        />
        <span class="ww-music-card-item__title ww-music-text-ellipsis">{{ item.title }}</span>
        <span
          v-if="item.subtitle && size !== 'artist'"
          class="ww-music-card-item__sub ww-music-text-ellipsis"
        >{{ item.subtitle }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ww-music-cover-row--album {
  --ww-music-card-size: 6.5rem;
}

.ww-music-cover-row--artist {
  --ww-music-card-size: 5.25rem;
}

.ww-music-cover-row.ww-music-skeleton .ww-music-scroll-row {
  display: flex;
  gap: var(--ww-music-card-gap);
  overflow: hidden;
}

.ww-music-skeleton__discover-cover--circle {
  border-radius: var(--ww-radius-full);
}

.ww-music-cover-row--artist :deep(.ww-music-card-item),
.ww-music-cover-row :deep(.ww-music-card-item--artist) {
  text-align: center;
}

.ww-music-cover-row--artist :deep(.ww-music-card-item__cover),
.ww-music-cover-row :deep(.ww-music-card-item--artist .ww-music-card-item__cover) {
  width: var(--ww-music-card-size);
  height: var(--ww-music-card-size);
  margin: 0 auto;
}

.ww-music-cover-row--artist :deep(.ww-music-card-item__title),
.ww-music-cover-row :deep(.ww-music-card-item--artist .ww-music-card-item__title) {
  display: block;
  margin-top: 0.45rem;
  font-size: 0.6875rem;
  line-height: 1.25;
  text-align: center;
  color: var(--ww-ink);
}

.ww-music-cover-row--album :deep(.ww-music-card-item__title) {
  font-size: 0.6875rem;
  margin-top: 0.35rem;
}

.ww-music-cover-row--album :deep(.ww-music-card-item__sub) {
  font-size: 0.625rem;
}
</style>
