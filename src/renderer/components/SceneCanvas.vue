<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import * as THREE from 'three'
import { SceneRenderer } from '../core/SceneRenderer'
import type { SceneQuality } from '../types'
import type { RenderBackend } from '../types/engine'

const props = withDefaults(
  defineProps<{
    quality?: SceneQuality
    exposure?: number
    bloomIntensity?: number
    bloomLuminanceSmoothing?: number
    bloomLuminanceThreshold?: number
    toneMapping?: THREE.ToneMapping
    /** 异步初始化 — 启用 WebGPU/WebGL 双后端探测 */
    asyncInit?: boolean
    backend?: RenderBackend
    enableSSR?: boolean
    enableSSAO?: boolean
    ssrIntensity?: number
    enableToneMapping?: boolean
    cinematic?: boolean
    enableSMAA?: boolean
    enableCinematicGrade?: boolean
    enableTemporalAA?: boolean
  }>(),
  { quality: 'high', asyncInit: false }
)

const emit = defineEmits<{
  ready: [renderer: SceneRenderer]
  progress: [ratio: number]
  error: [message: string]
}>()

const hostRef = ref<HTMLElement | null>(null)
const rendererRef = shallowRef<SceneRenderer | null>(null)
const loading = ref(false)

function buildOptions() {
  return {
    quality: props.quality,
    exposure: props.exposure,
    bloomIntensity: props.bloomIntensity,
    bloomLuminanceSmoothing: props.bloomLuminanceSmoothing,
    bloomLuminanceThreshold: props.bloomLuminanceThreshold,
    toneMapping: props.toneMapping,
    backend: props.backend,
    enableSSR: props.enableSSR,
    enableSSAO: props.enableSSAO,
    ssrIntensity: props.ssrIntensity,
    enableToneMapping: props.enableToneMapping,
    cinematic: props.cinematic,
    enableSMAA: props.enableSMAA,
    enableCinematicGrade: props.enableCinematicGrade,
    enableTemporalAA: props.enableTemporalAA
  }
}

onMounted(async () => {
  const el = hostRef.value
  if (!el) return
  try {
    loading.value = props.asyncInit
    const renderer = props.asyncInit
      ? await SceneRenderer.create(el, buildOptions())
      : new SceneRenderer(el, buildOptions())
    renderer.setProgressHandler((e) => emit('progress', e.ratio))
    rendererRef.value = renderer
    emit('ready', renderer)
  } catch (e) {
    const message =
      e instanceof Error
        ? `${e.message}${e.stack ? `\n${e.stack.split('\n').slice(0, 6).join('\n')}` : ''}`
        : String(e)
    console.error('[SceneCanvas] 初始化失败', e)
    emit('error', message)
  } finally {
    loading.value = false
  }
})

onBeforeUnmount(() => {
  rendererRef.value?.dispose()
  rendererRef.value = null
})

defineExpose({ renderer: rendererRef, loading })
</script>

<template>
  <div ref="hostRef" class="relative h-full min-h-0 w-full overflow-hidden bg-black">
    <div
      v-if="loading"
      class="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black/60 text-sm text-white/70"
    >
      初始化渲染器…
    </div>
  </div>
</template>
