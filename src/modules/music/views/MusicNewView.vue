<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import MusicPageHeading from '@modules/music/components/MusicPageHeading.vue'
import MusicTrackCarousel from '@modules/music/components/MusicTrackCarousel.vue'
import MusicCoverRow from '@modules/music/components/MusicCoverRow.vue'
import { useMusicPlayerStore } from '@modules/music/stores/musicPlayer'
import type { NormalizedTrack } from '@shared/types/music'
import '@modules/music/styles/music-shared.css'

type Tab = 'songs' | 'albums'

const router = useRouter()
const player = useMusicPlayerStore()
const tab = ref<Tab>('songs')
const songs = ref<NormalizedTrack[]>([])
const albums = ref<Array<{ browseId: string; title: string; artist: string; coverUrl?: string }>>([])
const loading = ref(true)

onMounted(async () => {
  loading.value = true
  try {
    const [songRows, albumRows] = await Promise.all([
      window.wanwu.music.getNewSongs(40),
      window.wanwu.music.getNewAlbums(24)
    ])
    songs.value = songRows
    albums.value = albumRows
  } finally {
    loading.value = false
  }
})

function play(track: NormalizedTrack) {
  void player.playTrack(track, songs.value)
}

function openAlbum(item: { id: string }) {
  void router.push({ name: 'music-album', params: { browseId: item.id } })
}
</script>

<template>
  <div class="ww-music-tab-body ww-scroll-main">
    <div class="ww-music-content-shell">
      <MusicPageHeading title="新歌新碟" subtitle="最新歌曲与专辑" />

      <div class="ww-music-login__tabs" role="tablist">
        <button
          type="button"
          class="ww-music-login__tab"
          :class="{ 'is-active': tab === 'songs' }"
          @click="tab = 'songs'"
        >
          新歌
        </button>
        <button
          type="button"
          class="ww-music-login__tab"
          :class="{ 'is-active': tab === 'albums' }"
          @click="tab = 'albums'"
        >
          新碟
        </button>
      </div>

      <p v-if="loading" class="ww-music-state-hint">加载中…</p>
      <template v-else-if="tab === 'songs'">
        <MusicTrackCarousel :tracks="songs" @play="play" />
        <p v-if="!songs.length" class="ww-music-state-hint">暂无新歌</p>
      </template>
      <template v-else>
        <MusicCoverRow
          v-if="albums.length"
          :items="
            albums.map((a) => ({
              id: a.browseId,
              title: a.title,
              subtitle: a.artist,
              coverUrl: a.coverUrl
            }))
          "
          @select="openAlbum"
        />
        <p v-else class="ww-music-state-hint">暂无新碟</p>
      </template>
    </div>
  </div>
</template>
