<script setup lang="ts">
import { computed } from 'vue'
import { weatherIconUrl } from '@modules/weather/components/weatherIconAssets'
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

const src = computed(() => weatherIconUrl(props.name))
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
