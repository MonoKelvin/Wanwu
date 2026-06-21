import type { AppSettings } from '@shared/types/settings'
import { RSS_MODULE_ID } from '@modules/rss/domain/moduleId'

export type RssFetchLimit = 20 | 30 | 50
export type RssAutoRefreshMinutes = 0 | 30 | 60 | 120

export interface RssModuleSettings {
  fetchLimit: RssFetchLimit
  autoRefreshMinutes: RssAutoRefreshMinutes
}

export const DEFAULT_RSS_MODULE_SETTINGS: RssModuleSettings = {
  fetchLimit: 20,
  autoRefreshMinutes: 0
}

export const RSS_FETCH_LIMIT_OPTIONS: RssFetchLimit[] = [20, 30, 50]

export const RSS_AUTO_REFRESH_OPTIONS: Array<{ label: string; value: RssAutoRefreshMinutes }> = [
  { label: '关闭', value: 0 },
  { label: '每 30 分钟', value: 30 },
  { label: '每 1 小时', value: 60 },
  { label: '每 2 小时', value: 120 }
]

function normalizeFetchLimit(v: unknown): RssFetchLimit {
  return v === 30 || v === 50 ? v : 20
}

function normalizeAutoRefreshMinutes(v: unknown): RssAutoRefreshMinutes {
  return v === 30 || v === 60 || v === 120 ? v : 0
}

export function normalizeRssModuleSettings(
  raw: Record<string, unknown> | undefined
): RssModuleSettings {
  return {
    fetchLimit: normalizeFetchLimit(raw?.fetchLimit ?? raw?.rssFetchLimit),
    autoRefreshMinutes: normalizeAutoRefreshMinutes(
      raw?.autoRefreshMinutes ?? raw?.rssAutoRefreshMinutes
    )
  }
}

export function readRssModuleSettings(
  appSettings: Pick<AppSettings, 'moduleSettings'>
): RssModuleSettings {
  const stored = appSettings.moduleSettings?.[RSS_MODULE_ID]
  return normalizeRssModuleSettings(stored)
}
