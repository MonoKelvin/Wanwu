import { ipcMain, app, dialog, shell } from 'electron'
import {
  cacheImageForViewer,
  copyTextToClipboard,
  downloadMediaFile,
  openExternalUrl,
  pickImageFile,
  releaseViewerImageCache,
  saveImageDataUrl,
  saveTextFile,
  savePngDataUrl,
  showMediaInFolder
} from '../services/shellMedia'
import {
  canNativeShare,
  openNativeShare,
  uploadTempShareFile,
  writeShareTempFile
} from '../services/shareMedia'
import { getMainWindow, broadcastMaximizedState } from '../windowState'
import type { DatabaseService } from '../services/database'
import type { LibraryService } from '../services/libraryService'
import type { RssService } from '../services/rssService'
import type { MediaService } from '../services/mediaService'
import {
  getDefaultWanwuPath,
  isCustomWanwuPath,
  resolveWanwuPath,
  resolveWanwuPathUnderParent,
  validateMigrationTarget
} from '../services/dataPaths'
import { migrateWanwuData } from '../services/dataMigration'
import { importProfileImage, removeProfileFile } from '../services/userProfileMedia'
import { toWanwuMediaUrl } from '../services/wanwuMedia'
import { normalizeAppSettings, mergeAppSettings } from '../services/appSettingsNormalize'
import { applyRssAutoRefreshSchedule } from '../services/rssScheduler'
import {
  buildDiagnosticsReport,
  clearCacheDirectory,
  createDataBackup,
  exportDiagnosticsToFile,
  resetAppSettingsInDb,
  restoreDataBackup
} from '../services/dataMaintenance'
import { DEFAULT_APP_SETTINGS } from '../../src/shared/types/settings'

export interface AppServices {
  db: DatabaseService | null
  library: LibraryService | null
  rss: RssService | null
  media: MediaService | null
}

