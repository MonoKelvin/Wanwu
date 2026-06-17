<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import SelectButton from 'primevue/selectbutton'
import WwToggleSwitch from '@shared/components/WwToggleSwitch.vue'
import { MODULE_NAV_ITEMS } from '@app/config/modules'
import { useSettingsStore } from '@shared/stores/settings'
import SettingsRow from '@modules/settings/SettingsRow.vue'
import WwSelect from '@shared/components/WwSelect'
import { buildStartupModuleOptions } from '@shared/utils/startupModule'
import WwButton from '@shared/components/WwButton.vue'
import { useWanwuToast } from '@shared/composables/useWanwuToast'
import { useWanwuConfirm } from '@shared/composables/useWanwuConfirm'
import { resetAllDismissiblePrompts } from '@shared/utils/dismissiblePrompts'
import {
  COLOR_SCHEME_OPTIONS,
  WINDOW_STATE_MODE_OPTIONS,
  CLOSE_BEHAVIOR_OPTIONS,
  type CloseBehavior,
  type ColorScheme,
  type NavAlign,
  type NavDisplay,
  type StartupModule,
  type WindowStateMode
} from '@shared/types/settings'

const settingsStore = useSettingsStore()
const { settings } = storeToRefs(settingsStore)
const toast = useWanwuToast()
const confirm = useWanwuConfirm()

async function onResetDismissiblePrompts() {
  const ok = await confirm.ask({
    header: '重置确认提示',
    message: '将恢复所有带「下次不再提醒」的确认对话框（如详情编辑保存/放弃）。',
    acceptLabel: '重置',
    rejectLabel: '取消'
  })
  if (!ok) return
  resetAllDismissiblePrompts()
  toast.success('已重置确认提示')
}

const startupModuleOptions = computed(() => buildStartupModuleOptions(MODULE_NAV_ITEMS()))

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

async function onStartupModuleChange(v: unknown) {
  const module = v as StartupModule | null
  if (!module || module === settings.value.startupModule) return
  await settingsStore.setStartupModule(module)
}

async function onWindowStateModeChange(v: unknown) {
  const mode = v as WindowStateMode | null
  if (!mode || mode === settings.value.windowStateMode) return
  await settingsStore.setWindowStateMode(mode)
}

async function onColorSchemeChange(v: ColorScheme) {
  if (!v || v === settings.value.colorScheme) return
  await settingsStore.setColorScheme(v)
}

function closeBehaviorNeedsTray(): boolean {
  const mode = settings.value.closeBehavior
  return mode === 'tray' || mode === 'ask'
}

function closeBehaviorTrayHint(): string {
  const mode = settings.value.closeBehavior
  if (mode === 'tray') return '最小化到系统托盘'
  if (mode === 'ask') return '每次询问'
  return ''
}

async function onTrayEnabledChange(enabled: boolean) {
  if (enabled === settings.value.trayEnabled) return
  if (!enabled && closeBehaviorNeedsTray()) {
    toast.info(
      `请先将「关闭软件时」改为「直接关闭」，再关闭托盘图标。（当前为「${closeBehaviorTrayHint()}」）`
    )
    return
  }
  await settingsStore.setTrayEnabled(enabled)
}

async function onCloseBehaviorChange(v: unknown) {
  const mode = v as CloseBehavior | null
  if (!mode || mode === settings.value.closeBehavior) return
  await settingsStore.setCloseBehavior(mode)
}

async function onClipboardAssistEnabledChange(enabled: boolean) {
  if (enabled === settings.value.clipboardAssistEnabled) return
  await settingsStore.setClipboardAssistEnabled(enabled)
}

async function onLaunchAtStartupChange(enabled: boolean) {
  if (enabled === settings.value.launchAtStartup) return
  await settingsStore.setLaunchAtStartup(enabled)
}
</script>

<template>
  <div class="ww-settings-section">
    <div class="ww-settings-group">
      <SettingsRow label="外观主题">
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
      <SettingsRow label="导航图标对齐">
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
      <SettingsRow label="导航显示模式">
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
      <SettingsRow label="默认启动模块">
        <WwSelect
          size="narrow"
          :model-value="settings.startupModule"
          :options="startupModuleOptions"
          placeholder="选择模块"
          @update:model-value="onStartupModuleChange"
        />
      </SettingsRow>
      <SettingsRow label="窗口状态">
        <WwSelect
          :model-value="settings.windowStateMode"
          :options="WINDOW_STATE_MODE_OPTIONS"
          @update:model-value="onWindowStateModeChange"
        />
      </SettingsRow>
      <SettingsRow label="重置确认提示">
        <WwButton
          label="重置所有提示对话框"
          variant="outlined"
          size="small"
          @click="onResetDismissiblePrompts"
        />
      </SettingsRow>
    </div>

    <div class="ww-settings-group">
      <h3 class="ww-settings-group__label">桌面增强</h3>
      <SettingsRow label="开机自启" subtitle="登录系统后自动启动万物">
        <WwToggleSwitch
          :model-value="settings.launchAtStartup"
          aria-label="开机自启"
          @update:model-value="onLaunchAtStartupChange"
        />
      </SettingsRow>
      <SettingsRow label="关闭软件时" subtitle="点击窗口关闭按钮的行为">
        <WwSelect
          size="narrow"
          :model-value="settings.closeBehavior"
          :options="CLOSE_BEHAVIOR_OPTIONS"
          option-label="label"
          option-value="value"
          placeholder="选择行为"
          @update:model-value="onCloseBehaviorChange"
        />
      </SettingsRow>
      <SettingsRow
        label="系统托盘图标"
        subtitle="在任务栏显示图标；双击可恢复主窗口。选择「最小化到托盘」或「每次询问」时会自动开启"
      >
        <WwToggleSwitch
          :model-value="settings.trayEnabled"
          aria-label="系统托盘图标"
          @update:model-value="onTrayEnabledChange"
        />
      </SettingsRow>
      <SettingsRow
        label="剪贴板联想"
        subtitle="复制文字后提示万物中可能相关的图鉴（默认关闭）"
      >
        <WwToggleSwitch
          :model-value="settings.clipboardAssistEnabled"
          aria-label="剪贴板联想"
          @update:model-value="onClipboardAssistEnabledChange"
        />
      </SettingsRow>
      <SettingsRow label="全局搜索" subtitle="Ctrl+Shift+P 唤起命令面板" />
    </div>
  </div>
</template>
