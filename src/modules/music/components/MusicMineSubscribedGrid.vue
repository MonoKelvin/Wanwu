<script setup lang="ts">
import { useRouter } from 'vue-router'
import MusicCoverArt from '@modules/music/components/MusicCoverArt.vue'
import type { MusicPlatformSubscribedItem } from '@shared/types/music'

defineProps<{
  items: MusicPlatformSubscribedItem[]
}>()

const router = useRouter()

function openItem(item: MusicPlatformSubscribedItem) {
  const [, kind] = item.browseId.split(':')
  if (kind === 'album') void router.push({ name: 'music-album', params: { browseId: item.browseId } })
  else if (kind === 'artist') {
    void router.push({
      name: 'music-artist',
      params: { browseId: item.browseId },
      query: {
        ...(item.title ? { name: item.title } : {}),
        ...(item.coverUrl ? { cover: item.coverUrl } : {})
      }
    })
  }
}
</script>

<template>
  <div class="ww-music-mine-subscribed-grid">
    <button
      v-for="item in items"
      :key="item.browseId"
      type="button"
      class="ww-music-mine-subscribed-item"
      @click="openItem(item)"
    >
      <div class="ww-music-mine-subscribed-item__cover">
        <MusicCoverArt :src="item.coverUrl" :title="item.title" size="card" />
      </div>
      <span class="ww-music-mine-subscribed-item__title">{{ item.title }}</span>
      <span v-if="item.subtitle" class="ww-music-mine-subscribed-item__sub">{{ item.subtitle }}</span>
    </button>
  </div>
</template>
