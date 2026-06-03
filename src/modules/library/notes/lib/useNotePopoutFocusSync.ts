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

      // 不在便笺页时不抢路由：用户可能正在浏览链接/图鉴或其它模块
      if (router.currentRoute.value.name !== LIBRARY_NOTES_ROUTE) return

      await applyPopoutFocusSelection(noteId)
    })
  })

  onUnmounted(() => {
    stopListener?.()
    stopListener = null
  })
}
