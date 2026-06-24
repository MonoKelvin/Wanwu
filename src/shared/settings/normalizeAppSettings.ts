import {
  DEFAULT_MODULE_ID,
  isModuleId,
  type ModuleId
} from '@shared/constants/modules'
import {
  getSettingsContributors,
  findSettingsContributor
} from '@shared/module-bridge/settingsContributorRegistry'
import {
  MAX_RECENT_COLORS,
  MAX_RECENT_FONTS,
  normalizeRecentStringList
} from '@shared/lib/recentPreferences'
import {
  DEFAULT_APP_SETTINGS,
  type AppSettings,
  type CloseBehavior,
  type ColorScheme,
  type NavAlign,
  type NavDisplay,
  type StartupModule,
  type WindowStateMode
} from '@shared/types/settings'

function normalizeNavAlign(v: unknown): NavAlign {
  return v === 'center' ? 'center' : 'start'
}

function normalizeNavDisplay(v: unknown): NavDisplay {
  return v === 'both' ? 'both' : 'icon'
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

function normalizeCloseBehavior(v: unknown): CloseBehavior {
  if (v === 'tray' || v === 'ask') return v
  return 'quit'
}

export function buildModuleSettings(
  raw: Record<string, unknown>
): Record<string, Record<string, unknown>> {
  const base: Record<string, Record<string, unknown>> =
    raw.moduleSettings && typeof raw.moduleSettings === 'object'
      ? {
          ...(raw.moduleSettings as Record<string, Record<string, unknown>>)
        }
      : {}

  for (const contributor of getSettingsContributors()) {
    const migrated = contributor.migrateLegacy(raw)
    if (migrated) {
      // moduleSettings 优先于 legacy 顶层字段，避免迁移后 patch 被旧字段覆盖
      base[contributor.moduleId] = { ...migrated, ...(base[contributor.moduleId] ?? {}) }
    }
  }

  const normalized: Record<string, Record<string, unknown>> = {}
  for (const contributor of getSettingsContributors()) {
    normalized[contributor.moduleId] = contributor.normalize(base[contributor.moduleId])
  }

  for (const [moduleId, stored] of Object.entries(base)) {
    if (normalized[moduleId] || !stored || typeof stored !== 'object') continue
    normalized[moduleId] = { ...stored }
  }

  return normalized
}

export function normalizeAppSettings(data: Partial<AppSettings> | unknown): AppSettings {
  const raw = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>
  const moduleSettings = buildModuleSettings(raw)

  return {
    navAlign: normalizeNavAlign(raw.navAlign),
    navDisplay: normalizeNavDisplay(raw.navDisplay),
    startupModule: normalizeStartupModule(raw.startupModule),
    lastActiveModule: normalizeLastActiveModule(raw.lastActiveModule),
    windowStateMode: normalizeWindowStateMode(raw.windowStateMode),
    colorScheme: normalizeColorScheme(raw.colorScheme),
    launchAtStartup: raw.launchAtStartup === true,
    trayEnabled: raw.trayEnabled !== false,
    closeBehavior: normalizeCloseBehavior(raw.closeBehavior),
    recentFonts: normalizeRecentStringList(raw.recentFonts, MAX_RECENT_FONTS),
    recentColors: normalizeRecentStringList(raw.recentColors, MAX_RECENT_COLORS),
    moduleSettings
  }
}

export function mergeAppSettings(
  patch: Partial<AppSettings>,
  current?: AppSettings
): AppSettings {
  const merged = {
    ...DEFAULT_APP_SETTINGS,
    ...current,
    ...patch
  } as Record<string, unknown>

  let moduleSettings = buildModuleSettings(merged)

  if (patch.moduleSettings) {
    for (const [moduleId, modulePatch] of Object.entries(patch.moduleSettings)) {
      if (!modulePatch || typeof modulePatch !== 'object') continue
      const contributor = findSettingsContributor(moduleId)
      moduleSettings[moduleId] = contributor
        ? contributor.mergePatch(moduleSettings[moduleId] ?? {}, modulePatch)
        : { ...moduleSettings[moduleId], ...modulePatch }
    }
  }

  return normalizeAppSettings({ ...merged, moduleSettings })
}
