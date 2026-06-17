import { BrowserWindow, ipcMain } from 'electron'
import type { AppServices } from '../types'

type ProfileUpdatePayload = {
  nickname: string
  bio: string
  avatarPath?: string | null
  backgroundPath?: string | null
  backgroundConfig?: Record<string, unknown> | null
}

function applyProfileUpdate(services: AppServices, profile: ProfileUpdatePayload): void {
  services.personal?.updateProfile(profile)
}

function broadcastFavoritesChanged(): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send('user:favorites-changed')
    }
  }
}

export function registerUserHandlers(services: AppServices): void {
  ipcMain.handle('user:getProfile', () => {
    return services.personal?.getProfile() ?? null
  })
  ipcMain.handle('user:updateProfile', (_e, profile: unknown) => {
    applyProfileUpdate(services, profile as ProfileUpdatePayload)
  })
  ipcMain.on('user:saveProfileSync', (_e, profile: unknown) => {
    applyProfileUpdate(services, profile as ProfileUpdatePayload)
  })
  ipcMain.handle(
    'user:importProfileImage',
    (_e, params: { kind: 'avatar' | 'background'; filePath: string }) => {
      if (!services.personal) throw new Error('服务未就绪')
      return services.personal.importProfileImage(params)
    }
  )
  ipcMain.handle('user:clearBackground', () => {
    services.personal?.clearBackground()
  })
  ipcMain.handle('user:listFavorites', () => {
    return services.personal?.listFavoriteEntries() ?? []
  })
  ipcMain.handle('user:listFavoriteGroups', () => {
    return services.personal?.listFavoriteGroups() ?? []
  })
  ipcMain.handle('user:listFavoriteGroupsForPicker', () => {
    return services.personal?.listFavoriteGroupsForPicker() ?? []
  })
  ipcMain.handle('user:createFavoriteGroup', (_e, name: string) => {
    if (!services.personal) throw new Error('服务未就绪')
    return services.personal.createFavoriteGroup(name)
  })
  ipcMain.handle('user:isFavorite', (_e, params: { itemId: string; source: string }) => {
    return services.personal?.isFavorite(params.itemId, params.source) ?? false
  })
  ipcMain.handle(
    'user:addFavorite',
    (_e, params: { itemId: string; source: string; groupId: string }) => {
      if (!services.personal) return false
      const ok = services.personal.addFavorite(params.itemId, params.source, params.groupId)
      if (ok) broadcastFavoritesChanged()
      return ok
    }
  )
  ipcMain.handle('user:removeFavorite', (_e, params: { itemId: string; source: string }) => {
    const ok = services.personal?.removeFavorite(params.itemId, params.source) ?? false
    if (ok) broadcastFavoritesChanged()
    return ok
  })
  ipcMain.handle('user:toggleFavorite', (_e, params: { itemId: string; source: string }) => {
    const toggledOn = services.personal?.toggleFavorite(params.itemId, params.source) ?? false
    broadcastFavoritesChanged()
    return toggledOn
  })
  ipcMain.handle('user:isLiked', (_e, params: { itemId: string; source: string }) => {
    return services.personal?.isLiked(params.itemId, params.source) ?? false
  })
  ipcMain.handle('user:addLike', (_e, params: { itemId: string; source: string }) => {
    services.personal?.addLike(params.itemId, params.source)
    return true
  })
  ipcMain.handle('user:removeLike', (_e, params: { itemId: string; source: string }) => {
    return services.personal?.removeLike(params.itemId, params.source) ?? false
  })
}
