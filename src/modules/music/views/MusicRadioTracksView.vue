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

defineOptions({ name: 'MusicRadioTracksView' })

const route = useRoute()
const player = useMusicPlayerStore()
const loadTask = useAsyncTask()
const tracks = ref<NormalizedTrack[]>([])
const loading = ref(true)
const title = ref('电台')

const categoryId = computed(() => String(route.params.categoryId ?? ''))
const pageTitle = computed(() => (route.query.title ? String(route.query.title) : ''))

async function loadRadioTracks() {
  const id = categoryId.value
  if (!id) return
  const token = loadTask.next()
  loading.value = true
  if (pageTitle.value) title.value = pageTitle.value
  try {
    tracks.value = await window.wanwu.music.getPlatformRadioTracks(id, 50)
    title.value = pageTitle.value || '场景电台'
  } finally {
    if (loadTask.isCurrent(token)) loading.value = false
  }
}

watch(categoryId, () => {
  tracks.value = []
  void loadRadioTracks()
}, { immediate: true })

function play(track: NormalizedTrack) {
  void player.playTrack(track, tracks.value)
}
</script>

<template>
  <MusicScrollBody>
    <div class="ww-music-content-shell">
      <MusicPageHeading :title="pageTitle || title" subtitle="电台节目" />
      <MusicChartList
        :tracks="tracks"
        :loading="loading"
        panel
        show-provider
        @play="play"
      />
      <p v-if="!loading && !tracks.length" class="ww-music-state-hint">暂无电台内容</p>
    </div>
  </MusicScrollBody>
</template>
