import { ipcMain } from 'electron'
import { importProfileImage, removeProfileFile } from '../../services/media/userProfile'
import { toWanwuMediaUrl } from '../../services/media/wanwu'
import type { AppServices } from '../types'

export function registerUserHandlers(services: AppServices): void {
  ipcMain.handle('user:getProfile', () => {
    return services.userData?.getProfile() ?? null
  })
  ipcMain.handle('user:updateProfile', (_e, profile: unknown) => {
    return services.userData?.updateProfile(
      profile as {
        nickname: string
        bio: string
        avatarPath?: string | null
        backgroundPath?: string | null
        backgroundConfig?: Record<string, unknown> | null
      }
    )
  })
  ipcMain.handle(
    'user:importProfileImage',
    (_e, params: { kind: 'avatar' | 'background'; filePath: string }) => {
      if (!services.media || !services.db) throw new Error('服务未就绪')
      const relativePath = importProfileImage(services.media, params.kind, params.filePath)
      const profile = services.userData?.getProfile()
      if (!profile) throw new Error('用户资料不存在')
      if (params.kind === 'avatar') {
        if (profile.avatarPath && profile.avatarPath !== relativePath) {
          removeProfileFile(services.media, profile.avatarPath)
        }
        services.userData?.updateProfile({
          nickname: profile.nickname,
          bio: profile.bio,
          avatarPath: relativePath
        })
      } else {
        services.userData?.updateProfile({
          nickname: profile.nickname,
          bio: profile.bio,
          backgroundPath: relativePath,
          backgroundConfig: profile.backgroundConfig ?? {
            scale: 1,
            offsetX: 0,
            offsetY: 0,
            opacity: 1,
            crop: null
          }
        })
      }
      return { relativePath, url: toWanwuMediaUrl(relativePath) }
    }
  )
  ipcMain.handle('user:clearBackground', () => {
    if (!services.media || !services.db) return
    const profile = services.userData?.getProfile()
    if (!profile?.backgroundPath) return
    removeProfileFile(services.media, profile.backgroundPath)
    services.userData?.updateProfile({
      nickname: profile.nickname,
      bio: profile.bio,
      backgroundPath: null,
      backgroundConfig: null
    })
  })
  ipcMain.handle('user:listFavorites', () => {
    return services.library?.listFavoriteEntries() ?? []
  })
  ipcMain.handle('user:listFavoriteGroups', () => {
    return services.library?.listFavoriteGroups() ?? []
  })
  ipcMain.handle('user:listFavoriteGroupsForPicker', () => {
    return services.db?.listFavoriteGroups().map((g) => ({
      id: g.id,
      name: g.name,
      sortOrder: g.sort_order
    })) ?? []
  })
  ipcMain.handle('user:createFavoriteGroup', (_e, name: string) => {
    return services.db?.createFavoriteGroup(name) ?? null
  })
  ipcMain.handle('user:isFavorite', (_e, params: { itemId: string; source: string }) => {
    return services.db?.isFavorite(params.itemId, params.source) ?? false
  })
  ipcMain.handle(
    'user:addFavorite',
    (_e, params: { itemId: string; source: string; groupId: string }) => {
      services.db?.addFavorite(params.itemId, params.source, params.groupId)
      return true
    }
  )
  ipcMain.handle('user:removeFavorite', (_e, params: { itemId: string; source: string }) => {
    return services.db?.removeFavorite(params.itemId, params.source) ?? false
  })
  ipcMain.handle('user:toggleFavorite', (_e, params: { itemId: string; source: string }) => {
    return services.db?.toggleFavorite(params.itemId, params.source) ?? false
  })
  ipcMain.handle('user:isLiked', (_e, params: { itemId: string; source: string }) => {
    return services.db?.isLiked(params.itemId, params.source) ?? false
  })
  ipcMain.handle('user:addLike', (_e, params: { itemId: string; source: string }) => {
    services.db?.addLike(params.itemId, params.source)
    return true
  })
  ipcMain.handle('user:removeLike', (_e, params: { itemId: string; source: string }) => {
    return services.db?.removeLike(params.itemId, params.source) ?? false
  })
}
