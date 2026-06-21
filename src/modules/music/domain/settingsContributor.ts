import { registerSettingsContributor } from '@shared/module-bridge/settingsContributorRegistry'
import { MUSIC_MODULE_ID } from '@modules/music/domain/moduleId'
import {
  migrateLegacyMusicSettings,
  normalizeMusicModuleSettings
} from '@modules/music/domain/settings'

registerSettingsContributor({
  moduleId: MUSIC_MODULE_ID,
  order: 20,
  migrateLegacy: migrateLegacyMusicSettings,
  normalize(stored) {
    return normalizeMusicModuleSettings(stored) as unknown as Record<string, unknown>
  },
  mergePatch(current, patch) {
    return normalizeMusicModuleSettings({ ...current, ...patch }) as unknown as Record<string, unknown>
  }
})
