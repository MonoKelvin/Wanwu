<script setup lang="ts">
import { ref } from 'vue'
import type { MusicChartCard } from '@shared/types/music'
import MusicCover from '@modules/music/components/MusicCover.vue'
import WwMarqueeText from '@shared/components/WwMarqueeText.vue'
import { useDragScroll } from '@modules/music/composables/useDragScroll'

defineProps<{ cards: MusicChartCard[] }>()
const emit = defineEmits<{ select: [card: MusicChartCard] }>()

const rowRef = ref<HTMLElement | null>(null)
const { shouldIgnoreClick } = useDragScroll(rowRef)

function cardKey(card: MusicChartCard): string {
  return card.playlistId ?? card.browseId ?? card.title
}

function onSelect(card: MusicChartCard) {
  if (shouldIgnoreClick()) return
  emit('select', card)
}
</script>

<template>
  <div class="ww-music-chart-carousel ww-music-carousel-wrap">
    <div ref="rowRef" class="ww-music-scroll-row">
      <div
        v-for="card in cards"
        :key="cardKey(card)"
        role="button"
        tabindex="0"
        class="ww-music-card-item"
        @click="onSelect(card)"
        @keydown.enter.prevent="onSelect(card)"
        @keydown.space.prevent="onSelect(card)"
      >
        <MusicCover
          :src="card.coverUrl"
          :title="card.title"
          size="card"
          shape="square"
          class="ww-music-card-item__cover"
        />
        <span class="ww-music-card-item__meta">
          <WwMarqueeText :text="card.title" class="ww-music-card-item__title" />
          <WwMarqueeText
            v-if="card.subtitle"
            :text="card.subtitle"
            class="ww-music-card-item__sub"
          />
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ww-music-chart-carousel {
  --ww-music-card-size: 8.75rem;
}

.ww-music-chart-carousel :deep(.ww-music-card-item) {
  text-align: center;
}

.ww-music-chart-carousel :deep(.ww-music-card-item__meta) {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-width: 0;
  margin-top: 0.35rem;
  gap: 0.08rem;
}

.ww-music-chart-carousel :deep(.ww-music-card-item__cover) {
  width: 100%;
  height: auto;
  aspect-ratio: 1;
  border-radius: 0.55rem;
  overflow: hidden;
}

.ww-music-chart-carousel :deep(.ww-music-card-item__cover .ww-music-cover__frame) {
  border-radius: 0.55rem;
}

.ww-music-chart-carousel :deep(.ww-music-card-item__title) {
  margin-top: 0;
  font-size: 0.75rem;
  font-weight: 500;
  line-height: 1.2;
  color: var(--ww-ink);
}

.ww-music-chart-carousel :deep(.ww-music-card-item__sub) {
  margin-top: 0;
  font-size: 0.6875rem;
  line-height: 1.15;
  color: var(--ww-ink-faint);
}
</style>
