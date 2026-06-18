import { ipcMain } from 'electron'
import type { QuickAccessHit } from '@shared/types/quickAccess'
import type { IMainProcessModule } from '@shared/module-bridge/mainProcessRegistry'
import {
  getModuleRuntimeService,
  setModuleRuntimeService
} from '@shared/module-bridge/mainProcessRegistry'
import { registerOptionalModuleHooks } from '../../../../../electron/app/frameworkLifecycleBridge'
import { NOTES_MODULE_ID } from '@modules/library/notes/domain/moduleId'
import type { DatabaseService } from '../../../../../electron/services/core/database'
import { NotesService } from './service/service'
import { SqliteNotesStorage } from './service/storage'
import { NotesSqliteRepository } from './sqliteNotesRepository'
import { ensureNotesSchema } from './schema'
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
  markNotePopoutRendererReady,
  configureNotePopoutPersistence,
  closeAllNotePopoutsForAppExit,
  attachMainWindowNotePopoutCleanup,
  registerNotePopoutAppLifecycle
} from './noteWindowManager'
import { getNotePopoutVisibilityOverride } from './notePopoutPersistence'

const QUICK_ACCESS_KIND = 'note'

function getService(ctx: Parameters<NonNullable<IMainProcessModule['registerIpcHandlers']>>[0]) {
  return getModuleRuntimeService<NotesService>(ctx, NOTES_MODULE_ID)
}

export const notesMainModule: IMainProcessModule = {
  id: NOTES_MODULE_ID,
  order: 11,

  initServices(ctx) {
    const db = ctx.services.db as DatabaseService | null
    if (!db) return
    const repository = new NotesSqliteRepository(db)
    setModuleRuntimeService(
      ctx,
      NOTES_MODULE_ID,
      new NotesService(new SqliteNotesStorage(repository, db.getBasePath()))
    )
  },

  onModulesReady(ctx) {
    const db = ctx.services.db as DatabaseService | null
    if (db) configureNotePopoutPersistence(db.getBasePath())
    registerOptionalModuleHooks({
      closeAllNotePopoutsForAppExit: () => closeAllNotePopoutsForAppExit(),
      onMainWindowCreated: (win) => attachMainWindowNotePopoutCleanup(win),
      registerNotePopoutLifecycle: () => registerNotePopoutAppLifecycle()
    })
  },

  registerDatabaseSchema(db) {
    ensureNotesSchema(db)
  },

  registerIpcHandlers(ctx) {
    ipcMain.handle('notes:list', () => getService(ctx)?.listNotes() ?? [])
    ipcMain.handle('notes:create', (_e, input: unknown) => {
      const service = getService(ctx)
      if (!service) throw new Error('便笺服务未就绪')
      const created = service.createNote(
        input as Parameters<NonNullable<NotesService>['createNote']>[0]
      )
      broadcastNoteChanged(created)
      return created
    })
    ipcMain.handle('notes:update', (_e, input: unknown) => {
      const service = getService(ctx)
      if (!service) throw new Error('便笺服务未就绪')
      const updated = service.updateNote(
        input as Parameters<NonNullable<NotesService>['updateNote']>[0]
      )
      if (updated) broadcastNoteChanged(updated)
      return updated
    })
    ipcMain.handle('notes:delete', (_e, id: string) => {
      const service = getService(ctx)
      if (!service) throw new Error('便笺服务未就绪')
      const ok = service.deleteNote(id)
      if (ok) {
        closeNotePopout(id)
        broadcastNoteDeleted(id)
      }
      return ok
    })
    ipcMain.handle('notes:addImage', (_e, params: { noteId: string; filePath: string }) => {
      const service = getService(ctx)
      if (!service) throw new Error('便笺服务未就绪')
      const image = service.addImage(params.noteId, params.filePath)
      const note = service.listNotes().find((n) => n.id === params.noteId)
      if (note) broadcastNoteChanged(note)
      return image
    })
    ipcMain.handle('notes:removeImage', (_e, imageId: string) => {
      const service = getService(ctx)
      if (!service) throw new Error('便笺服务未就绪')
      const ok = service.removeImage(imageId)
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
    ipcMain.handle('notes:popout:saveScroll', (_e, params: { noteId: string; scrollTop: number }) => {
      saveNotePopoutScroll(params.noteId, params.scrollTop)
    })
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
  },

  getQuickAccessKindLimit() {
    return { kind: QUICK_ACCESS_KIND, limit: 4, order: 20 }
  },

  searchQuickAccess(ctx, query, limit) {
    const service = getService(ctx)
    if (!service) return []
    const hits: QuickAccessHit[] = []
    const lower = query.toLowerCase()
    for (const note of service.listNotes()) {
      if (!note.title.toLowerCase().includes(lower) && !note.content.toLowerCase().includes(lower)) {
        continue
      }
      if (hits.length >= limit) break
      hits.push({
        kind: QUICK_ACCESS_KIND,
        id: note.id,
        title: note.title.trim() || '无标题便笺',
        subtitle: '便笺',
        noteId: note.id
      })
    }
    return hits
  }
}
