<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import { SceneRenderer } from '../core/SceneRenderer'
import type { SceneQuality } from '../types'

const props = withDefaults(
  defineProps<{
    quality?: SceneQuality
  }>(),
  { quality: 'high' }
)

const emit = defineEmits<{
  ready: [renderer: SceneRenderer]
  progress: [ratio: number]
  error: [message: string]
}>()

const hostRef = ref<HTMLElement | null>(null)
const rendererRef = shallowRef<SceneRenderer | null>(null)

onMounted(() => {
  const el = hostRef.value
  if (!el) return
  try {
    const renderer = new SceneRenderer(el, { quality: props.quality })
    renderer.setProgressHandler((e) => emit('progress', e.ratio))
    rendererRef.value = renderer
    emit('ready', renderer)
  } catch (e) {
    emit('error', e instanceof Error ? e.message : String(e))
  }
})

onBeforeUnmount(() => {
  rendererRef.value?.dispose()
  rendererRef.value = null
})

defineExpose({ renderer: rendererRef })
</script>

<template>
  <div ref="hostRef" class="relative h-full min-h-0 w-full overflow-hidden bg-black" />
</template>
