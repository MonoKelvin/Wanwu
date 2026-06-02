<script setup lang="ts">
import { computed, onActivated, ref } from 'vue'
import { useRouter } from 'vue-router'
import MusicPageHeading from '@modules/music/components/MusicPageHeading.vue'
import MusicArtistGrid from '@modules/music/components/MusicArtistGrid.vue'
import { useMusicPlatform } from '@modules/music/composables/useMusicPlatform'
import MusicScrollBody from '@modules/music/components/MusicScrollBody.vue'
import { useScrollNearEnd } from '@modules/music/composables/useScrollNearEnd'
import '@modules/music/styles/music-shared.css'

defineOptions({ name: 'MusicArtistsView' })

const PAGE_SIZE = 16

const router = useRouter()
const { buildBrowseId } = useMusicPlatform()
const scrollBodyRef = ref<InstanceType<typeof MusicScrollBody> | null>(null)
const scrollRoot = computed(() => scrollBodyRef.value?.scrollEl ?? null)
const artists = ref<Array<{ browseId: string; name: string; coverUrl?: string }>>([])
const loading = ref(false)
const loadingMore = ref(false)
const hasMore = ref(true)
const initialized = ref(false)

const gridItems = computed(() =>
  artists.value.map((a) => ({
    id: a.browseId,
    title: a.name,
    coverUrl: a.coverUrl
  }))
)

async function loadInitial() {
  if (initialized.value || loading.value) return
  loading.value = true
  try {
    const first = await window.wanwu.music.getNeteaseArtistList(PAGE_SIZE, 0)
    artists.value = first
    hasMore.value = first.length >= PAGE_SIZE
    initialized.value = true
  } finally {
    loading.value = false
  }
}

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

onActivated(() => {
  requestAnimationFrame(() => {
    void loadInitial()
  })
})

useScrollNearEnd(scrollRoot, loadMore, {
  enabled: computed(() => hasMore.value && initialized.value && !loading.value && !loadingMore.value)
})

function openArtist(item: { id: string; title?: string; coverUrl?: string }) {
  const browseId = item.id.includes(':') ? item.id : buildBrowseId('artist', item.id)
  void router.push({
    name: 'music-artist',
    params: { browseId },
    query: {
      ...(item.title ? { name: item.title } : {}),
      ...(item.coverUrl ? { cover: item.coverUrl } : {})
    }
  })
}
</script>

<template>
  <MusicScrollBody ref="scrollBodyRef">
    <div class="ww-music-content-shell">
      <MusicPageHeading title="歌手" subtitle="热门歌手浏览" />
      <MusicArtistGrid
        :items="gridItems"
        :loading="loading && !initialized"
        :loading-more="loadingMore"
        @select="openArtist"
      />
    </div>
  </MusicScrollBody>
</template>
