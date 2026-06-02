<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import MusicPageHeading from '@modules/music/components/MusicPageHeading.vue'
import MusicTrackCarousel from '@modules/music/components/MusicTrackCarousel.vue'
import MusicCoverRow from '@modules/music/components/MusicCoverRow.vue'
import MusicScrollBody from '@modules/music/components/MusicScrollBody.vue'
import { useMusicPlayerStore } from '@modules/music/stores/musicPlayer'
import type { NormalizedTrack } from '@shared/types/music'
import '@modules/music/styles/music-shared.css'

defineOptions({ name: 'MusicNewView' })

type Tab = 'songs' | 'albums'

const router = useRouter()
const player = useMusicPlayerStore()
const tab = ref<Tab>('songs')
const songs = ref<NormalizedTrack[]>([])
const albums = ref<Array<{ browseId: string; title: string; artist: string; coverUrl?: string }>>([])
const songsLoading = ref(true)
const albumsLoading = ref(false)
const albumsReady = ref(false)

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
    songs.value = await window.wanwu.music.getNewSongs(40)
  } finally {
    songsLoading.value = false
  }
}

async function loadAlbums() {
  if (albumsReady.value || albumsLoading.value) return
  albumsLoading.value = true
  try {
    albums.value = await window.wanwu.music.getNewAlbums(24)
    albumsReady.value = true
  } finally {
    albumsLoading.value = false
  }
}

onMounted(() => {
  void loadSongs()
})

function onTabChange(next: Tab) {
  tab.value = next
  if (next === 'albums') void loadAlbums()
}

function play(track: NormalizedTrack) {
  void player.playTrack(track, songs.value)
}

function openAlbum(item: { id: string; title?: string }) {
  void router.push({
    name: 'music-album',
    params: { browseId: item.id },
    query: item.title ? { title: item.title } : undefined
  })
}
</script>

<template>
  <MusicScrollBody>
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
        <MusicTrackCarousel :tracks="songs" :loading="songsLoading" @play="play" />
        <p v-if="!songsLoading && !songs.length" class="ww-music-state-hint">暂无新歌</p>
      </template>
      <template v-else>
        <MusicCoverRow
          :items="albumItems"
          :loading="albumsLoading || !albumsReady"
          size="album"
          @select="openAlbum"
        />
        <p v-if="albumsReady && !albumsLoading && !albums.length" class="ww-music-state-hint">暂无新碟</p>
      </template>
    </div>
  </MusicScrollBody>
</template>
