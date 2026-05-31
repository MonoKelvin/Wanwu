<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import MusicPageHeading from '@modules/music/components/MusicPageHeading.vue'
import MusicChartList from '@modules/music/components/MusicChartList.vue'
import { useMusicPlayerStore } from '@modules/music/stores/musicPlayer'
import type { NormalizedTrack } from '@shared/types/music'
import '@modules/music/styles/music-shared.css'

const route = useRoute()
const player = useMusicPlayerStore()
const tracks = ref<NormalizedTrack[]>([])
const loading = ref(true)
const title = ref('歌单')

onMounted(async () => {
  const playlistId = decodeURIComponent(String(route.params.playlistId ?? ''))
  loading.value = true
  try {
    tracks.value = await window.wanwu.music.getPlaylistTracks(playlistId)
    title.value = tracks.value[0]?.album ?? '歌单'
  } finally {
    loading.value = false
  }
})

function play(track: NormalizedTrack) {
  void player.playTrack(track, tracks.value)
}
</script>

<template>
  <div class="ww-music-tab-body ww-scroll-main">
    <div class="ww-music-content-shell">
      <MusicPageHeading :title="title" subtitle="歌单" />
      <p v-if="loading" class="text-sm text-ww-ink-faint">加载中…</p>
      <MusicChartList v-else-if="tracks.length" :tracks="tracks" panel show-provider @play="play" />
      <p v-else class="text-sm text-ww-ink-faint">歌单为空或无法加载。</p>
    </div>
  </div>
</template>
