/**
 * 命令/API 更新便笺后，通知正在编辑的 UI 同步草稿与 Tiptap。
 */
import { onBeforeUnmount, onMounted } from 'vue'
import { useNotesStore } from '@shared/stores/notes'
import type { NoteItem } from '@shared/types/notes'

export interface NoteEditorSyncEvent {
  noteId: string
  force: boolean
}

type NoteEditorSyncListener = (event: NoteEditorSyncEvent) => void

const listeners = new Set<NoteEditorSyncListener>()

export function notifyNoteEditorSync(noteId: string, options?: { force?: boolean }): void {
  const event: NoteEditorSyncEvent = {
    noteId,
    force: options?.force ?? false
  }
  for (const listener of listeners) {
    listener(event)
  }
}

export function onNoteEditorSync(listener: NoteEditorSyncListener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

interface UseNoteEditorSyncOptions {
  getNoteId: () => string | null | undefined
  applyRemoteNote: (note: NoteItem, options?: { force?: boolean }) => boolean
  hydrateEditor: () => void
}

/** 订阅命令触发的便笺更新，匹配当前编辑项时刷新草稿与 Tiptap */
export function useNoteEditorSync(options: UseNoteEditorSyncOptions) {
  const notesStore = useNotesStore()
  let unsubscribe: (() => void) | null = null

  function handleSync(noteId: string, force: boolean) {
    const currentId = options.getNoteId()
    if (!currentId || currentId !== noteId) return
    const note = notesStore.notes.find((item) => item.id === noteId)
    if (!note) return
    if (!options.applyRemoteNote(note, { force })) return
    options.hydrateEditor()
  }

  onMounted(() => {
    unsubscribe = onNoteEditorSync(({ noteId, force }) => {
      handleSync(noteId, force)
    })
  })

  onBeforeUnmount(() => {
    unsubscribe?.()
    unsubscribe = null
  })
}
