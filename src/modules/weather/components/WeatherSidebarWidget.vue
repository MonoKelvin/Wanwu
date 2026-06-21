<script setup lang="ts">
/** 侧栏底部天气挂件：首屏读缓存，仅在间隔到期或坐标变化时刷新 */
import { computed, onMounted, onUnmounted, ref } from 'vue'
import WeatherIcon from '@modules/weather/components/WeatherIcon.vue'
import WeatherSidebarPlaceLabel from '@modules/weather/components/WeatherSidebarPlaceLabel.vue'
import {
  markWeatherGeoAttempted,
  wasWeatherGeoAttempted
} from '@modules/weather/components/weatherSessionState'
import type { WeatherSnapshot } from '@modules/weather/domain/types'
import { WEATHER_ICON_LOADING, type WeatherIconId } from '@modules/weather/domain/weatherIconIds'
import { formatWeatherPlaceLabel } from '@modules/weather/domain/placeLabel'
import '@modules/weather/domain/wanwuApi'

const snapshot = ref<WeatherSnapshot | null>(null)
const refreshing = ref(true)
let stopListen: (() => void) | null = null
let stopRefreshing: (() => void) | null = null

const tempValue = computed(() => {
  if (refreshing.value && !snapshot.value) return '—'
  const temp = snapshot.value?.temperatureC
  if (temp == null) return '—'
  return String(temp)
})
const areaLabel = computed(() => {
  if (refreshing.value && !snapshot.value?.area) return '定位中'
  const s = snapshot.value
  if (!s?.area?.trim()) return '定位中'
  return formatWeatherPlaceLabel(s.area, s.city)
})
const iconName = computed((): WeatherIconId => {
  if (refreshing.value) return WEATHER_ICON_LOADING
  return snapshot.value?.icon ?? WEATHER_ICON_LOADING
})
const ariaLabel = computed(() => {
  if (refreshing.value && !snapshot.value) return '天气加载中'
  const s = snapshot.value
  if (!s) return '天气加载中'
  const place = formatWeatherPlaceLabel(s.area, s.city)
  const temp = s.temperatureC == null ? '—' : `${s.temperatureC}°`
  return `${place} ${s.summary} ${temp}`
})

function tryAdoptSystemLocation() {
  if (!navigator.geolocation || !window.wanwu?.weather) {
    void window.wanwu?.weather?.refresh()
    return
  }

  markWeatherGeoAttempted()
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      void window.wanwu.weather.adoptCoordinates({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude
      })
    },
    () => {
      void window.wanwu?.weather?.refresh()
    },
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 300_000 }
  )
}

onMounted(async () => {
  stopListen =
    window.wanwu?.weather?.onUpdated((next) => {
      snapshot.value = next
      refreshing.value = false
    }) ?? null
  stopRefreshing =
    window.wanwu?.weather?.onRefreshing(() => {
      refreshing.value = true
    }) ?? null

  const cached = await window.wanwu?.weather?.getSnapshot()
  if (cached) {
    snapshot.value = cached
    refreshing.value = false
  }

  if (!wasWeatherGeoAttempted()) {
    tryAdoptSystemLocation()
  } else {
    void window.wanwu?.weather?.refresh()
  }
})

onUnmounted(() => {
  stopListen?.()
  stopRefreshing?.()
  stopListen = null
  stopRefreshing = null
})
</script>

<template>
  <div class="ww-weather-sidebar" :aria-label="ariaLabel">
    <WeatherIcon
      :name="iconName"
      :size="30"
      :pulse="refreshing"
      class="ww-weather-sidebar__icon"
    />
    <div class="ww-weather-sidebar__text">
      <span class="ww-weather-sidebar__temp">
        <span class="ww-weather-sidebar__temp-value">{{ tempValue }}</span>
        <span class="ww-weather-sidebar__temp-unit" aria-hidden="true">°</span>
      </span>
      <WeatherSidebarPlaceLabel :text="areaLabel" />
    </div>
  </div>
</template>
