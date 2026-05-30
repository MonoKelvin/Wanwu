import { watch } from 'vue'
import { useRoute } from 'vue-router'
import { LIBRARY_NOTES_ROUTE } from '@modules/library/notes/domain/noteRoutes'
import { useSettingsStore } from '@shared/stores/settings'
import type { NotesPopoutRestoreMode } from '@shared/types/settings'

let restoredOnStartup = false
let restoredOnEnterNotes = false

export async function tryRestoreNotePopouts(mode: NotesPopoutRestoreMode): Promise<void> {
  if (mode === 'never') return

  if (mode === 'on-startup') {
    if (restoredOnStartup) return
    restoredOnStartup = true
  } else if (mode === 'on-enter-notes') {
    if (restoredOnEnterNotes) return
    restoredOnEnterNotes = true
  } else {
    return
  }

  try {
    await window.wanwu.notes.popout.restore()
  } catch {
    if (mode === 'on-startup') restoredOnStartup = false
    if (mode === 'on-enter-notes') restoredOnEnterNotes = false
  }
}

/** 进入便笺模块时按设置自动还原（路由 immediate + 防重复） */
export function useNotePopoutAutoRestoreOnEnter() {
  const route = useRoute()
  const settingsStore = useSettingsStore()

  watch(
    () => route.name,
    async (name) => {
      if (name !== LIBRARY_NOTES_ROUTE) return
      if (restoredOnEnterNotes) return
      try {
        if (!settingsStore.loaded) await settingsStore.load()
        if (settingsStore.settings.notesPopoutRestore !== 'on-enter-notes') return
        await tryRestoreNotePopouts('on-enter-notes')
      } catch {
        restoredOnEnterNotes = false
      }
    },
    { immediate: true }
  )
}
