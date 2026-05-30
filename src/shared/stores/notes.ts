import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { NOTE_COLORS } from '@shared/constants/noteColors'
import { sortNotesList } from '@modules/library/notes/lib/noteListOrder'
import type { NoteColor, NoteItem, NoteUpdateInput } from '@shared/types/notes'

let remoteSyncBound = false
let remoteSyncUnsubs: Array<() => void> = []

function unbindRemoteSync() {
  remoteSyncUnsubs.forEach((fn) => fn())
  remoteSyncUnsubs = []
  remoteSyncBound = false
}

export const useNotesStore = defineStore('notes', () => {
  const notes = ref<NoteItem[]>([])
  const selectedNoteId = ref<string | null>(null)
  const loading = ref(false)
  const saving = ref(false)
  const savingOps = ref(0)

  const selectedNote = computed(() => notes.value.find((n) => n.id === selectedNoteId.value) ?? null)

  function mergeRemoteNote(note: NoteItem) {
    const idx = notes.value.findIndex((n) => n.id === note.id)
    if (idx === -1) {
      notes.value = [note, ...notes.value]
      return
    }
    notes.value[idx] = note
  }

  function applyNoteRemoved(noteId: string) {
    const sortedBefore = sortNotesList(notes.value)
    const deleteIndex = sortedBefore.findIndex((n) => n.id === noteId)
    if (deleteIndex === -1) return

    const wasSelected = selectedNoteId.value === noteId
    notes.value = notes.value.filter((n) => n.id !== noteId)

    if (wasSelected) {
      if (notes.value.length === 0) {
        selectedNoteId.value = null
      } else {
        const remaining = sortNotesList(notes.value)
        const nextIndex = Math.min(deleteIndex, remaining.length - 1)
        selectedNoteId.value = remaining[nextIndex]?.id ?? remaining[0]?.id ?? null
      }
      return
    }

    if (selectedNoteId.value && !notes.value.some((n) => n.id === selectedNoteId.value)) {
      selectedNoteId.value = null
    }
  }

  function removeRemoteNote(noteId: string) {
    applyNoteRemoved(noteId)
  }

  function removeRemoteImage(imageId: string) {
    notes.value = notes.value.map((note) => ({
      ...note,
      images: note.images.filter((img) => img.id !== imageId)
    }))
  }

  function bindRemoteSync() {
    if (remoteSyncBound || typeof window === 'undefined' || !window.wanwu?.notes) return
    remoteSyncBound = true
    remoteSyncUnsubs = [
      window.wanwu.notes.onChanged((note) => mergeRemoteNote(note)),
      window.wanwu.notes.onDeleted((noteId) => removeRemoteNote(noteId)),
      window.wanwu.notes.onImageRemoved((imageId) => removeRemoteImage(imageId))
    ]
  }

  async function loadAll() {
    bindRemoteSync()
    loading.value = true
    try {
      notes.value = await window.wanwu.notes.listNotes()
      if (selectedNoteId.value && !notes.value.some((n) => n.id === selectedNoteId.value)) {
        selectedNoteId.value = null
      }
    } finally {
      loading.value = false
    }
  }

  async function createNote() {
    const created = await window.wanwu.notes.createNote({ color: 'yellow' })
    mergeRemoteNote(created)
    selectedNoteId.value = created.id
    return created
  }

  async function updateNote(
    id: string,
    patch: Partial<Pick<NoteItem, 'title' | 'content' | 'pinned' | 'color'>> &
      Pick<NoteUpdateInput, 'touchUpdatedAt'>
  ) {
    savingOps.value += 1
    saving.value = true
    try {
      const updated = await window.wanwu.notes.updateNote({
        id,
        ...patch
      })
      if (!updated) return null
      const idx = notes.value.findIndex((note) => note.id === id)
      if (idx !== -1) {
        notes.value[idx] = updated
      }
      return updated
    } finally {
      savingOps.value = Math.max(0, savingOps.value - 1)
      saving.value = savingOps.value > 0
    }
  }

  async function deleteNote(id: string) {
    const ok = await window.wanwu.notes.deleteNote(id)
    if (!ok) return false
    applyNoteRemoved(id)
    return true
  }

  async function addImage(noteId: string, filePath: string) {
    const image = await window.wanwu.notes.addImage({ noteId, filePath })
    const note = notes.value.find((n) => n.id === noteId)
    if (note) {
      note.images = [...note.images, image]
    }
    return image
  }

  async function removeImage(imageId: string) {
    const ok = await window.wanwu.notes.removeImage(imageId)
    if (!ok) return false
    notes.value = notes.value.map((note) => ({
      ...note,
      images: note.images.filter((img) => img.id !== imageId)
    }))
    return true
  }

  function setSelected(noteId: string | null) {
    selectedNoteId.value = noteId
  }

  function nextColor(current: NoteColor): NoteColor {
    const idx = NOTE_COLORS.indexOf(current)
    return NOTE_COLORS[(idx + 1) % NOTE_COLORS.length] ?? 'yellow'
  }

  return {
    notes,
    selectedNoteId,
    selectedNote,
    loading,
    saving,
    loadAll,
    createNote,
    updateNote,
    deleteNote,
    addImage,
    removeImage,
    setSelected,
    nextColor,
    mergeRemoteNote,
    removeRemoteNote,
    bindRemoteSync,
    unbindRemoteSync
  }
})

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    unbindRemoteSync()
  })
}
