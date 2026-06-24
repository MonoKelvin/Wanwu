import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { ModuleId } from '@app/config/modules'
import { collectLocalStorageKeys } from '@shared/module-bridge/localStorageKeysRegistry'
import {
  DEFAULT_APP_SETTINGS,
  type AppSettings,
  type ColorScheme,
  type NavAlign,
  type NavDisplay,
  type StartupModule,
  type WindowStateMode,
  type CloseBehavior
} from '@shared/types/settings'
import { isModuleId } from '@app/config/modules'
import { mergeModuleSettingsMaps, cloneModuleSettingsMap } from '@shared/lib/moduleSettings'
import { mergeAppSettings, normalizeAppSettings } from '@shared/settings/normalizeAppSettings'
import { applyColorScheme, readStoredColorScheme, watchSystemColorScheme } from '@app/theme/applyTheme'
import {
  bumpRecentString,
  MAX_RECENT_COLORS,
  MAX_RECENT_FONTS
} from '@shared/lib/recentPreferences'

function applySettingsToDocument(settings: AppSettings) {
  const root = document.documentElement
  root.dataset.navAlign = settings.navAlign
  root.dataset.navDisplay = settings.navDisplay
  applyColorScheme(settings.colorScheme)
}

let stopSystemThemeWatch: (() => void) | null = null

/** 本窗口正在写入设置时，忽略主进程广播回显，避免覆盖乐观更新 */
let settingsWriteDepth = 0

function beginSettingsWrite(): void {
  settingsWriteDepth++
}

