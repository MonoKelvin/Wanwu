import { onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useNotesStore } from '@shared/stores/notes'
import { LIBRARY_NOTES_ROUTE } from '@modules/library/notes/domain/noteRoutes'
import { applyPopoutFocusSelection } from './notePopoutFocusSync'

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

      if (router.currentRoute.value.name !== LIBRARY_NOTES_ROUTE) {
        await router.push({ name: LIBRARY_NOTES_ROUTE })
      }

      await applyPopoutFocusSelection(noteId)
    })
  })

  onUnmounted(() => {
    stopListener?.()
    stopListener = null
  })
}
