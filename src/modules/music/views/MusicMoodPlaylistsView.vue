<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import MusicPageHeading from '@modules/music/components/MusicPageHeading.vue'
import MusicCoverRow from '@modules/music/components/MusicCoverRow.vue'
import MusicDiscoverSection from '@modules/music/components/MusicDiscoverSection.vue'
import { useMusicPlayerStore } from '@modules/music/stores/musicPlayer'
import type { MusicMoodPlaylist } from '@shared/types/music'
import '@modules/music/styles/music-shared.css'

const route = useRoute()
const player = useMusicPlayerStore()
const playlists = ref<MusicMoodPlaylist[]>([])
const loading = ref(true)
const error = ref<string | null>(null)

const categoryId = computed(() => decodeURIComponent(String(route.params.categoryId ?? '')))

const coverItems = computed(() =>
  playlists.value.map((pl) => ({
    id: pl.playlistId,
    title: pl.title,
    coverUrl: pl.coverUrl
  }))
)

onMounted(() => {
  void loadPlaylists()
})

async function loadPlaylists() {
  loading.value = true
  error.value = null
  try {
    playlists.value = await window.wanwu.music.getMoodPlaylists(categoryId.value)
  } catch (e) {
    error.value = e instanceof Error ? e.message : '加载失败'
  } finally {
    loading.value = false
  }
}

async function openPlaylist(item: { id: string }) {
  const tracks = await window.wanwu.music.getPlaylistTracks(item.id)
  if (!tracks.length) {
    const pl = playlists.value.find((p) => p.playlistId === item.id)
    if (pl) {
      const search = await window.wanwu.music.search(`${categoryId.value} ${pl.title}`, 'songs')
      if (search.tracks[0]) {
        void player.playTrack(search.tracks[0], search.tracks)
        return
      }
    }
    return
  }
  void player.playTrack(tracks[0]!, tracks)
}
</script>

<template>
  <div class="ww-music-tab-body ww-scroll-main">
    <div class="ww-music-content-shell">
      <MusicPageHeading :title="categoryId" subtitle="分类歌单" />

      <p v-if="loading" class="ww-music-state-hint">加载中…</p>
      <div v-else-if="error" class="ww-music-error-bar">
        <span>{{ error }}</span>
        <button type="button" class="ww-music-retry" @click="loadPlaylists">重试</button>
      </div>
      <MusicDiscoverSection v-else-if="coverItems.length" title="歌单">
        <MusicCoverRow :items="coverItems" @select="openPlaylist" />
      </MusicDiscoverSection>
      <p v-else class="ww-music-state-hint">该分类暂无歌单，请选择其他分类。</p>
    </div>
  </div>
</template>
