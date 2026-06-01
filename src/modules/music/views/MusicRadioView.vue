<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import MusicPageHeading from '@modules/music/components/MusicPageHeading.vue'
import MusicMoodGrid from '@modules/music/components/MusicMoodGrid.vue'
import type { MusicRadioCategory } from '@shared/types/music'
import '@modules/music/styles/music-shared.css'

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
  <div class="ww-music-tab-body ww-scroll-main">
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
  </div>
</template>
