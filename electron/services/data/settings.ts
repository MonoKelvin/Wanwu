import {
  DEFAULT_MODULE_ID,
  isModuleId,
  type ModuleId
} from '../../../src/shared/constants/modules'
import {
  DIAGRAMS_MODULE_ID,
  LEISURE_READ_MODULE_ID,
  MUSIC_MODULE_ID,
  NOTES_MODULE_ID,
  RSS_MODULE_ID
} from '../../../src/shared/module-bridge/moduleIds'
import {
  MAX_RECENT_COLORS,
  MAX_RECENT_DIAGRAM_SHAPES,
  MAX_RECENT_FONTS,
  normalizeRecentStringList
} from '../../../src/shared/lib/recentPreferences'
import {
  DEFAULT_APP_SETTINGS,
  type AppSettings,
  type NavAlign,
  type NavDisplay,
  type RssAutoRefreshMinutes,
  type RssFetchLimit,
  type StartupModule,
  type ColorScheme,
  type WindowStateMode,
  type NotesPopoutRestoreMode,
  type CloseBehavior
} from '../../../src/shared/types/settings'

function normalizeRssFetchLimit(limit: unknown): RssFetchLimit {
  return limit === 30 || limit === 50 ? limit : 20
}

function normalizeRssAutoRefreshMinutes(v: unknown): RssAutoRefreshMinutes {
  return v === 30 || v === 60 || v === 120 ? v : 0
}

function normalizeStartupModule(v: unknown): StartupModule {
  if (v === 'last') return 'last'
  if (typeof v === 'string' && isModuleId(v)) return v
  return 'last'
}

function normalizeLastActiveModule(v: unknown): ModuleId {
  return typeof v === 'string' && isModuleId(v) ? v : DEFAULT_MODULE_ID
}

function normalizeWindowStateMode(v: unknown): WindowStateMode {
  return v === 'maximize' || v === 'default' ? v : 'remember'
}

function normalizeColorScheme(v: unknown): ColorScheme {
  if (v === 'dark' || v === 'light' || v === 'system') return v
  return 'system'
}

function normalizeNotesPopoutRestore(v: unknown): NotesPopoutRestoreMode {
  if (v === 'on-startup' || v === 'on-enter-notes' || v === 'never') return v
  return 'on-enter-notes'
}

function normalizeCloseBehavior(v: unknown): CloseBehavior {
  if (v === 'tray' || v === 'ask') return v
  return 'quit'
}

function normalizeModuleSettings(
  raw: Partial<AppSettings> & Record<string, unknown>
): Record<string, Record<string, unknown>> {
  const base =
    raw.moduleSettings && typeof raw.moduleSettings === 'object'
      ? { ...(raw.moduleSettings as Record<string, Record<string, unknown>>) }
      : {}

  if (!base[LEISURE_READ_MODULE_ID] && ('leisureReadJokeLang' in raw || 'leisureReadArticleMode' in raw)) {
    base[LEISURE_READ_MODULE_ID] = {
      jokeLang: raw.leisureReadJokeLang === 'en' ? 'en' : 'zh',
      articleMode: raw.leisureReadArticleMode === 'today' ? 'today' : 'random'
    }
  }

  if (!base[RSS_MODULE_ID] && ('rssFetchLimit' in raw || 'rssAutoRefreshMinutes' in raw)) {
    base[RSS_MODULE_ID] = {
      fetchLimit: raw.rssFetchLimit,
      autoRefreshMinutes: raw.rssAutoRefreshMinutes
    }
  }

  if (!base[NOTES_MODULE_ID] && ('notesPopoutRestore' in raw || 'notesSpellcheckEnabled' in raw)) {
    base[NOTES_MODULE_ID] = {
      popoutRestore: raw.notesPopoutRestore,
      spellcheckEnabled: raw.notesSpellcheckEnabled
    }
  }

  if (
    !base[MUSIC_MODULE_ID] &&
    ('musicApiBaseUrl' in raw ||
      'musicApiMode' in raw ||
      'musicPrimarySource' in raw ||
      'musicNeteaseQuality' in raw)
  ) {
    base[MUSIC_MODULE_ID] = {
      apiBaseUrl: raw.musicApiBaseUrl,
      apiMode: raw.musicApiMode,
      apiLocalPort: raw.musicApiLocalPort,
      discoverCountry: raw.musicDiscoverCountry,
      jamendoClientId: raw.musicJamendoClientId,
      audiusApiKey: raw.musicAudiusApiKey,
      primarySource: raw.musicPrimarySource,
      neteasePort: raw.musicNeteasePort,
      neteaseRealIp: raw.musicNeteaseRealIp,
      neteaseProxy: raw.musicNeteaseProxy,
      neteaseQuality: raw.musicNeteaseQuality
    }
  }

  if (!base[DIAGRAMS_MODULE_ID] && 'diagramRecentShapes' in raw) {
    base[DIAGRAMS_MODULE_ID] = { recentShapes: raw.diagramRecentShapes }
  }

  return base
}

