<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import MusicPageHeading from '@modules/music/components/MusicPageHeading.vue'
import MusicMoodGrid from '@modules/music/components/MusicMoodGrid.vue'
import MusicScrollBody from '@modules/music/components/MusicScrollBody.vue'
import type { MusicRadioCategory } from '@modules/music/domain/types'
import '@modules/music/styles/music-shared.css'

defineOptions({ name: 'MusicRadioView' })

const router = useRouter()
const categories = ref<MusicRadioCategory[]>([])
const loading = ref(true)

onMounted(async () => {
  loading.value = true
  try {
    categories.value = await window.wanwu.music.getPlatformRadioCategories()
  } finally {
    loading.value = false
  }
})

function openRadio(id: string) {
  void router.push({ name: 'music-radio-tracks', params: { categoryId: id } })
}
</script>

<template>
  <MusicScrollBody>
    <div class="ww-music-content-shell">
      <MusicPageHeading title="场景电台" subtitle="按场景聆听" />
      <p v-if="loading" class="ww-music-state-hint">加载中…</p>
      <MusicMoodGrid
        v-else-if="categories.length"
        :moods="categories.map((c) => ({ id: c.id, title: c.title, coverUrl: c.coverUrl }))"
        @select="openRadio"
      />
      <p v-else class="ww-music-state-hint">当前平台暂不支持场景电台</p>
    </div>
  </MusicScrollBody>
</template>
