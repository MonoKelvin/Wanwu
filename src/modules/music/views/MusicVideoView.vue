<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import MusicPageHeading from '@modules/music/components/MusicPageHeading.vue'
import { useMusicPlayerStore } from '@modules/music/stores/musicPlayer'
import type { MusicMvDetail } from '@shared/types/music'
import '@modules/music/styles/music-shared.css'

defineOptions({ name: 'MusicVideoView' })

const route = useRoute()
const player = useMusicPlayerStore()
const detail = ref<MusicMvDetail | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

onMounted(async () => {
  const browseId = decodeURIComponent(String(route.params.browseId ?? ''))
  loading.value = true
  error.value = null
  try {
    detail.value = await window.wanwu.music.getPlatformMvDetail(browseId)
    if (!detail.value) error.value = '无法加载 MV 信息'
  } catch (e) {
    error.value = e instanceof Error ? e.message : '加载失败'
  } finally {
    loading.value = false
  }
})

async function playMv() {
  if (!detail.value) return
  const stream = await window.wanwu.music.resolvePlatformMvStream(detail.value.id)
  if (!stream?.url) {
    error.value = '无法获取播放地址'
    return
  }
  const track = {
    trackKey: `mv:${detail.value.id}`,
    provider: 'kugou' as const,
    videoId: detail.value.id,
    title: detail.value.title,
    artist: detail.value.artist,
    coverUrl: detail.value.coverUrl
  }
  void player.playTrack(track, [track])
}
</script>

<template>
  <div class="ww-music-tab-body ww-scroll-main">
    <div class="ww-music-content-shell">
      <MusicPageHeading title="MV" subtitle="音乐视频" />
      <p v-if="loading" class="ww-music-state-hint">加载中…</p>
      <p v-else-if="error" class="ww-music-state-hint">{{ error }}</p>
      <div v-else-if="detail" class="ww-music-mv-detail">
        <div class="ww-music-mv-detail__cover">
          <img v-if="detail.coverUrl" :src="detail.coverUrl" :alt="detail.title" />
        </div>
        <div class="ww-music-mv-detail__meta">
          <h2>{{ detail.title }}</h2>
          <p>{{ detail.artist }}</p>
          <button type="button" class="ww-music-glass-chip" @click="playMv">播放 MV</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ww-music-mv-detail {
  display: grid;
  grid-template-columns: minmax(8rem, 12rem) 1fr;
  gap: 1rem;
  padding: 1rem;
  border-radius: var(--ww-music-inner-radius, 0.875rem);
  background: var(--ww-glass-bg, color-mix(in srgb, var(--ww-surface) 72%, transparent));
}

.ww-music-mv-detail__cover img {
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  border-radius: calc(var(--ww-music-inner-radius, 0.875rem) * 0.75);
}

.ww-music-mv-detail__meta h2 {
  font-size: 1.1rem;
  font-weight: 600;
}

.ww-music-mv-detail__meta p {
  margin: 0.35rem 0 0.75rem;
  color: var(--ww-text-secondary);
}
</style>