function readRssFetchLimit(
  raw: Partial<AppSettings> & Record<string, unknown>,
  moduleSettings: Record<string, Record<string, unknown>>
): RssFetchLimit {
  const rss = moduleSettings[RSS_MODULE_ID]
  const fromModule = rss?.fetchLimit ?? rss?.rssFetchLimit
  return normalizeRssFetchLimit(fromModule ?? raw.rssFetchLimit)
}

function readRssAutoRefreshMinutes(
  raw: Partial<AppSettings> & Record<string, unknown>,
  moduleSettings: Record<string, Record<string, unknown>>
): RssAutoRefreshMinutes {
  const rss = moduleSettings[RSS_MODULE_ID]
  const fromModule = rss?.autoRefreshMinutes ?? rss?.rssAutoRefreshMinutes
  return normalizeRssAutoRefreshMinutes(fromModule ?? raw.rssAutoRefreshMinutes)
}

function readNotesPopoutRestore(
  raw: Partial<AppSettings> & Record<string, unknown>,
  moduleSettings: Record<string, Record<string, unknown>>
): NotesPopoutRestoreMode {
  const notes = moduleSettings[NOTES_MODULE_ID]
  const fromModule = notes?.popoutRestore ?? notes?.notesPopoutRestore
  return normalizeNotesPopoutRestore(fromModule ?? raw.notesPopoutRestore)
}

function readNotesSpellcheckEnabled(
  raw: Partial<AppSettings> & Record<string, unknown>,
  moduleSettings: Record<string, Record<string, unknown>>
): boolean {
  const notes = moduleSettings[NOTES_MODULE_ID]
  if (typeof notes?.spellcheckEnabled === 'boolean') return notes.spellcheckEnabled
  if (typeof notes?.notesSpellcheckEnabled === 'boolean') return notes.notesSpellcheckEnabled
  return raw.notesSpellcheckEnabled === true
}

function readMusicField<T>(
  moduleSettings: Record<string, Record<string, unknown>>,
  keys: { moduleKey: string; legacyKey: keyof AppSettings },
  raw: Partial<AppSettings>,
  fallback: T
): T {
  const music = moduleSettings[MUSIC_MODULE_ID]
  const fromModule = music?.[keys.moduleKey]
  if (fromModule !== undefined && fromModule !== null) return fromModule as T
  const legacy = raw[keys.legacyKey]
  return (legacy !== undefined ? legacy : fallback) as T
}

function readDiagramRecentShapes(
  raw: Partial<AppSettings> & Record<string, unknown>,
  moduleSettings: Record<string, Record<string, unknown>>
): string[] {
  const diagrams = moduleSettings[DIAGRAMS_MODULE_ID]
  const fromModule = diagrams?.recentShapes ?? diagrams?.diagramRecentShapes
  return normalizeRecentStringList(fromModule ?? raw.diagramRecentShapes, MAX_RECENT_DIAGRAM_SHAPES)
}