function endSettingsWrite(): void {
  settingsWriteDepth = Math.max(0, settingsWriteDepth - 1)
}

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<AppSettings>({ ...DEFAULT_APP_SETTINGS })
  const loaded = ref(false)

  async function persistSettingsPatch(
    patch: Partial<AppSettings>,
    optimistic: AppSettings
  ): Promise<AppSettings> {
    beginSettingsWrite()
    try {
      const saved = await window.wanwu.app.patchSettings(patch)
      const next = mergeAppSettings(
        {
          moduleSettings: mergeModuleSettingsMaps(saved.moduleSettings, optimistic.moduleSettings)
        },
        optimistic
      )
      settings.value = next
      applySettingsToDocument(next)
      return next
    } finally {
      endSettingsWrite()
    }
  }

  if (!stopSystemThemeWatch) {
    stopSystemThemeWatch = watchSystemColorScheme(() => {
      if (settings.value.colorScheme === 'system') applyColorScheme('system')
    })
  }

  async function load() {
    const data = await window.wanwu.app.getSettings()
    let merged = normalizeAppSettings({ ...DEFAULT_APP_SETTINGS, ...data })
    const storedScheme = readStoredColorScheme()
    if (storedScheme && storedScheme !== merged.colorScheme) {
      merged = { ...merged, colorScheme: storedScheme }
    }
    if (
      (merged.closeBehavior === 'tray' || merged.closeBehavior === 'ask') &&
      !merged.trayEnabled
    ) {
      merged = { ...merged, trayEnabled: true }
      void window.wanwu.app.patchSettings({ trayEnabled: true })
    }
    settings.value = merged
    loaded.value = true
    applySettingsToDocument(settings.value)
    if (storedScheme && storedScheme !== data.colorScheme) {
      void window.wanwu.app.patchSettings({ colorScheme: storedScheme })
    }
  }

  async function save(patch: Partial<AppSettings>) {
    const snapshot = settings.value
    const optimistic = mergeAppSettings(patch, snapshot)
    settings.value = optimistic
    applySettingsToDocument(optimistic)
    try {
      await persistSettingsPatch(patch, optimistic)
    } catch (err) {
      settings.value = snapshot
      applySettingsToDocument(snapshot)
      throw err
    }
  }

  async function patchSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    const snapshot = settings.value
    const optimistic = mergeAppSettings({ [key]: value } as Partial<AppSettings>, snapshot)
    settings.value = optimistic
    applySettingsToDocument(optimistic)
    try {
      await persistSettingsPatch({ [key]: value } as Partial<AppSettings>, optimistic)
    } catch (err) {
      settings.value = snapshot
      applySettingsToDocument(snapshot)
      throw err
    }
  }

  async function patchLastActiveModule(moduleId: ModuleId) {
    if (settings.value.lastActiveModule === moduleId) return
    const snapshot = settings.value
    const optimistic = mergeAppSettings({ lastActiveModule: moduleId }, snapshot)
    settings.value = optimistic
    beginSettingsWrite()
    try {
      await window.wanwu.app.patchSettings({ lastActiveModule: moduleId })
    } catch (err) {
      settings.value = snapshot
      throw err
    } finally {
      endSettingsWrite()
    }
  }

  function clearLocalPreferences() {
    for (const key of collectLocalStorageKeys()) {
      localStorage.removeItem(key)
    }
  }

  async function setNavAlign(navAlign: NavAlign) {
    await save({ navAlign })
  }

  async function setNavDisplay(navDisplay: NavDisplay) {
    await save({ navDisplay })
  }

  async function setStartupModule(startupModule: StartupModule) {
    await save({ startupModule })
  }

  async function setWindowStateMode(windowStateMode: WindowStateMode) {
    await save({ windowStateMode })
  }

  async function setColorScheme(colorScheme: ColorScheme) {
    await save({ colorScheme })
  }

  async function patchModuleSettings(moduleId: string, patch: Record<string, unknown>) {
    const current = settings.value.moduleSettings ?? {}
    await save({
      moduleSettings: mergeModuleSettingsMaps(current, { [moduleId]: patch })
    })
  }

  /** 整段替换某模块的 moduleSettings（不做字段级 merge） */
  async function setModuleSettings(moduleId: string, value: Record<string, unknown>) {
    const current = settings.value.moduleSettings ?? {}
    await save({
      moduleSettings: { ...current, [moduleId]: value }
    })
  }

  async function setLaunchAtStartup(launchAtStartup: boolean) {
    await patchSetting('launchAtStartup', launchAtStartup)
  }

  async function setTrayEnabled(trayEnabled: boolean) {
    await patchSetting('trayEnabled', trayEnabled)
  }

  async function setCloseBehavior(closeBehavior: CloseBehavior) {
    if (closeBehavior === settings.value.closeBehavior) return
    const snapshot = settings.value
    const patch: Partial<AppSettings> = { closeBehavior }
    if (closeBehavior === 'tray' || closeBehavior === 'ask') {
      patch.trayEnabled = true
    }
    const optimistic = mergeAppSettings(patch, snapshot)
    settings.value = optimistic
    applySettingsToDocument(optimistic)
    try {
      await persistSettingsPatch(patch, optimistic)
    } catch (err) {
      settings.value = snapshot
      applySettingsToDocument(snapshot)
      throw err
    }
  }

  async function appendRecentFont(family: string) {
    const next = bumpRecentString(settings.value.recentFonts, family, MAX_RECENT_FONTS)
    if (next.join('\u0000') === settings.value.recentFonts.join('\u0000')) return
    await save({ recentFonts: next })
  }

  async function appendRecentColor(color: string) {
    const next = bumpRecentString(settings.value.recentColors, color, MAX_RECENT_COLORS)
    if (next.join('\u0000') === settings.value.recentColors.join('\u0000')) return
    await save({ recentColors: next })
  }

  async function resetAll() {
    const defaults = await window.wanwu.app.resetSettings()
    settings.value = normalizeAppSettings(defaults)
    clearLocalPreferences()
    applySettingsToDocument(settings.value)
  }

  /** 主进程或其它窗口修改设置后同步（含主题） */
  function syncFromRemote(remote: Partial<AppSettings>) {
    if (settingsWriteDepth > 0) return
    const snapshot = settings.value
    const merged = mergeAppSettings(
      {
        ...remote,
        moduleSettings: mergeModuleSettingsMaps(snapshot.moduleSettings, remote.moduleSettings)
      },
      snapshot
    )
    settings.value = merged
    applySettingsToDocument(merged)
  }

  watch(
    settings,
    (v) => {
      if (loaded.value) applySettingsToDocument(v)
    },
    { deep: true }
  )

  return {
    settings,
    loaded,
    load,
    save,
    patchLastActiveModule,
    clearLocalPreferences,
    setNavAlign,
    setNavDisplay,
    setStartupModule,
    setWindowStateMode,
    setColorScheme,
    patchModuleSettings,
    setModuleSettings,
    setLaunchAtStartup,
    setTrayEnabled,
    setCloseBehavior,
    appendRecentFont,
    appendRecentColor,
    resetAll,
    syncFromRemote
  }
})
