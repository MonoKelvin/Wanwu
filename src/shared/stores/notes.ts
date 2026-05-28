import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { NoteColor, NoteItem } from '@shared/types/notes'

const NOTE_COLORS: NoteColor[] = [
  'yellow',
  'green',
  'blue',
  'pink',
  'purple',
  'orange',
  'teal',
  'red',
  'gray'
]

export const useNotesStore = defineStore('notes', () => {
  const notes = ref<NoteItem[]>([])
  const selectedNoteId = ref<string | null>(null)
  const loading = ref(false)
  const saving = ref(false)
  const savingOps = ref(0)

  const selectedNote = computed(() => notes.value.find((n) => n.id === selectedNoteId.value) ?? null)

  async function loadAll() {
    loading.value = true
    try {
      notes.value = await window.wanwu.notes.listNotes()
      if (!selectedNoteId.value || !notes.value.some((n) => n.id === selectedNoteId.value)) {
        selectedNoteId.value = notes.value[0]?.id ?? null
      }
    } finally {
      loading.value = false
    }
  }

  async function createNote() {
    const created = await window.wanwu.notes.createNote({ color: 'yellow' })
    notes.value = [created, ...notes.value]
    selectedNoteId.value = created.id
    return created
  }

  async function updateNote(id: string, patch: Partial<Pick<NoteItem, 'title' | 'content' | 'pinned' | 'color'>>) {
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
    notes.value = notes.value.filter((n) => n.id !== id)
    if (selectedNoteId.value === id) {
      selectedNoteId.value = notes.value[0]?.id ?? null
    }
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
    nextColor
  }
})
