import { registerSettingsContributor } from '@shared/module-bridge/settingsContributorRegistry'
import { RSS_MODULE_ID } from '@modules/rss/domain/moduleId'
import { normalizeRssModuleSettings } from '@modules/rss/domain/settings'

registerSettingsContributor({
  moduleId: RSS_MODULE_ID,
  order: 10,
  migrateLegacy(raw) {
    if (!('rssFetchLimit' in raw) && !('rssAutoRefreshMinutes' in raw)) return null
    return {
      fetchLimit: raw.rssFetchLimit,
      autoRefreshMinutes: raw.rssAutoRefreshMinutes
    }
  },
  normalize(stored) {
    return normalizeRssModuleSettings(stored) as unknown as Record<string, unknown>
  },
  mergePatch(current, patch) {
    return normalizeRssModuleSettings({ ...current, ...patch }) as unknown as Record<string, unknown>
  }
})
