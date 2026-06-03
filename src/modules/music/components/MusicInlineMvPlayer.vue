<script setup lang="ts">
import { onBeforeUnmount, onUnmounted, ref, watch } from 'vue'
import type Hls from 'hls.js'
import WwIcon from '@shared/components/WwIcon.vue'

const props = defineProps<{
  src: string
  poster?: string
  title?: string
}>()

const emit = defineEmits<{
  play: []
  pause: []
}>()

const videoRef = ref<HTMLVideoElement | null>(null)
const playing = ref(false)
const loading = ref(false)
const error = ref<string | null>(null)
let hls: Hls | null = null

function destroyHls() {
  if (hls) {
    hls.detachMedia()
    hls.destroy()
    hls = null
  }
}

function isHls(url: string): boolean {
  return /\.m3u8(\?|$)/i.test(url)
}

function stopPlayback(opts?: { notifyPause?: boolean }) {
  const video = videoRef.value
  const wasPlaying = playing.value
  if (video) {
    video.pause()
    video.removeAttribute('src')
    video.load()
  }
  destroyHls()
  playing.value = false
  if (wasPlaying && opts?.notifyPause) emit('pause')
}

function bindSource(url: string) {
  const video = videoRef.value
  if (!video) return Promise.resolve()
  destroyHls()
  error.value = null

  if (isHls(url)) {
    return import('hls.js').then(({ default: Hls }) => {
      if (Hls.isSupported()) {
        hls = new Hls({ enableWorker: false, lowLatencyMode: false })
        hls.loadSource(url)
        hls.attachMedia(video)
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          void video.play().catch(() => {
            error.value = '无法自动播放'
          })
        })
        hls.on(Hls.Events.ERROR, (_e, data) => {
          if (!data.fatal) return
          error.value = '视频加载失败'
          destroyHls()
        })
        return
      }
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = url
        video.addEventListener(
          'loadedmetadata',
          () => {
            void video.play().catch(() => {
              error.value = '无法自动播放'
            })
          },
          { once: true }
        )
        return
      }
      error.value = '当前环境不支持 HLS 播放'
    })
  }

  video.src = url
  void video.play().catch(() => {
    error.value = '无法自动播放'
  })
  return Promise.resolve()
}

function onVideoPlay() {
  if (playing.value) return
  playing.value = true
  emit('play')
}

function onVideoPause() {
  if (!playing.value) return
  playing.value = false
  emit('pause')
}

async function togglePlay() {
  const video = videoRef.value
  if (!video || !props.src) return

  if (playing.value) {
    video.pause()
    return
  }

  emit('play')
  loading.value = true
  error.value = null
  try {
    await bindSource(props.src)
  } catch (e) {
    error.value = e instanceof Error ? e.message : '播放失败'
    playing.value = false
    emit('pause')
  } finally {
    loading.value = false
  }
}

watch(
  () => props.src,
  () => {
    stopPlayback()
    error.value = null
  }
)

onBeforeUnmount(() => stopPlayback())
onUnmounted(() => destroyHls())

defineExpose({ stop: () => stopPlayback() })
</script>

<template>
  <div class="ww-mv-player">
    <div class="ww-mv-player__stage">
      <video
        ref="videoRef"
        class="ww-mv-player__video"
        :poster="poster"
        playsinline
        controls
        :class="{ 'is-visible': playing }"
        @play="onVideoPlay"
        @pause="onVideoPause"
        @ended="onVideoPause"
      />
      <button
        v-if="!playing"
        type="button"
        class="ww-mv-player__play"
        :disabled="loading || !src"
        aria-label="播放 MV"
        @click="togglePlay"
      >
        <WwIcon v-if="loading" name="loader" size="lg" spin />
        <WwIcon v-else name="play" size="lg" filled class="ww-mv-player__play-icon" />
      </button>
      <img
        v-if="poster && !playing"
        :src="poster"
        :alt="title ?? ''"
        class="ww-mv-player__poster"
        referrerpolicy="no-referrer"
      />
    </div>
    <p v-if="error" class="ww-mv-player__error">{{ error }}</p>
  </div>
</template>

<style scoped>
.ww-mv-player__stage {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  border-radius: var(--ww-music-inner-radius, 0.875rem);
  overflow: hidden;
  background: color-mix(in srgb, var(--ww-ink) 8%, var(--ww-inset));
}

.ww-mv-player__video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #000;
  opacity: 0;
  pointer-events: none;
  z-index: 2;
}

.ww-mv-player__video.is-visible {
  opacity: 1;
  pointer-events: auto;
}

.ww-mv-player__poster {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  z-index: 0;
}

.ww-mv-player__play {
  position: absolute;
  left: 50%;
  top: 50%;
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 4rem;
  height: 4rem;
  margin: -2rem 0 0 -2rem;
  padding: 0;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  color: var(--ww-ink);
  background: color-mix(in srgb, var(--ww-surface) 88%, transparent);
  box-shadow:
    0 8px 24px color-mix(in srgb, black 22%, transparent),
    inset 0 1px 0 color-mix(in srgb, #fff 35%, transparent);
  backdrop-filter: blur(12px);
  transition:
    transform 0.2s var(--ww-ease-out),
    background 0.2s var(--ww-ease-out);
}

.ww-mv-player__play:hover:not(:disabled) {
  transform: scale(1.05);
  background: color-mix(in srgb, var(--ww-surface) 96%, transparent);
}

.ww-mv-player__play:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.ww-mv-player__play-icon {
  margin-left: 0.15rem;
}

.ww-mv-player__error {
  margin: 0.5rem 0 0;
  font-size: 0.8125rem;
  color: var(--ww-danger-text, #b91c1c);
}
</style>
