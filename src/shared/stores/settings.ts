import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import type { ModuleId } from '@app/config/modules'
import {
  APP_LOCAL_STORAGE_KEYS,
  DEFAULT_APP_SETTINGS,
  type AppSettings,
  type ColorScheme,
  type NavAlign,
  type NavDisplay,
  type RssAutoRefreshMinutes,
  type RssFetchLimit,
  type StartupModule,
  type WindowStateMode
} from '@shared/types/settings'
import { isModuleId } from '@app/config/modules'
import { applyColorScheme, readStoredColorScheme, watchSystemColorScheme } from '@app/theme/applyTheme'

function normalizeSettings(data: Partial<AppSettings>): AppSettings {
  const limit = data.rssFetchLimit
  const rssFetchLimit: RssFetchLimit = limit === 30 || limit === 50 ? limit : 20
  const rssAutoRefreshMinutes: RssAutoRefreshMinutes =
    data.rssAutoRefreshMinutes === 30 ||
    data.rssAutoRefreshMinutes === 60 ||
    data.rssAutoRefreshMinutes === 120
      ? data.rssAutoRefreshMinutes
      : 0
  const startupModule: StartupModule =
    data.startupModule === 'last' || isModuleId(String(data.startupModule))
      ? (data.startupModule as StartupModule)
      : 'last'
  const lastActiveModule: ModuleId =
    data.lastActiveModule && isModuleId(String(data.lastActiveModule))
      ? data.lastActiveModule
      : DEFAULT_APP_SETTINGS.lastActiveModule

  const windowStateMode: WindowStateMode =
    data.windowStateMode === 'maximize' || data.windowStateMode === 'default'
      ? data.windowStateMode
      : 'remember'

  const colorScheme: ColorScheme =
    data.colorScheme === 'dark' ? 'dark'
    : data.colorScheme === 'light' ? 'light'
    : data.colorScheme === 'system' ? 'system'
    : 'system'

  return {
    navAlign: data.navAlign === 'center' ? 'center' : 'start',
    navDisplay: data.navDisplay === 'both' ? 'both' : 'icon',
    rssFetchLimit,
    startupModule,
    lastActiveModule,
    rssAutoRefreshMinutes,
    windowStateMode,
    colorScheme
  }
}

function applySettingsToDocument(settings: AppSettings) {
  const root = document.documentElement
  root.dataset.navAlign = settings.navAlign
  root.dataset.navDisplay = settings.navDisplay
  applyColorScheme(settings.colorScheme)
}

let stopSystemThemeWatch: (() => void) | null = null

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<AppSettings>({ ...DEFAULT_APP_SETTINGS })
  const loaded = ref(false)

  if (!stopSystemThemeWatch) {
    stopSystemThemeWatch = watchSystemColorScheme(() => {
      if (settings.value.colorScheme === 'system') applyColorScheme('system')
    })
  }

  async function load() {
    const data = await window.wanwu.app.getSettings()
    let merged = normalizeSettings({ ...DEFAULT_APP_SETTINGS, ...data })
    const storedScheme = readStoredColorScheme()
    if (storedScheme && storedScheme !== merged.colorScheme) {
      merged = { ...merged, colorScheme: storedScheme }
    }
    settings.value = merged
    loaded.value = true
    applySettingsToDocument(settings.value)
    if (storedScheme && storedScheme !== data.colorScheme) {
      void window.wanwu.app.patchSettings({ colorScheme: storedScheme })
    }
  }

  async function save(patch: Partial<AppSettings>) {
    const optimistic = normalizeSettings({ ...settings.value, ...patch })
    settings.value = optimistic
    applySettingsToDocument(optimistic)
    const saved = await window.wanwu.app.updateSettings(optimistic)
    settings.value = normalizeSettings({ ...saved, ...optimistic })
    applySettingsToDocument(settings.value)
  }

  async function patchLastActiveModule(moduleId: ModuleId) {
    if (settings.value.lastActiveModule === moduleId) return
    const snapshot = settings.value
    settings.value = normalizeSettings({ ...snapshot, lastActiveModule: moduleId })
    const saved = await window.wanwu.app.patchSettings({ lastActiveModule: moduleId })
    settings.value = normalizeSettings({
      ...saved,
      colorScheme: snapshot.colorScheme
    })
    applySettingsToDocument(settings.value)
  }

  function clearLocalPreferences() {
    for (const key of APP_LOCAL_STORAGE_KEYS) {
      localStorage.removeItem(key)
    }
  }

  async function setNavAlign(navAlign: NavAlign) {
    await save({ navAlign })
  }

  async function setNavDisplay(navDisplay: NavDisplay) {
    await save({ navDisplay })
  }

  async function setRssFetchLimit(rssFetchLimit: RssFetchLimit) {
    await save({ rssFetchLimit })
  }

  async function setStartupModule(startupModule: StartupModule) {
    await save({ startupModule })
  }

  async function setRssAutoRefreshMinutes(rssAutoRefreshMinutes: RssAutoRefreshMinutes) {
    await save({ rssAutoRefreshMinutes })
  }

  async function setWindowStateMode(windowStateMode: WindowStateMode) {
    await save({ windowStateMode })
  }

  async function setColorScheme(colorScheme: ColorScheme) {
    await save({ colorScheme })
  }

  async function resetAll() {
    const defaults = await window.wanwu.app.resetSettings()
    settings.value = normalizeSettings(defaults)
    clearLocalPreferences()
    applySettingsToDocument(settings.value)
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
    setRssFetchLimit,
    setStartupModule,
    setRssAutoRefreshMinutes,
    setWindowStateMode,
    setColorScheme,
    resetAll
  }
})
