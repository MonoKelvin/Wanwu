import { nextTick, type Ref } from 'vue'
import { useNotesStore } from '@shared/stores/notes'
import { pruneUnreferencedNoteImages } from '@modules/library/notes/app/pruneNoteImages'
import type { NoteItem } from '@shared/types/notes'

interface UseNotesSelectionOptions {
  selectedNoteId: Ref<string | null>
  notes: Ref<readonly NoteItem[]>
  showEditor: Ref<boolean>
  isSearchActive: Ref<boolean>
  pickedInSearch: Ref<boolean>
  markPickedInSearch: () => void
  draftContent: Ref<string>
  syncDraft: () => void
  flushDraft: (options?: { touchUpdatedAt?: boolean }) => Promise<void>
  hydrateEditor?: () => void
  removeImage: (imageId: string) => Promise<boolean>
}

/** 便笺选中切换：草稿同步、未引用图片清理、搜索态协调 */
export function useNotesSelection(options: UseNotesSelectionOptions) {
  const notesStore = useNotesStore()

  async function selectNote(id: string) {
    const sameSelection = options.selectedNoteId.value === id
    if (sameSelection && options.showEditor.value && (!options.isSearchActive.value || options.pickedInSearch.value)) {
      return
    }

    options.syncDraft()
    const leavingId = options.selectedNoteId.value

    if (leavingId && leavingId !== id) {
      const leavingContent = options.draftContent.value
      const leavingNote = notesStore.notes.find((item) => item.id === leavingId)
      await options.flushDraft({ touchUpdatedAt: false })
      if (leavingNote) {
        await pruneUnreferencedNoteImages(leavingNote.images, leavingContent, options.removeImage)
      }
    }

    options.markPickedInSearch()

    if (sameSelection) {
      notesStore.setSelected(null)
      await nextTick()
    }

    notesStore.setSelected(id)
    await nextTick()
    options.hydrateEditor?.()
  }

  return { selectNote }
}
