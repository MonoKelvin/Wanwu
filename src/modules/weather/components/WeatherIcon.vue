<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { readAppIconTheme, weatherIconUrl } from '@modules/weather/components/weatherIconAssets'
import type { WeatherIconId } from '@modules/weather/domain/weatherIconIds'

const props = withDefaults(
  defineProps<{
    name: WeatherIconId
    size?: number
    /** 加载/刷新时的闪烁脉动 */
    pulse?: boolean
  }>(),
  {
    size: 28,
    pulse: false
  }
)

const theme = ref(readAppIconTheme())
let themeObserver: MutationObserver | null = null

onMounted(() => {
  theme.value = readAppIconTheme()
  themeObserver = new MutationObserver(() => {
    theme.value = readAppIconTheme()
  })
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme', 'class']
  })
})

onUnmounted(() => {
  themeObserver?.disconnect()
  themeObserver = null
})

const src = computed(() => weatherIconUrl(props.name, theme.value))
</script>

<template>
  <img
    :src="src"
    :width="size"
    :height="size"
    class="ww-weather-icon"
    :class="{ 'ww-weather-icon--pulse': pulse }"
    alt=""
    aria-hidden="true"
  />
</template>
