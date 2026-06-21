<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { WwSettingsPanel } from '@shared/components/settings'
import type { WwSettingsField } from '@shared/components/settings'
import { useSettingsStore } from '@shared/stores/settings'
import { QUICK_ACCESS_MODULE_ID } from '@modules/quick-access/domain/moduleId'
import { readQuickAccessModuleSettings } from '@modules/quick-access/domain/settings'

const settingsStore = useSettingsStore()
const { settings } = storeToRefs(settingsStore)

const quickAccessSettings = computed(() => readQuickAccessModuleSettings(settings.value))

const fields = computed((): WwSettingsField[] => [
  {
    type: 'toggle',
    label: '剪贴板联想',
    subtitle: '复制文字后提示万物中可能相关的图鉴（默认关闭）',
    ariaLabel: '剪贴板联想',
    modelValue: quickAccessSettings.value.clipboardAssistEnabled,
    onUpdate: async (value) => {
      const enabled = Boolean(value)
      if (enabled === quickAccessSettings.value.clipboardAssistEnabled) return
      await settingsStore.patchModuleSettings(QUICK_ACCESS_MODULE_ID, {
        clipboardAssistEnabled: enabled
      })
    }
  },
  {
    type: 'toggle',
    label: '日签小窗',
    subtitle: '启动后在桌面显示图鉴日签小窗',
    ariaLabel: '日签小窗',
    modelValue: quickAccessSettings.value.dailyWidgetEnabled,
    onUpdate: async (value) => {
      const enabled = Boolean(value)
      if (enabled === quickAccessSettings.value.dailyWidgetEnabled) return
      await settingsStore.patchModuleSettings(QUICK_ACCESS_MODULE_ID, {
        dailyWidgetEnabled: enabled
      })
    }
  }
])
</script>

<template>
  <WwSettingsPanel :fields="fields" layout="bare" />
</template>
