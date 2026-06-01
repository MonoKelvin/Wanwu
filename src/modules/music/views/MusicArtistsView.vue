<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import MusicPageHeading from '@modules/music/components/MusicPageHeading.vue'
import MusicArtistGrid from '@modules/music/components/MusicArtistGrid.vue'
import { useMusicPlatform } from '@modules/music/composables/useMusicPlatform'
import { useScrollNearEnd } from '@modules/music/composables/useScrollNearEnd'
import '@modules/music/styles/music-shared.css'

defineOptions({ name: 'MusicArtistsView' })

const PAGE_SIZE = 24

const router = useRouter()
const { buildBrowseId } = useMusicPlatform()
const scrollRoot = ref<HTMLElement | null>(null)
const artists = ref<Array<{ browseId: string; name: string; coverUrl?: string }>>([])
const loading = ref(true)
const loadingMore = ref(false)
const hasMore = ref(true)

const gridItems = computed(() =>
  artists.value.map((a) => ({
    id: a.browseId,
    title: a.name,
    coverUrl: a.coverUrl
  }))
)

async function loadMore() {
  if (loading.value || loadingMore.value || !hasMore.value) return
  loadingMore.value = true
  try {
    const batch = await window.wanwu.music.getNeteaseArtistList(PAGE_SIZE, artists.value.length)
    if (!batch.length) {
      hasMore.value = false
      return
    }
    const seen = new Set(artists.value.map((a) => a.browseId))
    for (const item of batch) {
      if (seen.has(item.browseId)) continue
      seen.add(item.browseId)
      artists.value.push(item)
    }
    if (batch.length < PAGE_SIZE) hasMore.value = false
  } finally {
    loadingMore.value = false
  }
}

onMounted(async () => {
  loading.value = true
  artists.value = []
  hasMore.value = true
  try {
    const first = await window.wanwu.music.getNeteaseArtistList(PAGE_SIZE, 0)
    artists.value = first
    hasMore.value = first.length >= PAGE_SIZE
  } finally {
    loading.value = false
  }
})

useScrollNearEnd(scrollRoot, loadMore, {
  enabled: computed(() => hasMore.value && !loading.value)
})

function openArtist(item: { id: string }) {
  const browseId = item.id.includes(':') ? item.id : buildBrowseId('artist', item.id)
  void router.push({ name: 'music-artist', params: { browseId } })
}
</script>

<template>
  <div ref="scrollRoot" class="ww-music-tab-body ww-scroll-main">
    <div class="ww-music-content-shell">
      <MusicPageHeading title="歌手" subtitle="热门歌手浏览" />
      <MusicArtistGrid
        :items="gridItems"
        :loading="loading"
        :loading-more="loadingMore"
        @select="openArtist"
      />
    </div>
  </div>
</template>
