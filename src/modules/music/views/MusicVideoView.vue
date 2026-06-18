<script setup lang="ts">
import { computed, onActivated, onDeactivated, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import MusicAlbumHero from '@modules/music/components/MusicAlbumHero.vue'
import MusicInlineMvPlayer from '@modules/music/components/MusicInlineMvPlayer.vue'
import { useMusicMvPlayback } from '@modules/music/composables/useMusicMvPlayback'
import type { MusicMvDetail } from '@modules/music/domain/types'
import MusicScrollBody from '@modules/music/components/MusicScrollBody.vue'
import '@modules/music/styles/music-shared.css'

defineOptions({ name: 'MusicVideoView' })

const route = useRoute()
const mvPlayback = useMusicMvPlayback()
const detail = ref<MusicMvDetail | null>(null)
const streamUrl = ref<string | null>(null)
const loading = ref(true)
const streamLoading = ref(false)
const error = ref<string | null>(null)
const playerRef = ref<InstanceType<typeof MusicInlineMvPlayer> | null>(null)

const browseId = computed(() => decodeURIComponent(String(route.params.browseId ?? '')))

const playCountLabel = computed(() => {
  const n = detail.value?.playCount
  if (n == null || n <= 0) return ''
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}亿次播放`
  if (n >= 10_000) return `${Math.round(n / 10_000)}万次播放`
  return `${n}次播放`
})

const heroMeta = computed(() => {
  const parts = [detail.value?.artist, playCountLabel.value].filter(Boolean)
  return parts.join(' · ')
})

async function loadMv(id: string) {
  playerRef.value?.stop()
  streamUrl.value = null
  detail.value = null
  loading.value = true
  error.value = null
  try {
    const d = await window.wanwu.music.getPlatformMvDetail(id)
    if (!d) {
      error.value = '无法加载 MV 信息'
      return
    }
    detail.value = d
    streamLoading.value = true
    const stream = await window.wanwu.music.resolvePlatformMvStream(d.id)
    streamUrl.value = stream?.url ?? null
    if (!streamUrl.value) error.value = '暂无法获取播放地址'
  } catch (e) {
    error.value = e instanceof Error ? e.message : '加载失败'
  } finally {
    loading.value = false
    streamLoading.value = false
  }
}

watch(
  browseId,
  (id) => {
    if (!id) return
    void loadMv(id)
  },
  { immediate: true }
)

function syncEnterMvPage() {
  mvPlayback.enterMvPage()
}

function syncLeaveMvPage() {
  playerRef.value?.stop()
  mvPlayback.leaveMvPage()
}

onMounted(syncEnterMvPage)
onActivated(syncEnterMvPage)

onDeactivated(syncLeaveMvPage)
onUnmounted(syncLeaveMvPage)
</script>

<template>
  <MusicScrollBody class="ww-music-mv-page-body">
    <div class="ww-music-content-shell ww-music-mv-page">
      <p v-if="loading" class="ww-music-state-hint">加载中…</p>
      <p v-else-if="error && !detail" class="ww-music-state-hint">{{ error }}</p>
      <template v-else-if="detail">
        <MusicAlbumHero
          :title="detail.title"
          subtitle="MV"
          :cover-url="detail.coverUrl"
          :meta="heroMeta || undefined"
        />

        <MusicInlineMvPlayer
          :key="browseId"
          ref="playerRef"
          :src="streamUrl ?? ''"
          :poster="detail.coverUrl"
          :title="detail.title"
          @play="mvPlayback.onMvVideoPlay"
          @pause="mvPlayback.onMvVideoPause"
        />
        <p v-if="streamLoading" class="ww-music-state-hint ww-music-mv-page__hint">正在解析播放地址…</p>
        <p v-else-if="error" class="ww-mv-page-error">{{ error }}</p>
      </template>
    </div>
  </MusicScrollBody>
</template>

<style scoped>
.ww-music-mv-page-body {
  padding-bottom: 1.25rem;
}

.ww-music-mv-page__hint {
  margin-top: 0.5rem;
}

.ww-mv-page-error {
  margin: 0.5rem 0 0;
  font-size: 0.8125rem;
  color: var(--ww-danger-text, #b91c1c);
}
</style>
