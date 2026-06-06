import { ipcMain } from 'electron'
import {
  broadcastNoteChanged,
  broadcastNoteDeleted,
  broadcastNoteImageRemoved,
  closeAllNotePopouts,
  closeNotePopout,
  closeNotePopoutFromSender,
  getNotePopoutAlwaysOnTop,
  hideNotePopout,
  isNotePopoutOpen,
  isNotePopoutVisible,
  listOpenNotePopouts,
  openNotePopout,
  saveNotePopoutScroll,
  showNotePopout,
  toggleAllNotePopoutsVisibility,
  restoreNotePopoutsFromSession,
  toggleNotePopoutVisibility,
  toggleNotePopoutAlwaysOnTop,
  getPopoutsBatchState,
  markNotePopoutRendererReady
} from '../../services/notes/noteWindowManager'
import { getNotePopoutVisibilityOverride } from '../../services/notes/notePopoutPersistence'
import type { AppServices } from '../types'

export function registerNotesHandlers(services: AppServices): void {
  ipcMain.handle('notes:list', () => services.notes?.listNotes() ?? [])
  ipcMain.handle('notes:create', (_e, input: unknown) => {
    if (!services.notes) throw new Error('便笺服务未就绪')
    const created = services.notes.createNote(
      input as Parameters<NonNullable<typeof services.notes>['createNote']>[0]
    )
    broadcastNoteChanged(created)
    return created
  })
  ipcMain.handle('notes:update', (_e, input: unknown) => {
    if (!services.notes) throw new Error('便笺服务未就绪')
    const updated = services.notes.updateNote(
      input as Parameters<NonNullable<typeof services.notes>['updateNote']>[0]
    )
    if (updated) broadcastNoteChanged(updated)
    return updated
  })
  ipcMain.handle('notes:delete', (_e, id: string) => {
    if (!services.notes) throw new Error('便笺服务未就绪')
    const ok = services.notes.deleteNote(id)
    if (ok) {
      closeNotePopout(id)
      broadcastNoteDeleted(id)
    }
    return ok
  })
  ipcMain.handle('notes:addImage', (_e, params: { noteId: string; filePath: string }) => {
    if (!services.notes) throw new Error('便笺服务未就绪')
    const image = services.notes.addImage(params.noteId, params.filePath)
    const note = services.notes.listNotes().find((n) => n.id === params.noteId)
    if (note) broadcastNoteChanged(note)
    return image
  })
  ipcMain.handle('notes:removeImage', (_e, imageId: string) => {
    if (!services.notes) throw new Error('便笺服务未就绪')
    const ok = services.notes.removeImage(imageId)
    if (ok) broadcastNoteImageRemoved(imageId)
    return ok
  })
  ipcMain.handle('notes:popout:open', (_e, noteId: string, anchor?: { x: number; y: number }) => {
    openNotePopout(noteId, 'user', anchor)
    return { open: true, visible: true }
  })
  ipcMain.handle(
    'notes:popout:toggle',
    (_e, noteId: string, scrollTop?: number, anchor?: { x: number; y: number }) =>
      toggleNotePopoutVisibility(noteId, scrollTop, anchor)
  )
  ipcMain.handle(
    'notes:popout:toggleVisibility',
    (_e, noteId: string, scrollTop?: number, anchor?: { x: number; y: number }) =>
      toggleNotePopoutVisibility(noteId, scrollTop, anchor)
  )
  ipcMain.handle('notes:popout:hide', (_e, noteId: string, scrollTop?: number) => {
    hideNotePopout(noteId, scrollTop)
    return { open: true, visible: false }
  })
  ipcMain.handle('notes:popout:show', (_e, noteId: string) => {
    showNotePopout(noteId)
    return { open: true, visible: true }
  })
  ipcMain.handle('notes:popout:isOpen', (_e, noteId: string) => isNotePopoutOpen(noteId))
  ipcMain.handle('notes:popout:isVisible', (_e, noteId: string) => isNotePopoutVisible(noteId))
  ipcMain.handle('notes:popout:listOpen', () => listOpenNotePopouts())
  ipcMain.handle('notes:popout:getBatchState', () => getPopoutsBatchState())
  ipcMain.handle('notes:popout:toggleAllVisibility', () => toggleAllNotePopoutsVisibility())
  ipcMain.handle('notes:popout:restore', () => restoreNotePopoutsFromSession())
  ipcMain.on('notes:popout:renderer-ready', (event) => {
    markNotePopoutRendererReady(event.sender)
  })
  ipcMain.handle(
    'notes:popout:saveScroll',
    (_e, params: { noteId: string; scrollTop: number }) => {
      saveNotePopoutScroll(params.noteId, params.scrollTop)
    }
  )
  ipcMain.handle('notes:popout:closeCurrent', (event, scrollTop?: number) => {
    closeNotePopoutFromSender(event.sender.id, scrollTop)
  })
  ipcMain.handle('notes:popout:close', (_e, noteId: string, scrollTop?: number) => {
    closeNotePopout(noteId, scrollTop)
    return { open: false, visible: false }
  })
  ipcMain.handle('notes:popout:toggleAlwaysOnTop', (_e, noteId: string) =>
    toggleNotePopoutAlwaysOnTop(noteId)
  )
  ipcMain.handle('notes:popout:getAlwaysOnTop', (_e, noteId: string) => ({
    alwaysOnTop: getNotePopoutAlwaysOnTop(noteId)
  }))
  ipcMain.handle('notes:popout:getVisibilityOverride', (_e, noteId: string) => ({
    visibilityOverride: getNotePopoutVisibilityOverride(noteId)
  }))
  ipcMain.handle('notes:popout:closeAll', () => {
    closeAllNotePopouts()
  })
}
