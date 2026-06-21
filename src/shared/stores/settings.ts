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
  type WindowStateMode,
  type NotesPopoutRestoreMode,
  type CloseBehavior,
  type LeisureReadJokeLang,
  type LeisureReadArticleMode,
  type LeisureReadRiddleThinkDelay,
  type WeatherRefreshMinutes
} from '@shared/types/settings'
import { isModuleId } from '@app/config/modules'
import { mergeModuleSettingsMaps, cloneModuleSettingsMap } from '@shared/lib/moduleSettings'
import { applyColorScheme, readStoredColorScheme, watchSystemColorScheme } from '@app/theme/applyTheme'
import {
  bumpRecentString,
  clearLegacyDiagramRecentShapes,
  MAX_RECENT_COLORS,
  MAX_RECENT_DIAGRAM_SHAPES,
  MAX_RECENT_FONTS,
  normalizeRecentStringList,
  readLegacyDiagramRecentShapes
} from '@shared/lib/recentPreferences'

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

  const notesPopoutRestore: NotesPopoutRestoreMode =
    data.notesPopoutRestore === 'on-startup' ||
    data.notesPopoutRestore === 'on-enter-notes' ||
    data.notesPopoutRestore === 'never'
      ? data.notesPopoutRestore
      : 'on-enter-notes'

  const notesSpellcheckEnabled = data.notesSpellcheckEnabled === true
  const launchAtStartup = data.launchAtStartup === true
  const trayEnabled = data.trayEnabled !== false
  const closeBehavior: CloseBehavior =
    data.closeBehavior === 'tray' || data.closeBehavior === 'ask' ? data.closeBehavior : 'quit'
  const dailyWidgetEnabled = data.dailyWidgetEnabled === true
  const clipboardAssistEnabled = data.clipboardAssistEnabled === true

  const leisureReadJokeLang: LeisureReadJokeLang = data.leisureReadJokeLang === 'en' ? 'en' : 'zh'
  const leisureReadArticleMode: LeisureReadArticleMode =
    data.leisureReadArticleMode === 'today' ? 'today' : 'random'
  const leisureReadDelay = Number(data.leisureReadRiddleThinkDelay)
  const leisureReadRiddleThinkDelay: LeisureReadRiddleThinkDelay =
    leisureReadDelay === 0 ||
    leisureReadDelay === 5 ||
    leisureReadDelay === 10 ||
    leisureReadDelay === 30
      ? leisureReadDelay
      : 5

  const weatherEnabled = data.weatherEnabled !== false
  const weatherRefreshRaw = Number(data.weatherRefreshMinutes)
  const weatherRefreshMinutes: WeatherRefreshMinutes =
    weatherRefreshRaw === 1 ||
    weatherRefreshRaw === 15 ||
    weatherRefreshRaw === 30 ||
    weatherRefreshRaw === 60
      ? weatherRefreshRaw
      : 1

  return {
    navAlign: data.navAlign === 'center' ? 'center' : 'start',
    navDisplay: data.navDisplay === 'both' ? 'both' : 'icon',
    rssFetchLimit,
    startupModule,
    lastActiveModule,
    rssAutoRefreshMinutes,
    windowStateMode,
    colorScheme,
    notesPopoutRestore,
    notesSpellcheckEnabled,
    launchAtStartup,
    trayEnabled,
    closeBehavior,
    dailyWidgetEnabled,
    clipboardAssistEnabled,
    musicApiBaseUrl:
      typeof data.musicApiBaseUrl === 'string' && data.musicApiBaseUrl.trim()
        ? data.musicApiBaseUrl.trim()
        : DEFAULT_APP_SETTINGS.musicApiBaseUrl,
    musicApiMode: data.musicApiMode === 'local' ? 'local' : 'remote',
    musicApiLocalPort:
      typeof data.musicApiLocalPort === 'number' && data.musicApiLocalPort > 0
        ? data.musicApiLocalPort
        : DEFAULT_APP_SETTINGS.musicApiLocalPort,
    musicDiscoverCountry:
      typeof data.musicDiscoverCountry === 'string' && data.musicDiscoverCountry.trim()
        ? data.musicDiscoverCountry.trim()
        : DEFAULT_APP_SETTINGS.musicDiscoverCountry,
    musicJamendoClientId:
      typeof data.musicJamendoClientId === 'string' ? data.musicJamendoClientId : '',
    musicAudiusApiKey: typeof data.musicAudiusApiKey === 'string' ? data.musicAudiusApiKey : '',
    musicPrimarySource:
      data.musicPrimarySource === 'verome' ||
      data.musicPrimarySource === 'kugou' ||
      data.musicPrimarySource === 'netease'
        ? data.musicPrimarySource
        : DEFAULT_APP_SETTINGS.musicPrimarySource,
    musicNeteasePort:
      typeof data.musicNeteasePort === 'number' && data.musicNeteasePort > 0
        ? data.musicNeteasePort
        : DEFAULT_APP_SETTINGS.musicNeteasePort,
    musicNeteaseRealIp:
      typeof data.musicNeteaseRealIp === 'string' ? data.musicNeteaseRealIp : '',
    musicNeteaseProxy: typeof data.musicNeteaseProxy === 'string' ? data.musicNeteaseProxy : '',
    musicNeteaseQuality:
      data.musicNeteaseQuality === 'standard' ||
      data.musicNeteaseQuality === 'higher' ||
      data.musicNeteaseQuality === 'exhigh' ||
      data.musicNeteaseQuality === 'lossless' ||
      data.musicNeteaseQuality === 'hires'
        ? data.musicNeteaseQuality
        : DEFAULT_APP_SETTINGS.musicNeteaseQuality,
    recentFonts: normalizeRecentStringList(data.recentFonts, MAX_RECENT_FONTS),
    recentColors: normalizeRecentStringList(data.recentColors, MAX_RECENT_COLORS),
    diagramRecentShapes: normalizeRecentStringList(
      data.diagramRecentShapes,
      MAX_RECENT_DIAGRAM_SHAPES
    ),
    leisureReadJokeLang,
    leisureReadArticleMode,
    leisureReadRiddleThinkDelay,
    weatherEnabled,
    weatherRefreshMinutes,
    moduleSettings: cloneModuleSettingsMap(
      data.moduleSettings as Record<string, Record<string, unknown>> | undefined
    )
  }
}

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
      const next = normalizeSettings({
        ...saved,
        ...optimistic,
        moduleSettings: mergeModuleSettingsMaps(saved.moduleSettings, optimistic.moduleSettings)
      })
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
    let merged = normalizeSettings({ ...DEFAULT_APP_SETTINGS, ...data })
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
    let next = merged
    if (!next.diagramRecentShapes.length) {
      const legacy = readLegacyDiagramRecentShapes()
      if (legacy.length) {
        next = { ...next, diagramRecentShapes: legacy }
        clearLegacyDiagramRecentShapes()
        void window.wanwu.app.patchSettings({ diagramRecentShapes: legacy })
      }
    }
    settings.value = next
    loaded.value = true
    applySettingsToDocument(settings.value)
    if (storedScheme && storedScheme !== data.colorScheme) {
      void window.wanwu.app.patchSettings({ colorScheme: storedScheme })
    }
  }

  async function save(patch: Partial<AppSettings>) {
    const snapshot = settings.value
    const optimistic = normalizeSettings({ ...snapshot, ...patch })
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
    const optimistic = normalizeSettings({ ...snapshot, [key]: value })
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
    const optimistic = normalizeSettings({ ...snapshot, lastActiveModule: moduleId })
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

  async function setNotesPopoutRestore(notesPopoutRestore: NotesPopoutRestoreMode) {
    await save({ notesPopoutRestore })
  }

  async function setNotesSpellcheckEnabled(notesSpellcheckEnabled: boolean) {
    await save({ notesSpellcheckEnabled })
  }

  async function setLeisureReadJokeLang(leisureReadJokeLang: LeisureReadJokeLang) {
    await save({ leisureReadJokeLang })
  }

  async function setLeisureReadArticleMode(leisureReadArticleMode: LeisureReadArticleMode) {
    await save({ leisureReadArticleMode })
  }

  async function setLeisureReadRiddleThinkDelay(
    leisureReadRiddleThinkDelay: LeisureReadRiddleThinkDelay
  ) {
    await save({ leisureReadRiddleThinkDelay })
  }

  async function setWeatherEnabled(weatherEnabled: boolean) {
    await patchSetting('weatherEnabled', weatherEnabled)
  }

  async function setWeatherRefreshMinutes(weatherRefreshMinutes: WeatherRefreshMinutes) {
    await save({ weatherRefreshMinutes })
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
    const optimistic = normalizeSettings({ ...snapshot, ...patch })
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

  async function setDailyWidgetEnabled(dailyWidgetEnabled: boolean) {
    await patchSetting('dailyWidgetEnabled', dailyWidgetEnabled)
  }

  async function setClipboardAssistEnabled(clipboardAssistEnabled: boolean) {
    await patchSetting('clipboardAssistEnabled', clipboardAssistEnabled)
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

  async function appendDiagramRecentShape(shapeId: string) {
    const next = bumpRecentString(
      settings.value.diagramRecentShapes,
      shapeId,
      MAX_RECENT_DIAGRAM_SHAPES
    )
    if (next.join('\u0000') === settings.value.diagramRecentShapes.join('\u0000')) return
    await save({ diagramRecentShapes: next })
  }

  async function resetAll() {
    const defaults = await window.wanwu.app.resetSettings()
    settings.value = normalizeSettings(defaults)
    clearLocalPreferences()
    applySettingsToDocument(settings.value)
  }

  /** 主进程或其它窗口修改设置后同步（含主题） */
  function syncFromRemote(remote: Partial<AppSettings>) {
    if (settingsWriteDepth > 0) return
    const snapshot = settings.value
    const merged = normalizeSettings({
      ...snapshot,
      ...remote,
      moduleSettings: mergeModuleSettingsMaps(snapshot.moduleSettings, remote.moduleSettings)
    })
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
    setRssFetchLimit,
    setStartupModule,
    setRssAutoRefreshMinutes,
    setWindowStateMode,
    setColorScheme,
    setNotesPopoutRestore,
    setNotesSpellcheckEnabled,
    setLeisureReadJokeLang,
    setLeisureReadArticleMode,
    setLeisureReadRiddleThinkDelay,
    setWeatherEnabled,
    setWeatherRefreshMinutes,
    patchModuleSettings,
    setModuleSettings,
    setLaunchAtStartup,
    setTrayEnabled,
    setCloseBehavior,
    setDailyWidgetEnabled,
    setClipboardAssistEnabled,
    appendRecentFont,
    appendRecentColor,
    appendDiagramRecentShape,
    resetAll,
    syncFromRemote
  }
})
