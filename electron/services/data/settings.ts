import {
  DEFAULT_MODULE_ID,
  isModuleId,
  type ModuleId
} from '../../../src/shared/constants/modules'
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
  type NotesPopoutRestoreMode
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
    notesPopoutRestore: normalizeNotesPopoutRestore(raw.notesPopoutRestore)
  }
}

export function mergeAppSettings(patch: Partial<AppSettings>, current?: AppSettings): AppSettings {
  return normalizeAppSettings({ ...DEFAULT_APP_SETTINGS, ...current, ...patch })
}
