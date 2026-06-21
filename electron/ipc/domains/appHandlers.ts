import { ipcMain, app, dialog, shell } from 'electron'
import { getMainWindow } from '../../windowState'
import {
  getDefaultWanwuPath,
  isCustomWanwuPath,
  resolveWanwuPath,
  resolveWanwuPathUnderParent,
  validateMigrationTarget
} from '../../services/data/paths'
import { migrateWanwuData } from '../../services/data/migration'
import { shutdownDataServices } from '../../services/data/shutdown'
import { consumeStartupNotices } from '../../app/frameworkLifecycleBridge'
import { normalizeAppSettings, mergeAppSettings } from '../../services/data/settings'
import {
  applyLaunchAtStartup,
  readLaunchAtStartupFromOs,
  canApplyLaunchAtStartup
} from '../../services/app/launchAtStartup'
import {
  buildDiagnosticsReport,
  clearCacheDirectory,
  createDataBackup,
  exportDiagnosticsToFile,
  resetAppSettingsInDb,
  restoreDataBackup
} from '../../services/data/maintenance'
import { DEFAULT_APP_SETTINGS, type AppSettings } from '../../../src/shared/types/settings'
import { dispatchSettingsChanged } from '../../app/settingsSideEffects'
import { syncQuickAccessFromSettings } from '../../app/frameworkLifecycleBridge'
import { broadcastToAllWindows } from '../../app/windowBroadcast'
import type { AppServices } from '../types'

export function registerAppHandlers(services: AppServices): void {
  ipcMain.handle('app:getPaths', () => ({
    userData: app.getPath('userData'),
    wanwu: resolveWanwuPath(),
    defaultWanwu: getDefaultWanwuPath(),
    isCustom: isCustomWanwuPath()
  }))
  ipcMain.handle('app:getStartupNotices', () => consumeStartupNotices())
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
      shutdownDataServices(services)
      app.relaunch()
      app.exit(0)
      return result
    }
  )
  function publishAppSettings(next: AppSettings): AppSettings {
    services.userData?.updateAppSettings(next)
    dispatchSettingsChanged(services, next)
    syncQuickAccessFromSettings(next)
    applyLaunchAtStartup(next.launchAtStartup)
    broadcastToAllWindows('app:settings-changed', next)
    return next
  }
  ipcMain.handle('app:getSettings', () => {
    let settings = normalizeAppSettings(services.userData?.getAppSettings() ?? {})
    if (canApplyLaunchAtStartup()) {
      const osEnabled = readLaunchAtStartupFromOs()
      if (osEnabled !== settings.launchAtStartup) {
        settings = mergeAppSettings({ launchAtStartup: osEnabled }, settings)
        services.userData?.updateAppSettings(settings)
      }
    }
    return settings
  })
  ipcMain.handle('app:updateSettings', (_e, settings: unknown) => {
    const current = normalizeAppSettings(services.userData?.getAppSettings() ?? {})
    const next = mergeAppSettings(settings as Partial<AppSettings>, current)
    return publishAppSettings(next)
  })
  ipcMain.handle('app:patchSettings', (_e, patch: unknown) => {
    const current = normalizeAppSettings(services.userData?.getAppSettings() ?? {})
    const next = mergeAppSettings(patch as Partial<AppSettings>, current)
    return publishAppSettings(next)
  })
  ipcMain.handle('app:createBackup', async () => {
    const wanwuPath = services.db?.getBasePath() ?? resolveWanwuPath()
    return createDataBackup(wanwuPath)
  })
  ipcMain.handle('app:restoreBackup', async () => {
    const wanwuPath = services.db?.getBasePath() ?? resolveWanwuPath()
    const result = await restoreDataBackup(wanwuPath, () => {
      shutdownDataServices(services)
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
    const next = normalizeAppSettings(DEFAULT_APP_SETTINGS)
    return publishAppSettings(next)
  })
  ipcMain.handle('app:exportDiagnostics', async () => {
    const wanwuPath = services.db?.getBasePath() ?? resolveWanwuPath()
    const content = await buildDiagnosticsReport({
      wanwuPath,
      db: services.db
    })
    return exportDiagnosticsToFile(content)
  })
}
