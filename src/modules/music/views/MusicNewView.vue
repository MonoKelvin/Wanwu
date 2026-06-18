<script setup lang="ts">
import { computed, onActivated, ref } from 'vue'
import { useRouter } from 'vue-router'
import MusicPageHeading from '@modules/music/components/MusicPageHeading.vue'
import MusicChartList from '@modules/music/components/MusicChartList.vue'
import MusicCover from '@modules/music/components/MusicCover.vue'
import MusicScrollBody from '@modules/music/components/MusicScrollBody.vue'
import { useMusicPlayerStore } from '@modules/music/stores/musicPlayer'
import { useScrollNearEnd } from '@modules/music/composables/useScrollNearEnd'
import type { NormalizedTrack } from '@modules/music/domain/types'
import '@modules/music/styles/music-shared.css'

defineOptions({ name: 'MusicNewView' })

type Tab = 'songs' | 'albums'

const router = useRouter()
const player = useMusicPlayerStore()
const scrollBodyRef = ref<InstanceType<typeof MusicScrollBody> | null>(null)
const scrollRoot = computed(() => scrollBodyRef.value?.scrollEl ?? null)
const tab = ref<Tab>('songs')
const songs = ref<NormalizedTrack[]>([])
const albums = ref<Array<{ browseId: string; title: string; artist: string; coverUrl?: string }>>([])
const songsLoading = ref(true)
const albumsLoading = ref(false)
const loadingMore = ref(false)
const albumsReady = ref(false)
const initialized = ref(false)
const songsVisibleCount = ref(24)
const albumsSeed = ref(0)
const hasMoreSongs = computed(() => songsVisibleCount.value < songs.value.length)
const hasMoreAlbums = ref(true)
const visibleSongs = computed(() => songs.value.slice(0, songsVisibleCount.value))

const albumItems = computed(() =>
  albums.value.map((a) => ({
    id: a.browseId,
    title: a.title,
    subtitle: a.artist,
    coverUrl: a.coverUrl
  }))
)

async function loadSongs() {
  songsLoading.value = true
  try {
    songs.value = await window.wanwu.music.getNewSongs(120)
    songsVisibleCount.value = Math.min(24, songs.value.length)
  } finally {
    songsLoading.value = false
  }
}

async function loadAlbums(initial = false) {
  if (albumsLoading.value || (!initial && !hasMoreAlbums.value)) return
  albumsLoading.value = true
  try {
    if (!initial) albumsSeed.value += 1
    const batch = await window.wanwu.music.getNewAlbums(24, albumsSeed.value)
    if (!batch.length) {
      hasMoreAlbums.value = false
      return
    }
    const seen = new Set(albums.value.map((a) => a.browseId))
    for (const item of batch) {
      if (seen.has(item.browseId)) continue
      seen.add(item.browseId)
      albums.value.push(item)
    }
    if (batch.length < 24) hasMoreAlbums.value = false
    albumsReady.value = true
  } finally {
    albumsLoading.value = false
  }
}

onActivated(() => {
  if (initialized.value) return
  initialized.value = true
  void loadSongs()
})

function onTabChange(next: Tab) {
  tab.value = next
  if (next === 'albums' && !albumsReady.value) void loadAlbums(true)
}

function play(track: NormalizedTrack) {
  void player.playTrack(track, visibleSongs.value.length ? visibleSongs.value : songs.value)
}

function openAlbum(item: { id: string; title?: string }) {
  void router.push({
    name: 'music-album',
    params: { browseId: item.id },
    query: item.title ? { title: item.title } : undefined
  })
}

async function loadMore() {
  if (songsLoading.value || albumsLoading.value || loadingMore.value) return
  loadingMore.value = true
  try {
    if (tab.value === 'songs') {
      if (!hasMoreSongs.value) return
      await new Promise((resolve) => setTimeout(resolve, 120))
      songsVisibleCount.value = Math.min(songsVisibleCount.value + 24, songs.value.length)
      return
    }
    if (!albumsReady.value) {
      await loadAlbums(true)
      return
    }
    if (!hasMoreAlbums.value) return
    await loadAlbums(false)
  } finally {
    loadingMore.value = false
  }
}

