import {
  DEFAULT_MODULE_ID,
  isModuleId,
  type ModuleId
} from '../../../src/shared/constants/modules'
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

export function normalizeAppSettings(data: Partial<AppSettings> | unknown): AppSettings {
  const raw = (data && typeof data === 'object' ? data : {}) as Partial<AppSettings>
  return {
    navAlign: raw.navAlign === 'center' ? 'center' : 'start',
    navDisplay: raw.navDisplay === 'both' ? 'both' : 'icon',
    rssFetchLimit: normalizeRssFetchLimit(raw.rssFetchLimit),
    startupModule: normalizeStartupModule(raw.startupModule),
    lastActiveModule: normalizeLastActiveModule(raw.lastActiveModule),
    rssAutoRefreshMinutes: normalizeRssAutoRefreshMinutes(raw.rssAutoRefreshMinutes),
    windowStateMode: normalizeWindowStateMode(raw.windowStateMode),
    colorScheme: normalizeColorScheme(raw.colorScheme),
    notesPopoutRestore: normalizeNotesPopoutRestore(raw.notesPopoutRestore),
    notesSpellcheckEnabled: raw.notesSpellcheckEnabled === true,
    launchAtStartup: raw.launchAtStartup === true,
    trayEnabled: raw.trayEnabled !== false,
    closeBehavior: normalizeCloseBehavior(raw.closeBehavior),
    dailyWidgetEnabled: raw.dailyWidgetEnabled === true,
    clipboardAssistEnabled: raw.clipboardAssistEnabled === true,
    musicApiBaseUrl:
      typeof raw.musicApiBaseUrl === 'string' && raw.musicApiBaseUrl.trim()
        ? raw.musicApiBaseUrl.trim()
        : DEFAULT_APP_SETTINGS.musicApiBaseUrl,
    musicApiMode: raw.musicApiMode === 'local' ? 'local' : 'remote',
    musicApiLocalPort:
      typeof raw.musicApiLocalPort === 'number' && raw.musicApiLocalPort > 0
        ? raw.musicApiLocalPort
        : DEFAULT_APP_SETTINGS.musicApiLocalPort,
    musicDiscoverCountry:
      typeof raw.musicDiscoverCountry === 'string' && raw.musicDiscoverCountry.trim()
        ? raw.musicDiscoverCountry.trim()
        : DEFAULT_APP_SETTINGS.musicDiscoverCountry,
    musicJamendoClientId:
      typeof raw.musicJamendoClientId === 'string' ? raw.musicJamendoClientId : '',
    musicAudiusApiKey: typeof raw.musicAudiusApiKey === 'string' ? raw.musicAudiusApiKey : '',
    musicPrimarySource:
      raw.musicPrimarySource === 'verome' ||
      raw.musicPrimarySource === 'kugou' ||
      raw.musicPrimarySource === 'netease'
        ? raw.musicPrimarySource
        : DEFAULT_APP_SETTINGS.musicPrimarySource,
    musicNeteasePort:
      typeof raw.musicNeteasePort === 'number' && raw.musicNeteasePort > 0
        ? raw.musicNeteasePort
        : DEFAULT_APP_SETTINGS.musicNeteasePort,
    musicNeteaseRealIp:
      typeof raw.musicNeteaseRealIp === 'string' ? raw.musicNeteaseRealIp : '',
    musicNeteaseProxy: typeof raw.musicNeteaseProxy === 'string' ? raw.musicNeteaseProxy : '',
    musicNeteaseQuality:
      raw.musicNeteaseQuality === 'standard' ||
      raw.musicNeteaseQuality === 'higher' ||
      raw.musicNeteaseQuality === 'exhigh' ||
      raw.musicNeteaseQuality === 'lossless' ||
      raw.musicNeteaseQuality === 'hires' ||
      raw.musicNeteaseQuality === 'jyeffect' ||
      raw.musicNeteaseQuality === 'sky' ||
      raw.musicNeteaseQuality === 'dolby' ||
      raw.musicNeteaseQuality === 'jymaster'
        ? raw.musicNeteaseQuality
        : DEFAULT_APP_SETTINGS.musicNeteaseQuality,
    recentFonts: normalizeRecentStringList(raw.recentFonts, MAX_RECENT_FONTS),
    recentColors: normalizeRecentStringList(raw.recentColors, MAX_RECENT_COLORS),
    diagramRecentShapes: normalizeRecentStringList(
      raw.diagramRecentShapes,
      MAX_RECENT_DIAGRAM_SHAPES
    )
  }
}

export function mergeAppSettings(patch: Partial<AppSettings>, current?: AppSettings): AppSettings {
  return normalizeAppSettings({ ...DEFAULT_APP_SETTINGS, ...current, ...patch })
}
