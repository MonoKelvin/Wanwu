<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import MusicPageHeading from '@modules/music/components/MusicPageHeading.vue'
import MusicChartList from '@modules/music/components/MusicChartList.vue'
import MusicScrollBody from '@modules/music/components/MusicScrollBody.vue'
import { useAsyncTask } from '@modules/music/composables/useAsyncTask'
import { useMusicPlayerStore } from '@modules/music/stores/musicPlayer'
import type { NormalizedTrack } from '@shared/types/music'
import '@modules/music/styles/music-shared.css'

defineOptions({ name: 'MusicToplistView' })

const route = useRoute()
const player = useMusicPlayerStore()
const loadTask = useAsyncTask()
const tracks = ref<NormalizedTrack[]>([])
const loading = ref(true)
const title = ref('排行榜')

const browseId = computed(() => decodeURIComponent(String(route.params.browseId ?? '')))
const pageTitle = computed(() => (route.query.title ? String(route.query.title) : ''))

async function loadToplist() {
  const id = browseId.value
  if (!id) return
  const toplistId = id.includes(':') ? id.split(':').pop() ?? id : id
  const token = loadTask.next()
  loading.value = true
  if (pageTitle.value) title.value = pageTitle.value
  try {
    tracks.value = await window.wanwu.music.getToplistTracks(toplistId, 100)
    if (pageTitle.value) title.value = pageTitle.value
    else title.value = '排行榜'
  } finally {
    if (loadTask.isCurrent(token)) loading.value = false
  }
}

watch(browseId, () => {
  tracks.value = []
  void loadToplist()
}, { immediate: true })

function play(track: NormalizedTrack) {
  void player.playTrack(track, tracks.value)
}
</script>

<template>
  <MusicScrollBody>
    <div class="ww-music-content-shell">
      <MusicPageHeading :title="pageTitle || title" subtitle="榜单详情" />
      <MusicChartList
        :tracks="tracks"
        :loading="loading"
        panel
        show-provider
        @play="play"
      />
      <p v-if="!loading && !tracks.length" class="ww-music-state-hint">榜单为空或无法加载。</p>
    </div>
  </MusicScrollBody>
</template>
