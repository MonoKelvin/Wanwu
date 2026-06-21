<script setup lang="ts">
/** 侧栏地名自适应字号与换行（Canvas 测量宽度） */
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { computeSidebarPlaceLayout } from '@modules/weather/components/fitSidebarPlaceText'

const props = defineProps<{
  text: string
}>()

const rootRef = ref<HTMLElement | null>(null)
const fontSizeRem = ref(0.625)
const lines = ref<string[]>([''])

let measureCtx: CanvasRenderingContext2D | null = null
let resizeObserver: ResizeObserver | null = null

function getMeasureCtx(): CanvasRenderingContext2D {
  if (!measureCtx) {
    measureCtx = document.createElement('canvas').getContext('2d')
  }
  if (!measureCtx) throw new Error('canvas 2d unavailable')
  return measureCtx
}

function readContainerWidth(el: HTMLElement): number {
  return el.clientWidth || el.parentElement?.clientWidth || 0
}

function remeasure() {
  const el = rootRef.value
  if (!el) return

  const label = props.text.trim()
  if (!label) {
    fontSizeRem.value = 0.625
    lines.value = ['']
    return
  }

  const width = readContainerWidth(el)
  if (width <= 0) return

  const style = getComputedStyle(el)
  const rootPx = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
  const layout = computeSidebarPlaceLayout(
    label,
    width,
    style.fontFamily,
    rootPx,
    getMeasureCtx(),
    style.fontWeight || '400'
  )
  fontSizeRem.value = layout.fontSizeRem
  lines.value = layout.lines
}

watch(
  () => props.text,
  () => {
    void nextTick(remeasure)
  },
  { immediate: true }
)

onMounted(() => {
  void nextTick(() => {
    remeasure()
    const el = rootRef.value
    if (!el || typeof ResizeObserver === 'undefined') return
    resizeObserver = new ResizeObserver(() => remeasure())
    resizeObserver.observe(el)
    if (el.parentElement) resizeObserver.observe(el.parentElement)
  })
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
})
</script>

<template>
  <span
    ref="rootRef"
    class="ww-weather-sidebar__area"
    :style="{ fontSize: `${fontSizeRem}rem` }"
    :title="text"
  >
    <span v-for="(line, index) in lines" :key="index" class="ww-weather-sidebar__area-line">
      {{ line }}
    </span>
  </span>
</template>
