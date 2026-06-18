<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import MusicPageHeading from '@modules/music/components/MusicPageHeading.vue'
import MusicChartList from '@modules/music/components/MusicChartList.vue'
import MusicScrollBody from '@modules/music/components/MusicScrollBody.vue'
import { useAsyncTask } from '@modules/music/composables/useAsyncTask'
import { useMusicPlayerStore } from '@modules/music/stores/musicPlayer'
import type { NormalizedTrack } from '@modules/music/domain/types'
import '@modules/music/styles/music-shared.css'

defineOptions({ name: 'MusicPlaylistView' })

const route = useRoute()
const player = useMusicPlayerStore()
const loadTask = useAsyncTask()
const tracks = ref<NormalizedTrack[]>([])
const loading = ref(true)
const title = ref('歌单')

const playlistId = computed(() => decodeURIComponent(String(route.params.playlistId ?? '')))

async function loadPlaylist() {
  const id = playlistId.value
  if (!id) return
  const token = loadTask.next()
  loading.value = true
  title.value = route.query.title ? String(route.query.title) : '歌单'
  try {
    tracks.value = await window.wanwu.music.getPlaylistTracks(id)
  } finally {
    if (loadTask.isCurrent(token)) loading.value = false
  }
}

watch(playlistId, () => {
  tracks.value = []
  void loadPlaylist()
}, { immediate: true })

function play(track: NormalizedTrack) {
  void player.playTrack(track, tracks.value)
}
</script>

<template>
  <MusicScrollBody>
    <div class="ww-music-content-shell">
      <MusicPageHeading :title="title" subtitle="歌单" />
      <MusicChartList
        :tracks="tracks"
        :loading="loading"
        panel
        show-provider
        @play="play"
      />
      <p v-if="!loading && !tracks.length" class="ww-music-state-hint">歌单为空或无法加载。</p>
    </div>
  </MusicScrollBody>
</template>
