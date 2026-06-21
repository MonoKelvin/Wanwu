import { registerSettingsContributor } from '@shared/module-bridge/settingsContributorRegistry'
import { LEISURE_READ_MODULE_ID } from '@modules/library/leisure-read/domain/moduleId'
import { normalizeLeisureReadModuleSettings } from '@modules/library/leisure-read/domain/settings'

registerSettingsContributor({
  moduleId: LEISURE_READ_MODULE_ID,
  order: 50,
  migrateLegacy(raw) {
    if (
      !('leisureReadJokeLang' in raw) &&
      !('leisureReadArticleMode' in raw) &&
      !('leisureReadRiddleThinkDelay' in raw)
    ) {
      return null
    }
    return {
      riddleLang: raw.leisureReadJokeLang,
      articleMode: raw.leisureReadArticleMode,
      riddleThinkDelay: raw.leisureReadRiddleThinkDelay
    }
  },
  normalize(stored) {
    return normalizeLeisureReadModuleSettings(stored) as unknown as Record<string, unknown>
  },
  mergePatch(current, patch) {
    return normalizeLeisureReadModuleSettings({ ...current, ...patch }) as unknown as Record<
      string,
      unknown
    >
  }
})