export function registerIpcHandlers(services: AppServices): void {
  ipcMain.handle('library:listCategories', () => {
    return services.library?.listCategories() ?? []
  })

  ipcMain.handle('library:listItems', (_e, params: { categoryId: string; subCategoryId?: string }) => {
    return services.library?.listItems(params.categoryId, params.subCategoryId) ?? []
  })

  ipcMain.handle('library:searchItems', (_e, params: { query: string; limit?: number }) => {
    return services.library?.searchItems(params.query, params.limit) ?? []
  })

  ipcMain.handle('library:getItem', (_e, id: string) => {
    return services.library?.getItem(id) ?? null
  })

  ipcMain.handle('library:updateItem', (_e, item: unknown) => {
    return services.library?.updateItem(item as Parameters<NonNullable<typeof services.library>['updateItem']>[0])
  })

  ipcMain.handle('library:createItem', (_e, item: unknown) => {
    return services.library?.createItem(item as Parameters<NonNullable<typeof services.library>['createItem']>[0])
  })

  ipcMain.handle('library:uploadItemImage', (_e, params: { itemId: string; filePath: string }) => {
    if (!services.library) throw new Error('库服务未就绪')
    return services.library.uploadItemImage(params.itemId, params.filePath)
  })

  ipcMain.handle('rss:listGroups', () => services.rss?.listGroups() ?? [])

  ipcMain.handle('rss:createGroup', (_e, payload: { name?: string } | string) => {
    if (!services.rss) throw new Error('RSS 服务未就绪')
    const name = typeof payload === 'string' ? payload : payload?.name
    if (!name?.trim()) throw new Error('请填写分组名称')
    return services.rss.createGroup(name.trim())
  })

  ipcMain.handle('rss:renameGroup', (_e, { groupId, name }: { groupId: string; name: string }) => {
    services.rss?.renameGroup(groupId, name)
  })

  ipcMain.handle('rss:deleteGroup', (_e, { groupId }: { groupId: string }) => {
    services.rss?.deleteGroup(groupId)
  })

  ipcMain.handle('rss:listFeeds', () => services.rss?.listFeeds() ?? [])

  ipcMain.handle('rss:createFeed', (_e, input: unknown) => {
    return services.rss?.createFeed(input as Parameters<NonNullable<typeof services.rss>['createFeed']>[0])
  })

  ipcMain.handle('rss:updateFeed', (_e, input: unknown) => {
    return services.rss?.updateFeed(input as Parameters<NonNullable<typeof services.rss>['updateFeed']>[0])
  })

  ipcMain.handle('rss:moveFeed', (_e, { feedId, groupId, sortOrder }: { feedId: string; groupId: string; sortOrder?: number }) => {
    services.rss?.moveFeed(feedId, groupId, sortOrder)
  })

  ipcMain.handle('rss:softDeleteFeed', (_e, { feedId }: { feedId: string }) => {
    services.rss?.softDeleteFeed(feedId)
  })

  ipcMain.handle('rss:restoreFeed', (_e, { feedId }: { feedId: string }) => {
    services.rss?.restoreFeed(feedId)
  })

  ipcMain.handle('rss:permanentDeleteFeed', (_e, { feedId }: { feedId: string }) => {
    services.rss?.permanentDeleteFeed(feedId)
  })

  ipcMain.handle('rss:emptyRecycleBin', () => {
    services.rss?.emptyRecycleBin()
  })

  ipcMain.handle('rss:probeFeed', (_e, { feedId }: { feedId: string }) => {
    return services.rss?.probeFeed(feedId)
  })

  ipcMain.handle(
    'rss:fetchFeed',
    (_e, { feedId, fetchLimit }: { feedId: string; fetchLimit?: number }) => {
      return services.rss?.fetchFeed(feedId, fetchLimit ?? 20)
    }
  )

  ipcMain.handle(
    'rss:listEntries',
    (_e, { feedId, limit, offset }: { feedId: string; limit?: number; offset?: number }) => {
      return services.rss?.listEntries(feedId, limit ?? 20, offset ?? 0) ?? { items: [], total: 0 }
    }
  )

  ipcMain.handle('user:getProfile', () => {
    return services.db?.getProfile()
  })

  ipcMain.handle('user:updateProfile', (_e, profile: unknown) => {
    return services.db?.updateProfile(
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
      const profile = services.db.getProfile()
      if (!profile) throw new Error('用户资料不存在')

      if (params.kind === 'avatar') {
        if (profile.avatarPath && profile.avatarPath !== relativePath) {
          removeProfileFile(services.media, profile.avatarPath)
        }
        services.db.updateProfile({
          nickname: profile.nickname,
          bio: profile.bio,
          avatarPath: relativePath
        })
      } else {
        services.db.updateProfile({
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
    const profile = services.db.getProfile()
    if (!profile?.backgroundPath) return
    removeProfileFile(services.media, profile.backgroundPath)
    services.db.updateProfile({
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

  ipcMain.handle('app:getPaths', () => ({
    userData: app.getPath('userData'),
    wanwu: resolveWanwuPath(),
    defaultWanwu: getDefaultWanwuPath(),
    isCustom: isCustomWanwuPath()
  }))

  ipcMain.handle('app:openDataDirectory', () => {
    const dir = resolveWanwuPath()
    if (!dir) return { ok: false }
    void shell.openPath(dir)
    return { ok: true }
  })

  ipcMain.handle('app:pickDataDirectoryParent', async () => {
    const win = getMainWindow()
    const options = {
      title: '选择新的数据存放位置',
      properties: ['openDirectory', 'createDirectory'] as ('openDirectory' | 'createDirectory')[]
    }
    const result = win
      ? await dialog.showOpenDialog(win, options)
      : await dialog.showOpenDialog(options)

    if (result.canceled || !result.filePaths?.length) {
      return { ok: false, canceled: true as const }
    }

    const parentDir = result.filePaths[0]!
    const current = services.db?.getBasePath() ?? resolveWanwuPath()
    const validation = validateMigrationTarget(current, parentDir)
    if (!validation.ok) {
      return { ok: false, error: validation.error }
    }

    return {
      ok: true,
      parentDir,
      targetPath: resolveWanwuPathUnderParent(parentDir)
    }
  })

  ipcMain.handle(
    'app:migrateDataDirectory',
    (_e, params: { parentDir: string; overwriteExisting?: boolean }) => {
      const current = services.db?.getBasePath() ?? resolveWanwuPath()
      const result = migrateWanwuData(current, params.parentDir, {
        overwriteExisting: params.overwriteExisting
      })
      if (!result.ok) return result

      services.db?.close()
      services.db = null
      services.library = null
      services.rss = null
      services.media = null

      app.relaunch()
      app.exit(0)
      return result
    }
  )

  ipcMain.handle('app:getSettings', () => {
    return normalizeAppSettings(services.db?.getAppSettings() ?? {})
  })

  ipcMain.handle('app:updateSettings', (_e, settings: unknown) => {
    const current = normalizeAppSettings(services.db?.getAppSettings() ?? {})
    const next = mergeAppSettings(settings as Record<string, unknown>, current)
    services.db?.updateAppSettings(next)
    applyRssAutoRefreshSchedule(services)
    return next
  })

  ipcMain.handle('app:patchSettings', (_e, patch: unknown) => {
    const current = normalizeAppSettings(services.db?.getAppSettings() ?? {})
    const next = mergeAppSettings(patch as Record<string, unknown>, current)
    services.db?.updateAppSettings(next)
    applyRssAutoRefreshSchedule(services)
    return next
  })

  ipcMain.handle('app:createBackup', async () => {
    const wanwuPath = services.db?.getBasePath() ?? resolveWanwuPath()
    return createDataBackup(wanwuPath)
  })

  ipcMain.handle('app:restoreBackup', async () => {
    const wanwuPath = services.db?.getBasePath() ?? resolveWanwuPath()
    const result = await restoreDataBackup(wanwuPath, () => {
      services.db?.close()
      services.db = null
      services.library = null
      services.rss = null
      services.media = null
    })
    if (result.ok) {
      app.relaunch()
      app.exit(0)
    }
    return result
  })

  ipcMain.handle('app:clearCache', () => {
    const wanwuPath = services.db?.getBasePath() ?? resolveWanwuPath()
    return clearCacheDirectory(wanwuPath)
  })

  ipcMain.handle('app:resetSettings', () => {
    if (services.db) resetAppSettingsInDb(services.db)
    applyRssAutoRefreshSchedule(services)
    return normalizeAppSettings(DEFAULT_APP_SETTINGS)
  })

  ipcMain.handle('app:exportDiagnostics', async () => {
    const wanwuPath = services.db?.getBasePath() ?? resolveWanwuPath()
    const content = await buildDiagnosticsReport({
      wanwuPath,
      db: services.db,
      rss: services.rss
    })
    return exportDiagnosticsToFile(content)
  })

  ipcMain.handle('window:getPlatform', () => process.platform)

  ipcMain.handle('window:minimize', () => {
    getMainWindow()?.minimize()
  })

  ipcMain.handle('window:toggleMaximize', () => {
    const win = getMainWindow()
    if (!win) return false
    if (win.isMaximized()) {
      win.unmaximize()
    } else {
      win.maximize()
    }
    broadcastMaximizedState()
    return win.isMaximized()
  })

  ipcMain.handle('window:isMaximized', () => {
    return getMainWindow()?.isMaximized() ?? false
  })

  ipcMain.handle('window:close', () => {
    getMainWindow()?.close()
  })

  ipcMain.handle('shell:openExternal', (_e, url: string) => openExternalUrl(url))

  ipcMain.handle(
    'shell:downloadFile',
    (_e, params: { url: string; defaultName?: string }) => downloadMediaFile(params.url, params.defaultName)
  )

  ipcMain.handle('shell:showItemInFolder', (_e, url: string) => showMediaInFolder(url))

  ipcMain.handle('shell:copyText', (_e, text: string) => {
    copyTextToClipboard(text)
  })

  ipcMain.handle('shell:pickImageFile', () => pickImageFile())

  ipcMain.handle(
    'shell:savePngDataUrl',
    (_e, params: { dataUrl: string; defaultName?: string }) =>
      savePngDataUrl(params.dataUrl, params.defaultName)
  )

  ipcMain.handle(
    'shell:saveImageDataUrl',
    (_e, params: { dataUrl: string; defaultName?: string }) =>
      saveImageDataUrl(params.dataUrl, params.defaultName)
  )

  ipcMain.handle(
    'shell:saveTextFile',
    (_e, params: { content: string; defaultName?: string; extension?: string }) =>
      saveTextFile(params.content, params.defaultName, params.extension)
  )

  ipcMain.handle('shell:cacheImageForViewer', (_e, url: string) => cacheImageForViewer(url))

  ipcMain.handle('shell:releaseViewerImageCache', (_e, cacheId: number) => {
    releaseViewerImageCache(cacheId)
  })

  ipcMain.handle('share:canNativeShare', () => canNativeShare())

  ipcMain.handle(
    'share:nativeShare',
    (
      _e,
      params: {
        title?: string
        text?: string
        dataUrl?: string
        textContent?: string
        fileName: string
      }
    ) => {
      const file = writeShareTempFile({
        dataUrl: params.dataUrl,
        textContent: params.textContent,
        fileName: params.fileName
      })
      if (!file.ok) return file
      return openNativeShare({
        title: params.title,
        text: params.text,
        filePath: file.path
      }).finally(() => file.cleanup())
    }
  )

  ipcMain.handle(
    'share:uploadTemp',
    (
      _e,
      params: {
        dataUrl?: string
        textContent?: string
        fileName: string
        expire?: '1h' | '12h' | '24h' | '72h'
      }
    ) => {
      const file = writeShareTempFile({
        dataUrl: params.dataUrl,
        textContent: params.textContent,
        fileName: params.fileName
      })
      if (!file.ok) return file
      return uploadTempShareFile(file.path, params.expire ?? '24h').finally(() => file.cleanup())
    }
  )
}
