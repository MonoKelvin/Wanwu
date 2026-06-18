import type { IpcRenderer } from 'electron'
import type { IPreloadModule } from '@shared/module-bridge/preloadRegistry'
import { NOTES_MODULE_ID } from '@shared/module-bridge/moduleIds'

export const notesPreloadModule: IPreloadModule = {
  id: NOTES_MODULE_ID,
  order: 11,

  getPreloadApi(ipcRenderer: IpcRenderer) {
    return {
      notes: {
        listNotes: () => ipcRenderer.invoke('notes:list'),
        createNote: (input) => ipcRenderer.invoke('notes:create', input),
        updateNote: (input) => ipcRenderer.invoke('notes:update', input),
        deleteNote: (id) => ipcRenderer.invoke('notes:delete', id),
        addImage: (params) => ipcRenderer.invoke('notes:addImage', params),
        removeImage: (imageId) => ipcRenderer.invoke('notes:removeImage', imageId),
        onChanged: (listener) => {
          const handler = (_: unknown, note: import('@modules/library/notes/domain/types').NoteItem) =>
            listener(note)
          ipcRenderer.on('notes:changed', handler)
          return () => ipcRenderer.removeListener('notes:changed', handler)
        },
        onDeleted: (listener) => {
          const handler = (_: unknown, noteId: string) => listener(noteId)
          ipcRenderer.on('notes:deleted', handler)
          return () => ipcRenderer.removeListener('notes:deleted', handler)
        },
        onImageRemoved: (listener) => {
          const handler = (_: unknown, imageId: string) => listener(imageId)
          ipcRenderer.on('notes:image-removed', handler)
          return () => ipcRenderer.removeListener('notes:image-removed', handler)
        },
        popout: {
          open: (noteId, anchor) => ipcRenderer.invoke('notes:popout:open', noteId, anchor),
          close: (noteId, scrollTop) => ipcRenderer.invoke('notes:popout:close', noteId, scrollTop),
          toggle: (noteId, scrollTop, anchor) =>
            ipcRenderer.invoke('notes:popout:toggleVisibility', noteId, scrollTop, anchor),
          toggleVisibility: (noteId, scrollTop, anchor) =>
            ipcRenderer.invoke('notes:popout:toggleVisibility', noteId, scrollTop, anchor),
          hide: (noteId, scrollTop) => ipcRenderer.invoke('notes:popout:hide', noteId, scrollTop),
          show: (noteId) => ipcRenderer.invoke('notes:popout:show', noteId),
          isOpen: (noteId) => ipcRenderer.invoke('notes:popout:isOpen', noteId),
          isVisible: (noteId) => ipcRenderer.invoke('notes:popout:isVisible', noteId),
          listOpen: () => ipcRenderer.invoke('notes:popout:listOpen'),
          getBatchState: () => ipcRenderer.invoke('notes:popout:getBatchState'),
          toggleAllVisibility: () => ipcRenderer.invoke('notes:popout:toggleAllVisibility'),
          restore: () => ipcRenderer.invoke('notes:popout:restore'),
          rendererReady: () => ipcRenderer.send('notes:popout:renderer-ready'),
          saveScroll: (params) => ipcRenderer.invoke('notes:popout:saveScroll', params),
          closeCurrent: (scrollTop) => ipcRenderer.invoke('notes:popout:closeCurrent', scrollTop),
          toggleAlwaysOnTop: (noteId) => ipcRenderer.invoke('notes:popout:toggleAlwaysOnTop', noteId),
          getAlwaysOnTop: (noteId) => ipcRenderer.invoke('notes:popout:getAlwaysOnTop', noteId),
          getVisibilityOverride: (noteId) =>
            ipcRenderer.invoke('notes:popout:getVisibilityOverride', noteId),
          onPopoutState: (listener) => {
            const handler = (
              _: unknown,
              payload: { noteId: string; open: boolean; visible: boolean }
            ) => listener(payload)
            ipcRenderer.on('notes:popout-state', handler)
            return () => ipcRenderer.removeListener('notes:popout-state', handler)
          },
          onRestoreScroll: (listener) => {
            const handler = (_: unknown, payload: { scrollTop: number }) => listener(payload)
            ipcRenderer.on('notes:popout-restore-scroll', handler)
            return () => ipcRenderer.removeListener('notes:popout-restore-scroll', handler)
          },
          onPopoutFocused: (listener) => {
            const handler = (_: unknown, payload: { noteId: string }) => listener(payload)
            ipcRenderer.on('notes:popout-focused', handler)
            return () => ipcRenderer.removeListener('notes:popout-focused', handler)
          }
        }
      }
    }
  }
}