useScrollNearEnd(scrollRoot, loadMore, {
  enabled: computed(() =>
    tab.value === 'songs'
      ? !songsLoading.value && hasMoreSongs.value
      : !albumsLoading.value && (hasMoreAlbums.value || !albumsReady.value)
  )
})
</script>

<template>
  <MusicScrollBody ref="scrollBodyRef">
    <div class="ww-music-content-shell">
      <MusicPageHeading title="新歌新碟" subtitle="最新歌曲与专辑" />

      <div class="ww-music-login__tabs" role="tablist">
        <button
          type="button"
          class="ww-music-login__tab"
          :class="{ 'is-active': tab === 'songs' }"
          @click="onTabChange('songs')"
        >
          新歌
        </button>
        <button
          type="button"
          class="ww-music-login__tab"
          :class="{ 'is-active': tab === 'albums' }"
          @click="onTabChange('albums')"
        >
          新碟
        </button>
      </div>

      <template v-if="tab === 'songs'">
        <MusicChartList :tracks="visibleSongs" :loading="songsLoading" panel show-provider @play="(t) => play(t)" />
        <p v-if="!songsLoading && !visibleSongs.length" class="ww-music-state-hint">暂无新歌</p>
        <p v-else-if="loadingMore" class="ww-music-state-hint">加载中…</p>
      </template>
      <template v-else>
        <div v-if="albumsLoading && !albumsReady" class="ww-music-new-grid ww-music-skeleton">
          <div v-for="n in 12" :key="n" class="ww-music-new-grid__item">
            <div class="ww-music-new-grid__sk-cover" />
            <div class="ww-music-new-grid__sk-line ww-music-new-grid__sk-line--title" />
            <div class="ww-music-new-grid__sk-line ww-music-new-grid__sk-line--sub" />
          </div>
        </div>
        <div v-else-if="albumItems.length" class="ww-music-new-grid">
          <button
            v-for="item in albumItems"
            :key="item.id"
            type="button"
            class="ww-music-new-grid__item"
            @click="openAlbum(item)"
          >
            <MusicCover :src="item.coverUrl" :title="item.title" size="card" class="ww-music-new-grid__cover" />
            <span class="ww-music-new-grid__title ww-music-text-ellipsis">{{ item.title }}</span>
            <span class="ww-music-new-grid__sub ww-music-text-ellipsis">{{ item.subtitle }}</span>
          </button>
        </div>
        <p v-if="albumsReady && !albumsLoading && !albums.length" class="ww-music-state-hint">暂无新碟</p>
        <p v-else-if="loadingMore" class="ww-music-state-hint">加载中…</p>
      </template>
    </div>
  </MusicScrollBody>
</template>

<style scoped>
.ww-music-new-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(9rem, 1fr));
  gap: 1rem 0.75rem;
}

.ww-music-new-grid__item {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 0;
  border: none;
  background: transparent;
  text-align: left;
  min-width: 0;
  cursor: pointer;
}

.ww-music-new-grid__cover {
  width: 100%;
  aspect-ratio: 1;
}

.ww-music-new-grid__title {
  font-size: var(--ww-music-fs-sm, 0.75rem);
  color: var(--ww-ink);
}

.ww-music-new-grid__sub {
  font-size: var(--ww-music-fs-xs, 0.6875rem);
  color: var(--ww-ink-faint);
}

.ww-music-new-grid__sk-cover {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 0.55rem;
  background: var(--ww-surface-hover);
  animation: ww-music-shimmer 1.2s ease-in-out infinite;
}

.ww-music-new-grid__sk-line {
  height: 0.5rem;
  border-radius: 999px;
  background: var(--ww-surface-hover);
  animation: ww-music-shimmer 1.2s ease-in-out infinite;
}

.ww-music-new-grid__sk-line--title {
  width: 72%;
}

.ww-music-new-grid__sk-line--sub {
  width: 48%;
}
</style>
