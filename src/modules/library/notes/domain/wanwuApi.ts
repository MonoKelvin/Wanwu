import type {
  NoteCreateInput,
  NoteImage,
  NoteItem,
  NoteUpdateInput
} from '@modules/library/notes/domain/types'

/** 便笺 IPC 能力块，通过模块 augmentation 合并进 WanwuApi */
export interface WanwuNotesApi {
  notes: {
    listNotes: () => Promise<NoteItem[]>
    createNote: (input?: NoteCreateInput) => Promise<NoteItem>
    updateNote: (input: NoteUpdateInput) => Promise<NoteItem | null>
    deleteNote: (id: string) => Promise<boolean>
    addImage: (params: { noteId: string; filePath: string }) => Promise<NoteImage>
    removeImage: (imageId: string) => Promise<boolean>
    onChanged: (listener: (note: NoteItem) => void) => () => void
    onDeleted: (listener: (noteId: string) => void) => () => void
    onImageRemoved: (listener: (imageId: string) => void) => () => void
    popout: {
      open: (
        noteId: string,
        anchor?: { x: number; y: number }
      ) => Promise<{ open: boolean; visible: boolean }>
      close: (noteId: string, scrollTop?: number) => Promise<{ open: boolean; visible: boolean }>
      toggle: (
        noteId: string,
        scrollTop?: number,
        anchor?: { x: number; y: number }
      ) => Promise<{ open: boolean; visible: boolean }>
      toggleVisibility: (
        noteId: string,
        scrollTop?: number,
        anchor?: { x: number; y: number }
      ) => Promise<{ open: boolean; visible: boolean }>
      hide: (noteId: string, scrollTop?: number) => Promise<{ open: boolean; visible: boolean }>
      show: (noteId: string) => Promise<{ open: boolean; visible: boolean }>
      isOpen: (noteId: string) => Promise<boolean>
      isVisible: (noteId: string) => Promise<boolean>
      listOpen: () => Promise<string[]>
      getBatchState: () => Promise<{
        scopeCount: number
        openCount: number
        visibleCount: number
        showableCount: number
        canShowAll: boolean
        canHideAll: boolean
      }>
      toggleAllVisibility: () => Promise<{
        scopeCount: number
        openCount: number
        visibleCount: number
        showableCount: number
        canShowAll: boolean
        canHideAll: boolean
      }>
      restore: () => Promise<{ restoredCount: number }>
      rendererReady: () => void
      saveScroll: (params: { noteId: string; scrollTop: number }) => Promise<void>
      closeCurrent: (scrollTop?: number) => Promise<void>
      toggleAlwaysOnTop: (noteId: string) => Promise<{ alwaysOnTop: boolean }>
      getAlwaysOnTop: (noteId: string) => Promise<{ alwaysOnTop: boolean }>
      getVisibilityOverride: (
        noteId: string
      ) => Promise<{ visibilityOverride: 'user-hidden' | null }>
      onPopoutState: (
        listener: (payload: { noteId: string; open: boolean; visible: boolean }) => void
      ) => () => void
      onRestoreScroll: (listener: (payload: { scrollTop: number }) => void) => () => void
      onPopoutFocused: (listener: (payload: { noteId: string }) => void) => () => void
    }
  }
}

declare module '@shared/types/api' {
  interface WanwuApi extends WanwuNotesApi {}
}
