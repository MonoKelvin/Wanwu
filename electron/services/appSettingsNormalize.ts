import { DEFAULT_MODULE_ID, isModuleId } from '../../src/app/config/modules'
import {
  DEFAULT_APP_SETTINGS,
  type AppSettings,
  type NavAlign,
  type NavDisplay,
  type RssAutoRefreshMinutes,
  type RssFetchLimit,
  type StartupModule,
  type WindowStateMode
} from '../../src/shared/types/settings'

function normalizeRssFetchLimit(limit: unknown): RssFetchLimit {
  return limit === 30 || limit === 50 ? limit : 20
}

function normalizeRssAutoRefreshMinutes(v: unknown): RssAutoRefreshMinutes {
  return v === 30 || v === 60 || v === 120 ? v : 0
}

function normalizeStartupModule(v: unknown): StartupModule {
  if (v === 'last') return 'last'
  return isModuleId(String(v)) ? (v as StartupModule) : 'last'
}

function normalizeWindowStateMode(v: unknown): WindowStateMode {
  return v === 'maximize' || v === 'default' ? v : 'remember'
}

export function normalizeAppSettings(data: Partial<AppSettings> | unknown): AppSettings {
  const raw = (data && typeof data === 'object' ? data : {}) as Partial<AppSettings>
  const lastActiveModule = isModuleId(String(raw.lastActiveModule))
    ? raw.lastActiveModule
    : DEFAULT_MODULE_ID

  return {
    navAlign: raw.navAlign === 'center' ? 'center' : 'start',
    navDisplay: raw.navDisplay === 'both' ? 'both' : 'icon',
    rssFetchLimit: normalizeRssFetchLimit(raw.rssFetchLimit),
    startupModule: normalizeStartupModule(raw.startupModule),
    lastActiveModule,
    rssAutoRefreshMinutes: normalizeRssAutoRefreshMinutes(raw.rssAutoRefreshMinutes),
    windowStateMode: normalizeWindowStateMode(raw.windowStateMode)
  }
}

export function mergeAppSettings(patch: Partial<AppSettings>, current?: AppSettings): AppSettings {
  return normalizeAppSettings({ ...DEFAULT_APP_SETTINGS, ...current, ...patch })
}
