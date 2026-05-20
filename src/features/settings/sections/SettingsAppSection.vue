<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import SelectButton from 'primevue/selectbutton'
import { MODULE_NAV_ITEMS } from '@app/config/modules'
import { useSettingsStore } from '@shared/stores/settings'
import SettingsRow from '@features/settings/SettingsRow.vue'
import WwSelect from '@shared/components/WwSelect'
import { buildStartupModuleOptions } from '@shared/utils/startupModule'
import {
  COLOR_SCHEME_OPTIONS,
  WINDOW_STATE_MODE_OPTIONS,
  type ColorScheme,
  type NavAlign,
  type NavDisplay,
  type StartupModule,
  type WindowStateMode
} from '@shared/types/settings'

const settingsStore = useSettingsStore()
const { settings } = storeToRefs(settingsStore)

const startupModuleOptions = computed(() => buildStartupModuleOptions(MODULE_NAV_ITEMS))

const navAlignOptions = [
  { label: '居中', value: 'center' as NavAlign },
  { label: '靠上', value: 'start' as NavAlign }
]

const navDisplayOptions = [
  { label: '仅图标', value: 'icon' as NavDisplay },
  { label: '图标+文字', value: 'both' as NavDisplay }
]

async function onNavAlignChange(v: NavAlign) {
  if (v && v !== settings.value.navAlign) await settingsStore.setNavAlign(v)
}

async function onNavDisplayChange(v: NavDisplay) {
  if (v && v !== settings.value.navDisplay) await settingsStore.setNavDisplay(v)
}

async function onStartupModuleChange(v: StartupModule | null) {
  if (!v || v === settings.value.startupModule) return
  await settingsStore.setStartupModule(v)
}

async function onWindowStateModeChange(v: WindowStateMode | null) {
  if (!v || v === settings.value.windowStateMode) return
  await settingsStore.setWindowStateMode(v)
}

async function onColorSchemeChange(v: ColorScheme) {
  if (!v || v === settings.value.colorScheme) return
  await settingsStore.setColorScheme(v)
}
</script>

<template>
  <div class="ww-settings-section">
    <div class="ww-settings-group">
      <SettingsRow label="外观主题" subtitle="浅色 / 深色一键切换，立即生效">
        <SelectButton
          class="ww-settings-segment"
          :model-value="settings.colorScheme"
          :options="COLOR_SCHEME_OPTIONS"
          option-label="label"
          option-value="value"
          :allow-empty="false"
          @update:model-value="onColorSchemeChange"
        />
      </SettingsRow>
      <SettingsRow label="导航图标对齐" subtitle="模块侧栏图标的垂直对齐方式">
        <SelectButton
          class="ww-settings-segment"
          :model-value="settings.navAlign"
          :options="navAlignOptions"
          option-label="label"
          option-value="value"
          :allow-empty="false"
          @update:model-value="onNavAlignChange"
        />
      </SettingsRow>
      <SettingsRow label="导航显示模式" subtitle="仅图标，或图标加文字">
        <SelectButton
          class="ww-settings-segment ww-settings-segment--wide"
          :model-value="settings.navDisplay"
          :options="navDisplayOptions"
          option-label="label"
          option-value="value"
          :allow-empty="false"
          @update:model-value="onNavDisplayChange"
        />
      </SettingsRow>
      <SettingsRow label="默认启动模块" subtitle="下次打开应用时进入的模块">
        <WwSelect
          size="narrow"
          :model-value="settings.startupModule"
          :options="startupModuleOptions"
          placeholder="选择模块"
          @update:model-value="onStartupModuleChange"
        />
      </SettingsRow>
      <SettingsRow
        label="窗口状态"
        subtitle="记忆上次的大小、位置、最大化与所在屏幕；最大化每次启动铺满工作区；不记忆则使用默认尺寸"
      >
        <WwSelect
          :model-value="settings.windowStateMode"
          :options="WINDOW_STATE_MODE_OPTIONS"
          @update:model-value="onWindowStateModeChange"
        />
      </SettingsRow>
    </div>
  </div>
</template>
