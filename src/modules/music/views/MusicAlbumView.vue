<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import MusicAlbumHero from '@modules/music/components/MusicAlbumHero.vue'
import MusicChartList from '@modules/music/components/MusicChartList.vue'
import { normalizeAlbumMeta } from '@modules/music/lib/normalizeAlbumMeta'
import { useAsyncTask } from '@modules/music/composables/useAsyncTask'
import { useMusicPlayerStore } from '@modules/music/stores/musicPlayer'
import type { NormalizedTrack } from '@shared/types/music'
import MusicScrollBody from '@modules/music/components/MusicScrollBody.vue'
import '@modules/music/styles/music-shared.css'

defineOptions({ name: 'MusicAlbumView' })

const route = useRoute()
const player = useMusicPlayerStore()
const loadTask = useAsyncTask()
const tracks = ref<NormalizedTrack[]>([])
const title = ref('专辑')
const artist = ref('')
const coverUrl = ref<string | undefined>()
const description = ref<string | undefined>()
const publishTime = ref<string | undefined>()
const albumKind = ref<'专辑' | '歌单'>('专辑')
const loading = ref(true)
const error = ref<string | null>(null)
const browseId = computed(() => String(route.params.browseId ?? ''))
const pageTitle = computed(() => String(route.query.title ?? ''))

const heroMeta = computed(() => {
  const parts = [artist.value, publishTime.value].filter(Boolean)
  return parts.join(' · ')
})

const displayTitle = computed(() => pageTitle.value || title.value)

function applyAlbumMeta(album: unknown) {
  const meta = normalizeAlbumMeta(album, pageTitle.value || '专辑')
  title.value = pageTitle.value || meta.title
  artist.value = meta.artist
  coverUrl.value = meta.coverUrl ?? tracks.value[0]?.coverUrl
  description.value = meta.description
  publishTime.value = meta.publishTime
  albumKind.value = '专辑'
}

async function load() {
  const id = browseId.value.trim()
  if (!id) {
    tracks.value = []
    error.value = '无效的专辑或歌单 ID'
    loading.value = false
    return
  }

  const token = loadTask.next()
  loading.value = true
  error.value = null
  if (pageTitle.value) title.value = pageTitle.value

  try {
    try {
      const { album, tracks: albumTracks } = await window.wanwu.music.getAlbum(id)
      if (!loadTask.isCurrent(token)) return
      if (albumTracks.length) {
        tracks.value = albumTracks
        applyAlbumMeta(album)
        if (!coverUrl.value) coverUrl.value = albumTracks[0]?.coverUrl
        return
      }
    } catch {
      /* 尝试作为歌单打开 */
    }

    const playlistTracks = await window.wanwu.music.getPlaylistTracks(id)
    if (!loadTask.isCurrent(token)) return
    if (playlistTracks.length) {
      tracks.value = playlistTracks
      title.value = pageTitle.value || '歌单'
      artist.value = ''
      description.value = undefined
      publishTime.value = undefined
      coverUrl.value = playlistTracks.find((t) => t.coverUrl)?.coverUrl
      albumKind.value = '歌单'
      return
    }
    tracks.value = []
    error.value = '未找到可播放曲目'
  } catch (e) {
    if (!loadTask.isCurrent(token)) return
    error.value = e instanceof Error ? e.message : '加载失败'
    tracks.value = []
  } finally {
    if (loadTask.isCurrent(token)) loading.value = false
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
  <MusicScrollBody>
    <div class="ww-music-content-shell">
      <div v-if="error && !loading" class="ww-music-error-bar">
        <span>{{ error }}</span>
        <button type="button" class="ww-music-retry" @click="load">重试</button>
      </div>
      <template v-else>
        <MusicAlbumHero
          :title="displayTitle"
          :subtitle="albumKind"
          :cover-url="coverUrl || tracks[0]?.coverUrl"
          :meta="heroMeta || undefined"
          :description="description"
        />
        <MusicChartList
          :tracks="tracks"
          :loading="loading"
          panel
          @play="play"
        />
        <p v-if="!loading && !tracks.length" class="ww-music-state-hint">暂无曲目</p>
      </template>
    </div>
  </MusicScrollBody>
</template>
