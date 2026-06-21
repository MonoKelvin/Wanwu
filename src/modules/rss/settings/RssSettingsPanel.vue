<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { WwSettingsPanel } from '@shared/components/settings'
import type { WwSettingsField } from '@shared/components/settings'
import { useSettingsStore } from '@shared/stores/settings'
import { RSS_MODULE_ID } from '@modules/rss/domain/moduleId'
import {
  RSS_AUTO_REFRESH_OPTIONS,
  RSS_FETCH_LIMIT_OPTIONS,
  readRssModuleSettings,
  type RssAutoRefreshMinutes,
  type RssFetchLimit
} from '@modules/rss/domain/settings'

const settingsStore = useSettingsStore()
const { settings } = storeToRefs(settingsStore)

const rssSettings = computed(() => readRssModuleSettings(settings.value))

const fetchOptions = RSS_FETCH_LIMIT_OPTIONS.map((n) => ({
  label: `${n} 条`,
  value: n as RssFetchLimit
}))

const fields = computed((): WwSettingsField[] => [
  {
    type: 'segment',
    label: '每次获取条目',
    options: fetchOptions,
    wide: true,
    modelValue: rssSettings.value.fetchLimit,
    onUpdate: async (value) => {
      const limit = value as RssFetchLimit
      if (limit === rssSettings.value.fetchLimit) return
      await settingsStore.patchModuleSettings(RSS_MODULE_ID, { fetchLimit: limit })
    }
  },
  {
    type: 'select',
    label: '后台定时刷新',
    size: 'narrow',
    options: RSS_AUTO_REFRESH_OPTIONS,
    modelValue: rssSettings.value.autoRefreshMinutes,
    onUpdate: async (value) => {
      const minutes = value as RssAutoRefreshMinutes | null
      if (minutes == null || minutes === rssSettings.value.autoRefreshMinutes) return
      await settingsStore.patchModuleSettings(RSS_MODULE_ID, { autoRefreshMinutes: minutes })
    }
  }
])
</script>

<template>
  <WwSettingsPanel :fields="fields" />
</template>
