<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import MusicAlbumHero from '@modules/music/components/MusicAlbumHero.vue'
import MusicChartList from '@modules/music/components/MusicChartList.vue'
import { useMusicPlayerStore } from '@modules/music/stores/musicPlayer'
import type { NormalizedTrack } from '@shared/types/music'
import '@modules/music/styles/music-shared.css'

defineOptions({ name: 'MusicAlbumView' })

const route = useRoute()
const player = useMusicPlayerStore()
const tracks = ref<NormalizedTrack[]>([])
const title = ref('专辑')
const artist = ref('')
const coverUrl = ref<string | undefined>()
const loading = ref(true)
const error = ref<string | null>(null)
const browseId = computed(() => String(route.params.browseId ?? ''))
const pageTitle = computed(() => String(route.query.title ?? ''))

function applyAlbumMeta(album: unknown) {
  const a = album as {
    title?: string
    name?: string
    artist?: string
    artists?: Array<{ name?: string }>
    thumbnails?: Array<{ url?: string }>
  }
  title.value = pageTitle.value || String(a?.title ?? a?.name ?? '专辑')
  artist.value =
    a?.artist ?? a?.artists?.map((x) => x.name).filter(Boolean).join(', ') ?? ''
  coverUrl.value = a?.thumbnails?.[0]?.url
}

async function load() {
  const id = browseId.value.trim()
  if (!id) {
    tracks.value = []
    error.value = '无效的专辑或歌单 ID'
    loading.value = false
    return
  }

  loading.value = true
  error.value = null
  tracks.value = []

  try {
    try {
      const { album, tracks: albumTracks } = await window.wanwu.music.getAlbum(id)
      if (albumTracks.length) {
        tracks.value = albumTracks
        applyAlbumMeta(album)
        return
      }
    } catch {
      /* 尝试作为歌单打开 */
    }

    const playlistTracks = await window.wanwu.music.getPlaylistTracks(id)
    if (playlistTracks.length) {
      tracks.value = playlistTracks
      title.value = pageTitle.value || '歌单'
      artist.value = ''
      coverUrl.value = playlistTracks[0]?.coverUrl
      return
    }
    error.value = '未找到可播放曲目'
  } catch (e) {
    error.value = e instanceof Error ? e.message : '加载失败'
  } finally {
    loading.value = false
  }
}

watch(browseId, () => {
  void load()
})

watch(
  () => route.query.title,
  () => {
    if (pageTitle.value && !loading.value) title.value = pageTitle.value
  }
)

void load()

function play(track: NormalizedTrack) {
  void player.playTrack(track, tracks.value)
}
</script>

<template>
  <div class="ww-music-tab-body ww-scroll-main">
    <div class="ww-music-content-shell">
      <p v-if="loading" class="ww-music-state-hint">加载中…</p>
      <div v-else-if="error" class="ww-music-error-bar">
        <span>{{ error }}</span>
        <button type="button" class="ww-music-retry" @click="load">重试</button>
      </div>
      <template v-else>
        <MusicAlbumHero
          :title="title"
          :subtitle="artist ? '专辑' : '歌单'"
          :cover-url="coverUrl"
          :meta="artist"
        />
        <MusicChartList :tracks="tracks" panel @play="play" />
      </template>
    </div>
  </div>
</template>
