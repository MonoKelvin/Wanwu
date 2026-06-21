<script setup lang="ts">
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import WwIcon from '@shared/components/WwIcon.vue'
import { WwSettingsPanel } from '@shared/components/settings'
import type { WwSettingsField } from '@shared/components/settings'
import { useSettingsStore } from '@shared/stores/settings'
import { WEATHER_MODULE_ID } from '@modules/weather/domain/moduleId'
import {
  WEATHER_REFRESH_OPTIONS,
  readWeatherModuleSettings,
  type WeatherRefreshMinutes
} from '@modules/weather/domain/settings'
import {
  resolveWeatherApiGroups,
  type WeatherApiGroup
} from '@modules/weather/domain/apiCatalog'
import './weather-settings.css'

const settingsStore = useSettingsStore()
const { settings } = storeToRefs(settingsStore)

const weatherSettings = computed(() => readWeatherModuleSettings(settings.value))

const fields = computed((): WwSettingsField[] => [
  {
    type: 'toggle',
    label: '显示侧栏天气',
    subtitle: '控制左侧导航底部是否展示当前城市天气状况',
    ariaLabel: '显示侧栏天气',
    modelValue: weatherSettings.value.enabled,
    onUpdate: async (value) => {
      const enabled = Boolean(value)
      if (enabled === weatherSettings.value.enabled) return
      await settingsStore.patchModuleSettings(WEATHER_MODULE_ID, { enabled })
    }
  },
  {
    type: 'select',
    label: '刷新间隔',
    subtitle: '后台自动更新天气数据',
    size: 'narrow',
    disabled: !weatherSettings.value.enabled,
    modelValue: weatherSettings.value.refreshMinutes,
    options: WEATHER_REFRESH_OPTIONS,
    onUpdate: async (value) => {
      const minutes = value as WeatherRefreshMinutes | null
      if (minutes == null || minutes === weatherSettings.value.refreshMinutes) return
      await settingsStore.patchModuleSettings(WEATHER_MODULE_ID, { refreshMinutes: minutes })
    }
  }
])

const apiGroups = computed(() => resolveWeatherApiGroups())
const expandedGroups = ref<Record<string, boolean>>({})

function groupKey(group: WeatherApiGroup) {
  return group.id
}

function isGroupExpanded(group: WeatherApiGroup) {
  return expandedGroups.value[groupKey(group)] ?? false
}

function toggleGroup(group: WeatherApiGroup) {
  const key = groupKey(group)
  expandedGroups.value[key] = !isGroupExpanded(group)
}
</script>

<template>
  <WwSettingsPanel :fields="fields" layout="bare" />

  <div class="ww-weather-settings-apis">
    <h3 class="ww-weather-settings-apis__heading">数据接口</h3>
    <p class="ww-weather-settings-apis__intro">
      天气与定位通过以下第三方公开接口获取。请求失败或超时时会自动尝试同类的备用接口，并在后台记住最近成功的来源。
    </p>

    <section
      v-for="group in apiGroups"
      :key="groupKey(group)"
      class="ww-weather-settings-apis__section"
    >
      <button
        type="button"
        class="ww-weather-settings-apis__section-toggle"
        :aria-expanded="isGroupExpanded(group)"
        @click="toggleGroup(group)"
      >
        <WwIcon
          name="chevron-right"
          size="sm"
          class="ww-weather-settings-apis__chevron"
          :class="{ 'is-open': isGroupExpanded(group) }"
          aria-hidden="true"
        />
        <span class="ww-weather-settings-apis__section-title">{{ group.label }}</span>
        <span class="ww-weather-settings-apis__section-count">{{ group.sources.length }}</span>
      </button>
      <ul v-show="isGroupExpanded(group)" class="ww-weather-settings-apis__rows">
        <li v-for="(source, index) in group.sources" :key="source.id">
          <div class="ww-weather-settings-apis__row">
            <span class="ww-weather-settings-apis__name-col">
              <span
                class="ww-weather-settings-apis__tag"
                :class="index === 0 ? 'is-primary' : 'is-fallback'"
              >
                {{ index === 0 ? '首选' : `备用 ${index}` }}
              </span>
              <span class="ww-weather-settings-apis__name">{{ source.name }}</span>
            </span>
            <span class="ww-weather-settings-apis__meta">
              {{ source.host }} · {{ source.description }}
            </span>
          </div>
        </li>
      </ul>
    </section>

    <p class="ww-weather-settings-apis__footnote">
      定位优先级：系统 geolocation → IP 定位（VPN/代理出口会被跳过）→ 系统 locale 首都。系统 locale 为中国大陆时，IP 定位优先使用太平洋网络，天气数据优先使用中央气象台；失败时自动回退至 Open-Meteo 等国际接口。使用 VPN 时若系统定位不可用，可能仍无法精确到本地。以上内容来自第三方服务，仅供个人查看天气，请遵守各接口提供方的使用条款。
    </p>
  </div>
</template>
