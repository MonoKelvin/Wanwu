import { BrowserWindow, ipcMain } from 'electron'
import type { QuickAccessHit } from '@shared/types/quickAccess'
import type { IMainProcessModule } from '@shared/module-bridge/mainProcessRegistry'
import {
  getModuleRuntimeService,
  setModuleRuntimeService
} from '@shared/module-bridge/mainProcessRegistry'
import { PERSONAL_MODULE_ID, ILLUSTRATED_HANDBOOK_MODULE_ID } from '@shared/module-bridge/moduleIds'
import type { DatabaseService } from '../../../../electron/services/core/database'
import type { HandbookFavoriteItemSource } from '@modules/personal/domain/handbookFavoriteSource'
import type { MediaService } from '../../../../electron/services/media/service'
import { PersonalService } from '@modules/personal/main/service/service'
import {
  PersonalUserSqliteRepository,
  registerPersonalUserSchema
} from '@modules/personal/main/service/userSqliteRepository'

const QUICK_ACCESS_KIND = 'favorite'

type ProfileUpdatePayload = {
  nickname: string
  bio: string
  avatarPath?: string | null
  backgroundPath?: string | null
  backgroundConfig?: Record<string, unknown> | null
}

function getService(ctx: Parameters<NonNullable<IMainProcessModule['registerIpcHandlers']>>[0]) {
  return getModuleRuntimeService<PersonalService>(ctx, PERSONAL_MODULE_ID)
}

function applyProfileUpdate(ctx: Parameters<NonNullable<IMainProcessModule['registerIpcHandlers']>>[0], profile: ProfileUpdatePayload): void {
  getService(ctx)?.updateProfile(profile)
}

function broadcastFavoritesChanged(): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send('user:favorites-changed')
    }
  }
}

export const personalMainModule: IMainProcessModule = {
  id: PERSONAL_MODULE_ID,
  order: 2,

  registerDatabaseSchema(db) {
    registerPersonalUserSchema(db)
  },

  onModulesReady(ctx) {
    const db = ctx.services.db as DatabaseService | null
    const media = ctx.services.media as MediaService | null
    if (!db) return
    const library = getModuleRuntimeService<HandbookFavoriteItemSource>(
      ctx,
      ILLUSTRATED_HANDBOOK_MODULE_ID
    )
    const userRepo = new PersonalUserSqliteRepository(db)
    setModuleRuntimeService(
      ctx,
      PERSONAL_MODULE_ID,
      new PersonalService(userRepo, library, media)
    )
  },

  registerIpcHandlers(ctx) {
    ipcMain.handle('user:getProfile', () => getService(ctx)?.getProfile() ?? null)
    ipcMain.handle('user:updateProfile', (_e, profile: unknown) => {
      applyProfileUpdate(ctx, profile as ProfileUpdatePayload)
    })
    ipcMain.on('user:saveProfileSync', (_e, profile: unknown) => {
      applyProfileUpdate(ctx, profile as ProfileUpdatePayload)
    })
    ipcMain.handle('user:importProfileImage', (_e, params: { kind: 'avatar' | 'background'; filePath: string }) => {
      const service = getService(ctx)
      if (!service) throw new Error('服务未就绪')
      return service.importProfileImage(params)
    })
    ipcMain.handle('user:clearBackground', () => {
      getService(ctx)?.clearBackground()
    })
    ipcMain.handle('user:listFavorites', () => getService(ctx)?.listFavoriteEntries() ?? [])
    ipcMain.handle('user:listFavoriteGroups', () => getService(ctx)?.listFavoriteGroups() ?? [])
    ipcMain.handle('user:listFavoriteGroupsForPicker', () => getService(ctx)?.listFavoriteGroupsForPicker() ?? [])
    ipcMain.handle('user:createFavoriteGroup', (_e, name: string) => {
      const service = getService(ctx)
      if (!service) throw new Error('服务未就绪')
      return service.createFavoriteGroup(name)
    })
    ipcMain.handle('user:isFavorite', (_e, params: { itemId: string; source: string }) => {
      return getService(ctx)?.isFavorite(params.itemId, params.source) ?? false
    })
    ipcMain.handle('user:addFavorite', (_e, params: { itemId: string; source: string; groupId: string }) => {
      const service = getService(ctx)
      if (!service) return false
      const ok = service.addFavorite(params.itemId, params.source, params.groupId)
      if (ok) broadcastFavoritesChanged()
      return ok
    })
    ipcMain.handle('user:removeFavorite', (_e, params: { itemId: string; source: string }) => {
      const ok = getService(ctx)?.removeFavorite(params.itemId, params.source) ?? false
      if (ok) broadcastFavoritesChanged()
      return ok
    })
    ipcMain.handle('user:toggleFavorite', (_e, params: { itemId: string; source: string }) => {
      const toggledOn = getService(ctx)?.toggleFavorite(params.itemId, params.source) ?? false
      broadcastFavoritesChanged()
      return toggledOn
    })
    ipcMain.handle('user:isLiked', (_e, params: { itemId: string; source: string }) => {
      return getService(ctx)?.isLiked(params.itemId, params.source) ?? false
    })
    ipcMain.handle('user:addLike', (_e, params: { itemId: string; source: string }) => {
      getService(ctx)?.addLike(params.itemId, params.source)
      return true
    })
    ipcMain.handle('user:removeLike', (_e, params: { itemId: string; source: string }) => {
      return getService(ctx)?.removeLike(params.itemId, params.source) ?? false
    })
  },

  getQuickAccessKindLimit() {
    return { kind: QUICK_ACCESS_KIND, limit: 4, order: 60 }
  },

  searchQuickAccess(ctx, query, limit) {
    const service = getService(ctx)
    if (!service) return []
    const hits: QuickAccessHit[] = []
    const lower = query.toLowerCase()
    for (const entry of service.listFavoriteEntries()) {
      const name = entry.item?.name ?? ''
      if (!name.toLowerCase().includes(lower)) continue
      if (hits.length >= limit) break
      hits.push({
        kind: QUICK_ACCESS_KIND,
        id: entry.id,
        title: name,
        subtitle: '收藏',
        itemSource: entry.source,
        itemId: entry.itemId
      })
    }
    return hits
  }
}
