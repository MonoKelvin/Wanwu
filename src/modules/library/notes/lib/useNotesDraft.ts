import { onBeforeUnmount, watch, type Ref } from 'vue'
import type { NoteItem } from '@shared/types/notes'

interface UseNotesDraftOptions {
  selected: Ref<NoteItem | null>
  draftTitle: Ref<string>
  draftContent: Ref<string>
  persist: (noteId: string, title: string, content: string) => Promise<void>
  onPersistError?: () => void
}

const DEFAULT_TITLE = '未命名便笺'
const SAVE_DEBOUNCE_MS = 700

export function useNotesDraft(options: UseNotesDraftOptions) {
  let saveTimer: ReturnType<typeof setTimeout> | null = null

  function normalizedTitle(title: string) {
    return title.trim() || DEFAULT_TITLE
  }

  function isDirty(note: NoteItem | null): boolean {
    if (!note) return false
    return (
      normalizedTitle(options.draftTitle.value) !== normalizedTitle(note.title) ||
      options.draftContent.value !== (note.content ?? '')
    )
  }

  async function persistFor(noteId: string) {
    await options.persist(
      noteId,
      normalizedTitle(options.draftTitle.value),
      options.draftContent.value
    )
  }

  async function flushDraft() {
    const note = options.selected.value
    if (!note || !isDirty(note)) return
    try {
      await persistFor(note.id)
    } catch {
      options.onPersistError?.()
    }
  }

  watch(
    options.selected,
    (note) => {
      options.draftTitle.value = note?.title ?? ''
      options.draftContent.value = note?.content ?? ''
    },
    { immediate: true }
  )

  watch([options.draftTitle, options.draftContent], () => {
    const note = options.selected.value
    if (!note || !isDirty(note)) return
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      void persistFor(note.id).catch(() => options.onPersistError?.())
    }, SAVE_DEBOUNCE_MS)
  })

  onBeforeUnmount(() => {
    if (saveTimer) clearTimeout(saveTimer)
    void flushDraft()
  })

  return {
    flushDraft
  }
}
