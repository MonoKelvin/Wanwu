<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { WwSettingsPanel } from '@shared/components/settings'
import type { WwSettingsField } from '@shared/components/settings'
import { useSettingsStore } from '@shared/stores/settings'
import {
  LEISURE_READ_ARTICLE_MODE_OPTIONS,
  LEISURE_READ_JOKE_LANG_OPTIONS,
  LEISURE_READ_MODULE_ID,
  readLeisureReadModuleSettings,
  type LeisureReadArticleMode,
  type LeisureReadJokeLang
} from '@modules/library/leisure-read/domain/settings'

const settingsStore = useSettingsStore()
const { settings } = storeToRefs(settingsStore)

const moduleSettings = computed(() => readLeisureReadModuleSettings(settings.value))

const fields = computed((): WwSettingsField[] => [
  {
    type: 'segment',
    label: '冷笑话语言',
    subtitle: '默认中文；可在英文笑话源间切换',
    options: LEISURE_READ_JOKE_LANG_OPTIONS,
    modelValue: moduleSettings.value.jokeLang,
    onUpdate: async (value) => {
      const next = value as LeisureReadJokeLang
      if (!next || next === moduleSettings.value.jokeLang) return
      await settingsStore.patchModuleSettings(LEISURE_READ_MODULE_ID, { jokeLang: next })
    }
  },
  {
    type: 'segment',
    label: '每日一文',
    subtitle: '默认随机；可切换为今日一文',
    options: LEISURE_READ_ARTICLE_MODE_OPTIONS,
    modelValue: moduleSettings.value.articleMode,
    onUpdate: async (value) => {
      const next = value as LeisureReadArticleMode
      if (!next || next === moduleSettings.value.articleMode) return
      await settingsStore.patchModuleSettings(LEISURE_READ_MODULE_ID, { articleMode: next })
    }
  }
])
</script>

<template>
  <WwSettingsPanel :fields="fields" />
</template>
