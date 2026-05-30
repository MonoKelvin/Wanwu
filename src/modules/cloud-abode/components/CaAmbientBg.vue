<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import Hls from 'hls.js'
import { CA_UI_ASSETS } from '@modules/cloud-abode/shared/caUiAssets'
import {
  caAmbientVideoPlaylist,
  type CaAmbientVideoKey
} from '@modules/cloud-abode/shared/caAmbientVideo'

defineOptions({ name: 'CaAmbientBg' })

const props = defineProps<{
  variant?: CaAmbientVideoKey
}>()

const videoRef = ref<HTMLVideoElement | null>(null)
const switching = ref(false)
let hls: Hls | null = null
let reducedMotion = false

function destroyHls() {
  hls?.destroy()
  hls = null
}

function playVideo(video: HTMLVideoElement) {
  void video.play().catch(() => {})
}

function bindVideo(video: HTMLVideoElement, key: CaAmbientVideoKey) {
  destroyHls()
  const src = caAmbientVideoPlaylist(key)
  if (!src) {
    console.warn('[cloud-abode] ambient video path missing:', key)
    return
  }

  if (Hls.isSupported()) {
    hls = new Hls({
      enableWorker: false,
      lowLatencyMode: false
    })
    hls.loadSource(src)
    hls.attachMedia(video)
    hls.on(Hls.Events.MANIFEST_PARSED, () => playVideo(video))
    hls.on(Hls.Events.ERROR, (_event, data) => {
      if (!data.fatal) return
      console.warn('[cloud-abode] HLS fatal error', data.type, data.details, src)
      if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
        hls?.startLoad()
      } else {
        destroyHls()
      }
    })
    return
  }

  if (video.canPlayType('application/vnd.apple.mpegurl')) {
    video.src = src
    video.addEventListener('loadedmetadata', () => playVideo(video), { once: true })
  }
}

async function switchVariant(key: CaAmbientVideoKey) {
  const video = videoRef.value
  if (!video || reducedMotion) return

  switching.value = true
  await new Promise((r) => setTimeout(r, 180))
  bindVideo(video, key)
  switching.value = false
}

onMounted(() => {
  reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const video = videoRef.value
  if (!video || reducedMotion) return
  bindVideo(video, props.variant ?? 'home')
})

watch(
  () => props.variant,
  (next, prev) => {
    if (!next || next === prev) return
    void switchVariant(next)
  }
)

onUnmounted(() => {
  destroyHls()
  const video = videoRef.value
  if (video) {
    video.pause()
    video.removeAttribute('src')
    video.load()
  }
})
</script>

<template>
  <div class="ww-ca-ambient" aria-hidden="true">
    <svg class="ww-ca-ambient__svg-defs" width="0" height="0" aria-hidden="true">
      <filter id="ww-ca-grain" x="0%" y="0%" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="4" stitchTiles="stitch" />
        <feColorMatrix type="saturate" values="0" />
        <feComponentTransfer>
          <feFuncA type="linear" slope="0.028" />
        </feComponentTransfer>
      </filter>
    </svg>

    <video
      ref="videoRef"
      class="ww-ca-ambient__video"
      :class="{ 'ww-ca-ambient__video--switching': switching }"
      muted
      loop
      playsinline
      preload="auto"
    />

    <div class="ww-ca-ambient__scrim" />

    <div
      class="ww-ca-texture-layer ww-ca-texture-layer--grain"
      :style="{ backgroundImage: `url(${CA_UI_ASSETS.grain})` }"
    />
    <div class="ww-ca-ambient__grain" />
    <div class="ww-ca-ambient__vignette" />
  </div>
</template>