export function normalizeAppSettings(data: Partial<AppSettings> | unknown): AppSettings {
  const raw = (data && typeof data === 'object' ? data : {}) as Partial<AppSettings> & Record<string, unknown>
  const moduleSettings = normalizeModuleSettings(raw)
  return {
    navAlign: raw.navAlign === 'center' ? 'center' : 'start',
    navDisplay: raw.navDisplay === 'both' ? 'both' : 'icon',
    rssFetchLimit: readRssFetchLimit(raw, moduleSettings),
    startupModule: normalizeStartupModule(raw.startupModule),
    lastActiveModule: normalizeLastActiveModule(raw.lastActiveModule),
    rssAutoRefreshMinutes: readRssAutoRefreshMinutes(raw, moduleSettings),
    windowStateMode: normalizeWindowStateMode(raw.windowStateMode),
    colorScheme: normalizeColorScheme(raw.colorScheme),
    notesPopoutRestore: readNotesPopoutRestore(raw, moduleSettings),
    notesSpellcheckEnabled: readNotesSpellcheckEnabled(raw, moduleSettings),
    launchAtStartup: raw.launchAtStartup === true,
    trayEnabled: raw.trayEnabled !== false,
    closeBehavior: normalizeCloseBehavior(raw.closeBehavior),
    dailyWidgetEnabled: raw.dailyWidgetEnabled === true,
    clipboardAssistEnabled: raw.clipboardAssistEnabled === true,
    musicApiBaseUrl: readMusicField(
      moduleSettings,
      { moduleKey: 'apiBaseUrl', legacyKey: 'musicApiBaseUrl' },
      raw,
      DEFAULT_APP_SETTINGS.musicApiBaseUrl
    ),
    musicApiMode: readMusicField(
      moduleSettings,
      { moduleKey: 'apiMode', legacyKey: 'musicApiMode' },
      raw,
      DEFAULT_APP_SETTINGS.musicApiMode
    ),
    musicApiLocalPort: readMusicField(
      moduleSettings,
      { moduleKey: 'apiLocalPort', legacyKey: 'musicApiLocalPort' },
      raw,
      DEFAULT_APP_SETTINGS.musicApiLocalPort
    ),
    musicDiscoverCountry: readMusicField(
      moduleSettings,
      { moduleKey: 'discoverCountry', legacyKey: 'musicDiscoverCountry' },
      raw,
      DEFAULT_APP_SETTINGS.musicDiscoverCountry
    ),
    musicJamendoClientId: readMusicField(
      moduleSettings,
      { moduleKey: 'jamendoClientId', legacyKey: 'musicJamendoClientId' },
      raw,
      ''
    ),
    musicAudiusApiKey: readMusicField(
      moduleSettings,
      { moduleKey: 'audiusApiKey', legacyKey: 'musicAudiusApiKey' },
      raw,
      ''
    ),
    musicPrimarySource: readMusicField(
      moduleSettings,
      { moduleKey: 'primarySource', legacyKey: 'musicPrimarySource' },
      raw,
      DEFAULT_APP_SETTINGS.musicPrimarySource
    ),
    musicNeteasePort: readMusicField(
      moduleSettings,
      { moduleKey: 'neteasePort', legacyKey: 'musicNeteasePort' },
      raw,
      DEFAULT_APP_SETTINGS.musicNeteasePort
    ),
    musicNeteaseRealIp: readMusicField(
      moduleSettings,
      { moduleKey: 'neteaseRealIp', legacyKey: 'musicNeteaseRealIp' },
      raw,
      ''
    ),
    musicNeteaseProxy: readMusicField(
      moduleSettings,
      { moduleKey: 'neteaseProxy', legacyKey: 'musicNeteaseProxy' },
      raw,
      ''
    ),
    musicNeteaseQuality: readMusicField(
      moduleSettings,
      { moduleKey: 'neteaseQuality', legacyKey: 'musicNeteaseQuality' },
      raw,
      DEFAULT_APP_SETTINGS.musicNeteaseQuality
    ),
    recentFonts: normalizeRecentStringList(raw.recentFonts, MAX_RECENT_FONTS),
    recentColors: normalizeRecentStringList(raw.recentColors, MAX_RECENT_COLORS),
    diagramRecentShapes: readDiagramRecentShapes(raw, moduleSettings),
    moduleSettings
  }
}

export function mergeAppSettings(patch: Partial<AppSettings>, current?: AppSettings): AppSettings {
  return normalizeAppSettings({ ...DEFAULT_APP_SETTINGS, ...current, ...patch })
}
