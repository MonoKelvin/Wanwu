<script setup lang="ts">
import { storeToRefs } from 'pinia'
import SelectButton from 'primevue/selectbutton'
import { useSettingsStore } from '@shared/stores/settings'
import SettingsRow from '@features/settings/SettingsRow.vue'
import WwSelect from '@shared/components/WwSelect'
import {
  RSS_AUTO_REFRESH_OPTIONS,
  RSS_FETCH_LIMIT_OPTIONS,
  type RssAutoRefreshMinutes,
  type RssFetchLimit
} from '@shared/types/settings'

const settingsStore = useSettingsStore()
const { settings } = storeToRefs(settingsStore)

const rssFetchOptions = RSS_FETCH_LIMIT_OPTIONS.map((n) => ({
  label: `${n} 条`,
  value: n as RssFetchLimit
}))

async function onRssFetchLimitChange(v: RssFetchLimit) {
  if (v && v !== settings.value.rssFetchLimit) await settingsStore.setRssFetchLimit(v)
}

async function onRssAutoRefreshChange(v: RssAutoRefreshMinutes | null) {
  if (v === null || v === undefined || v === settings.value.rssAutoRefreshMinutes) return
  await settingsStore.setRssAutoRefreshMinutes(v)
}
</script>

<template>
  <div class="ww-settings-section">
    <div class="ww-settings-group">
      <SettingsRow label="每次获取条目">
        <SelectButton
          class="ww-settings-segment"
          :model-value="settings.rssFetchLimit"
          :options="rssFetchOptions"
          option-label="label"
          option-value="value"
          :allow-empty="false"
          @update:model-value="onRssFetchLimitChange"
        />
      </SettingsRow>
      <SettingsRow label="后台定时刷新">
        <WwSelect
          :model-value="settings.rssAutoRefreshMinutes"
          :options="RSS_AUTO_REFRESH_OPTIONS"
          @update:model-value="onRssAutoRefreshChange"
        />
      </SettingsRow>
    </div>
  </div>
</template>
