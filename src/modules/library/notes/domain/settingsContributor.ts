import { registerSettingsContributor } from '@shared/module-bridge/settingsContributorRegistry'
import { NOTES_MODULE_ID } from '@modules/library/notes/domain/moduleId'
import { normalizeNotesModuleSettings } from '@modules/library/notes/domain/settings'

registerSettingsContributor({
  moduleId: NOTES_MODULE_ID,
  order: 30,
  migrateLegacy(raw) {
    if (!('notesPopoutRestore' in raw) && !('notesSpellcheckEnabled' in raw)) return null
    return {
      popoutRestore: raw.notesPopoutRestore,
      spellcheckEnabled: raw.notesSpellcheckEnabled
    }
  },
  normalize(stored) {
    return normalizeNotesModuleSettings(stored) as unknown as Record<string, unknown>
  },
  mergePatch(current, patch) {
    return normalizeNotesModuleSettings({ ...current, ...patch }) as unknown as Record<string, unknown>
  }
})
