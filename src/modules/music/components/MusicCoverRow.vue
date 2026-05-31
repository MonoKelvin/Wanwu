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

defineProps<{ items: CoverRowItem[] }>()
const emit = defineEmits<{ select: [item: CoverRowItem] }>()

const rowRef = ref<HTMLElement | null>(null)
const { shouldIgnoreClick } = useDragScroll(rowRef)

function onSelect(item: CoverRowItem) {
  if (shouldIgnoreClick()) return
  emit('select', item)
}
</script>

<template>
  <div class="ww-music-carousel-wrap">
    <div ref="rowRef" class="ww-music-scroll-row">
      <div
        v-for="item in items"
        :key="item.id"
        role="button"
        tabindex="0"
        class="ww-music-card-item"
        @click="onSelect(item)"
        @keydown.enter.prevent="onSelect(item)"
        @keydown.space.prevent="onSelect(item)"
      >
        <MusicCover
          :src="item.coverUrl"
          :title="item.title"
          :shape="item.shape ?? 'square'"
          size="card"
          class="ww-music-card-item__cover"
        />
        <span class="ww-music-card-item__title ww-music-text-ellipsis">{{ item.title }}</span>
        <span v-if="item.subtitle" class="ww-music-card-item__sub ww-music-text-ellipsis">{{
          item.subtitle
        }}</span>
      </div>
    </div>
  </div>
</template>
