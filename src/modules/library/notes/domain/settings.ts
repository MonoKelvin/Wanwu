import type { AppSettings } from '@shared/types/settings'
import { NOTES_MODULE_ID } from '@modules/library/notes/domain/moduleId'

export type NotesPopoutRestoreMode = 'on-startup' | 'on-enter-notes' | 'never'

export interface NotesModuleSettings {
  popoutRestore: NotesPopoutRestoreMode
  spellcheckEnabled: boolean
}

export const DEFAULT_NOTES_MODULE_SETTINGS: NotesModuleSettings = {
  popoutRestore: 'on-enter-notes',
  spellcheckEnabled: false
}

export const NOTES_POPOUT_RESTORE_OPTIONS: Array<{
  label: string
  value: NotesPopoutRestoreMode
}> = [
  { label: '启动软件', value: 'on-startup' },
  { label: '进入便笺', value: 'on-enter-notes' },
  { label: '不自动还原', value: 'never' }
]

function normalizePopoutRestore(v: unknown): NotesPopoutRestoreMode {
  if (v === 'on-startup' || v === 'on-enter-notes' || v === 'never') return v
  return 'on-enter-notes'
}

export function normalizeNotesModuleSettings(
  raw: Record<string, unknown> | undefined
): NotesModuleSettings {
  const spellcheck =
    typeof raw?.spellcheckEnabled === 'boolean'
      ? raw.spellcheckEnabled
      : raw?.notesSpellcheckEnabled === true
  return {
    popoutRestore: normalizePopoutRestore(raw?.popoutRestore ?? raw?.notesPopoutRestore),
    spellcheckEnabled: spellcheck
  }
}

export function readNotesModuleSettings(
  appSettings: Pick<AppSettings, 'moduleSettings'>
): NotesModuleSettings {
  const stored = appSettings.moduleSettings?.[NOTES_MODULE_ID]
  return normalizeNotesModuleSettings(stored)
}
