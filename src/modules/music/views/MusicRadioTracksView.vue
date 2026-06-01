<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import MusicPageHeading from '@modules/music/components/MusicPageHeading.vue'
import MusicChartList from '@modules/music/components/MusicChartList.vue'
import { useMusicPlayerStore } from '@modules/music/stores/musicPlayer'
import type { NormalizedTrack } from '@shared/types/music'
import '@modules/music/styles/music-shared.css'

defineOptions({ name: 'MusicRadioTracksView' })

const route = useRoute()
const player = useMusicPlayerStore()
const tracks = ref<NormalizedTrack[]>([])
const loading = ref(true)
const title = ref('电台')

onMounted(async () => {
  const categoryId = String(route.params.categoryId ?? '')
  loading.value = true
  try {
    tracks.value = await window.wanwu.music.getPlatformRadioTracks(categoryId, 50)
    title.value = route.query.title ? String(route.query.title) : '场景电台'
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
      <MusicPageHeading :title="title" subtitle="电台节目" />
      <p v-if="loading" class="ww-music-state-hint">加载中…</p>
      <MusicChartList v-else-if="tracks.length" :tracks="tracks" panel show-provider @play="play" />
      <p v-else class="ww-music-state-hint">暂无电台内容</p>
    </div>
  </div>
</template>
