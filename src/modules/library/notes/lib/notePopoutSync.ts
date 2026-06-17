/**
 * 独立窗口与主界面之间的选中同步。
 */
import { onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useNotesStore } from '@shared/stores/notes'
import { LIBRARY_NOTES_ROUTE } from '@modules/library/notes/domain/noteRoutes'

type NoteSelectHandler = (noteId: string) => void | Promise<void>

let selectHandler: NoteSelectHandler | null = null

export function registerNotePopoutSelectHandler(handler: NoteSelectHandler): () => void {
  selectHandler = handler
  return () => {
    if (selectHandler === handler) selectHandler = null
  }
}

export async function applyPopoutFocusSelection(noteId: string): Promise<void> {
  if (selectHandler) {
    await selectHandler(noteId)
    return
  }
  useNotesStore().setSelected(noteId)
}

/** 独立窗口获焦时，若主界面在便笺页则同步选中对应便笺 */
export function useNotePopoutFocusSync() {
  const route = useRoute()
  const router = useRouter()
  const notesStore = useNotesStore()

  if (route.meta.notePopout) return

  let stopListener: (() => void) | null = null

  onMounted(() => {
    stopListener = window.wanwu.notes.popout.onPopoutFocused(async ({ noteId }) => {
      try {
        if (!notesStore.notes.length && !notesStore.loading) {
          await notesStore.loadAll()
        }
      } catch {
        return
      }
      if (!notesStore.notes.some((note) => note.id === noteId)) return
      if (router.currentRoute.value.name !== LIBRARY_NOTES_ROUTE) return
      await applyPopoutFocusSelection(noteId)
    })
  })

  onUnmounted(() => {
    stopListener?.()
    stopListener = null
  })
}
