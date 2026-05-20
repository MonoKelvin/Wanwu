<script setup lang="ts">
import { storeToRefs } from 'pinia'
import SelectButton from 'primevue/selectbutton'
import { useSettingsStore } from '@shared/stores/settings'
import { useWanwuToast } from '@shared/composables/useWanwuToast'
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
const toast = useWanwuToast()

const rssFetchOptions = RSS_FETCH_LIMIT_OPTIONS.map((n) => ({
  label: `${n} 条`,
  value: n as RssFetchLimit
}))

async function onRssFetchLimitChange(v: RssFetchLimit) {
  if (v && v !== settings.value.rssFetchLimit) {
    await settingsStore.setRssFetchLimit(v)
    toast.success('RSS 拉取条数已更新')
  }
}

async function onRssAutoRefreshChange(v: RssAutoRefreshMinutes | null) {
  if (v === null || v === undefined || v === settings.value.rssAutoRefreshMinutes) return
  await settingsStore.setRssAutoRefreshMinutes(v)
  toast.success(v === 0 ? '已关闭后台刷新' : '后台刷新间隔已更新')
}
</script>

<template>
  <div class="ww-settings-section">
    <div class="ww-settings-group">
      <SettingsRow label="每次获取条目" subtitle="刷新与加载更多时使用的条数">
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
      <SettingsRow
        label="后台定时刷新"
        subtitle="应用运行期间自动拉取所有已启用订阅源（不含回收站）"
      >
        <WwSelect
          :model-value="settings.rssAutoRefreshMinutes"
          :options="RSS_AUTO_REFRESH_OPTIONS"
          @update:model-value="onRssAutoRefreshChange"
        />
      </SettingsRow>
    </div>
  </div>
</template>
