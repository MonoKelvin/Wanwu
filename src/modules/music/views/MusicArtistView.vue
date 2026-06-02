<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MusicAlbumHero from '@modules/music/components/MusicAlbumHero.vue'
import MusicChartList from '@modules/music/components/MusicChartList.vue'
import MusicCoverRow from '@modules/music/components/MusicCoverRow.vue'
import MusicArtistPhotosGrid from '@modules/music/components/MusicArtistPhotosGrid.vue'
import { useAsyncTask } from '@modules/music/composables/useAsyncTask'
import { useMusicPlayerStore } from '@modules/music/stores/musicPlayer'
import type { MusicArtistPayload, NormalizedTrack } from '@shared/types/music'
import { musicScrollKey } from '@modules/music/lib/musicScrollKey'
import MusicScrollBody from '@modules/music/components/MusicScrollBody.vue'
import '@modules/music/styles/music-shared.css'

defineOptions({ name: 'MusicArtistView' })

type ArtistTab = 'tracks' | 'albums' | 'mvs' | 'photos'

const route = useRoute()
const router = useRouter()
const player = useMusicPlayerStore()
const loadTask = useAsyncTask()
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
  const token = loadTask.next()
  loading.value = true
  try {
    const payload = await window.wanwu.music.getArtist(browseId.value)
    if (!loadTask.isCurrent(token)) return
    artist.value = payload
    if (!artist.value.name && queryName.value) {
      artist.value = { ...artist.value, name: queryName.value }
    }
    if (!artist.value.coverUrl && queryCover.value) {
      artist.value = { ...artist.value, coverUrl: queryCover.value }
    }
  } finally {
    if (loadTask.isCurrent(token)) loading.value = false
  }
}

watch(browseId, () => {
  tab.value = 'tracks'
  artist.value = { name: queryName.value || '歌手', tracks: [], albums: [] }
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

const scrollKey = computed(() => `${musicScrollKey(route)}:tab:${tab.value}`)
</script>

<template>
  <MusicScrollBody :scroll-key="scrollKey">
    <div class="ww-music-content-shell">
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

      <div v-if="tab === 'tracks'" class="ww-music-artist-panel">
        <MusicChartList
          :tracks="artist.tracks"
          :loading="loading"
          panel
          @play="play"
        />
        <p v-if="!loading && !artist.tracks.length" class="ww-music-state-hint">
          暂无单曲
        </p>
      </div>

      <div v-else-if="tab === 'albums'" class="ww-music-artist-panel">
        <MusicCoverRow
          v-if="loading || albumItems.length"
          :items="albumItems"
          :loading="loading"
          size="album"
          @select="(item) => openAlbum(item.id, item.title)"
        />
        <p v-else class="ww-music-state-hint">暂无专辑</p>
      </div>

      <div v-else-if="tab === 'mvs'" class="ww-music-artist-panel">
        <MusicCoverRow
          v-if="loading || mvItems.length"
          :items="mvItems"
          :loading="loading"
          size="album"
          @select="(item) => openMv(item.id)"
        />
        <p v-else class="ww-music-state-hint">暂无 MV</p>
      </div>

      <div v-else-if="tab === 'photos'" class="ww-music-artist-panel">
        <MusicArtistPhotosGrid :photos="artist.photos ?? []" />
      </div>

      <p v-if="!loading && !tabs.length" class="ww-music-state-hint">
        暂无曲目数据，请从搜索进入专辑或单曲。
      </p>
    </div>
  </MusicScrollBody>
</template>

<style scoped>
.ww-music-artist-tabs {
  margin-bottom: 1.25rem;
}

.ww-music-artist-panel {
  min-height: 8rem;
}
</style>
