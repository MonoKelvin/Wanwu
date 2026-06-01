<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MusicAlbumHero from '@modules/music/components/MusicAlbumHero.vue'
import MusicChartList from '@modules/music/components/MusicChartList.vue'
import MusicCoverRow from '@modules/music/components/MusicCoverRow.vue'
import MusicArtistPhotosGrid from '@modules/music/components/MusicArtistPhotosGrid.vue'
import { useMusicPlayerStore } from '@modules/music/stores/musicPlayer'
import type { MusicArtistPayload, NormalizedTrack } from '@shared/types/music'
import '@modules/music/styles/music-shared.css'

defineOptions({ name: 'MusicArtistView' })

type ArtistTab = 'tracks' | 'albums' | 'mvs' | 'photos'

const route = useRoute()
const router = useRouter()
const player = useMusicPlayerStore()
const artist = ref<MusicArtistPayload>({ name: '歌手', tracks: [], albums: [] })
const loading = ref(true)
const tab = ref<ArtistTab>('tracks')
const browseId = computed(() => String(route.params.browseId ?? ''))

const queryName = computed(() => String(route.query.name ?? '').trim())
const queryCover = computed(() => String(route.query.cover ?? '').trim())

const displayName = computed(() => artist.value.name || queryName.value || '歌手')
const displayCover = computed(() => artist.value.coverUrl || queryCover.value || undefined)
const displayDescription = computed(() => artist.value.description)

const tabs = computed(() => {
  const list: Array<{ id: ArtistTab; label: string }> = []
  if (artist.value.tracks.length) list.push({ id: 'tracks', label: '单曲' })
  if (artist.value.albums.length) list.push({ id: 'albums', label: '专辑' })
  if (artist.value.mvs?.length) list.push({ id: 'mvs', label: 'MV' })
  if (artist.value.photos?.length) list.push({ id: 'photos', label: '写真' })
  return list
})

watch(tabs, (next) => {
  if (!next.length) return
  if (!next.some((t) => t.id === tab.value)) tab.value = next[0]!.id
})

async function loadArtist() {
  loading.value = true
  try {
    artist.value = await window.wanwu.music.getArtist(browseId.value)
    if (!artist.value.name && queryName.value) {
      artist.value = { ...artist.value, name: queryName.value }
    }
    if (!artist.value.coverUrl && queryCover.value) {
      artist.value = { ...artist.value, coverUrl: queryCover.value }
    }
  } finally {
    loading.value = false
  }
}

watch(browseId, () => {
  void loadArtist()
}, { immediate: true })

function play(track: NormalizedTrack) {
  void player.playTrack(track, artist.value.tracks)
}

function openAlbum(id: string, title?: string) {
  void router.push({
    name: 'music-album',
    params: { browseId: id },
    query: title ? { title } : undefined
  })
}

function openMv(id: string) {
  void router.push({ name: 'music-video', params: { browseId: id } })
}

const albumItems = computed(() =>
  artist.value.albums.map((a) => ({
    id: a.browseId,
    title: a.title,
    coverUrl: a.coverUrl
  }))
)

const mvItems = computed(() =>
  (artist.value.mvs ?? []).map((m) => ({
    id: m.browseId,
    title: m.title,
    coverUrl: m.coverUrl
  }))
)
</script>

<template>
  <div class="ww-music-tab-body ww-scroll-main">
    <div class="ww-music-content-shell">
      <p v-if="loading && !queryName" class="ww-music-state-hint">加载中…</p>
      <template v-else>
        <MusicAlbumHero
          :title="displayName"
          subtitle="歌手"
          :cover-url="displayCover"
          :description="displayDescription"
        />

        <div v-if="tabs.length" class="ww-music-pill-tabs ww-music-artist-tabs" role="tablist">
          <button
            v-for="t in tabs"
            :key="t.id"
            type="button"
            class="ww-music-pill-tabs__btn"
            :class="{ 'is-active': tab === t.id }"
            role="tab"
            :aria-selected="tab === t.id"
            @click="tab = t.id"
          >
            {{ t.label }}
          </button>
        </div>

        <div v-if="tab === 'tracks' && artist.tracks.length" class="ww-music-artist-panel">
          <MusicChartList :tracks="artist.tracks" panel @play="play" />
        </div>

        <div v-else-if="tab === 'albums' && albumItems.length" class="ww-music-artist-panel">
          <MusicCoverRow
            :items="albumItems"
            size="album"
            @select="(item) => openAlbum(item.id, item.title)"
          />
        </div>

        <div v-else-if="tab === 'mvs' && mvItems.length" class="ww-music-artist-panel">
          <MusicCoverRow
            :items="mvItems"
            size="album"
            @select="(item) => openMv(item.id)"
          />
        </div>

        <div v-else-if="tab === 'photos'" class="ww-music-artist-panel">
          <MusicArtistPhotosGrid :photos="artist.photos ?? []" />
        </div>

        <p v-if="!loading && !tabs.length" class="ww-music-state-hint">
          暂无曲目数据，请从搜索进入专辑或单曲。
        </p>
      </template>
    </div>
  </div>
</template>

<style scoped>
.ww-music-artist-tabs {
  margin-bottom: 1.25rem;
}

.ww-music-artist-panel {
  min-height: 8rem;
}
</style>
