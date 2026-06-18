import { ipcMain } from 'electron'
import type { IMainProcessModule, MainProcessInitContext } from '@shared/module-bridge/mainProcessRegistry'
import { QUICK_ACCESS_MODULE_ID } from '@shared/module-bridge/moduleIds'
import { ILLUSTRATED_HANDBOOK_MODULE_ID } from '@shared/module-bridge/moduleIds'
import { getModuleRuntimeService } from '@shared/module-bridge/mainProcessRegistry'
import { waitForLibraryBootstrap } from '../../../../electron/app/frameworkLifecycleBridge'
import type { AppServices } from '../../../../electron/ipc/types'
import {
  applyTrayMenuLayout,
  bindQuickAccessServices,
  disposeQuickAccessRuntime,
  executeTrayMenuAction,
  getTrayMenuContextForIpc,
  getTrayStatusForIpc,
  hideDailyWidget,
  hideTrayMenuWindow,
  openDailyInMain,
  registerQuickAccessLifecycleHooks,
  searchByKindForIpc,
  searchForIpc,
  showDailyWidget,
  syncQuickAccessFromSettings
} from './service/quickAccessManager'

function asAppServices(ctx: MainProcessInitContext): AppServices {
  return {
    db: ctx.services.db as AppServices['db'],
    userData: ctx.services.userData as AppServices['userData'],
    media: ctx.services.media as AppServices['media'],
    moduleRuntime: ctx.services.moduleRuntime
  }
}

export const quickAccessMainModule: IMainProcessModule = {
  id: QUICK_ACCESS_MODULE_ID,
  order: 0,

  onModulesReady(ctx) {
    bindQuickAccessServices(asAppServices(ctx))
    registerQuickAccessLifecycleHooks()
    syncQuickAccessFromSettings()
  },

  onSettingsChanged(ctx, settings) {
    bindQuickAccessServices(asAppServices(ctx))
    syncQuickAccessFromSettings(settings)
  },

  onDispose() {
    disposeQuickAccessRuntime()
  },

  registerIpcHandlers(ctx) {
    ipcMain.handle('quick-access:search', async (_e, params: { query: string; limit?: number }) => {
      return searchForIpc(params.query, params.limit)
    })
    ipcMain.handle(
      'quick-access:searchByKind',
      async (
        _e,
        params: { kind: import('@shared/types/quickAccess').QuickAccessHitKind; query: string }
      ) => searchByKindForIpc(params.kind, params.query)
    )
    ipcMain.handle('quick-access:getDailyPick', async () => {
      await waitForLibraryBootstrap()
      const library = getModuleRuntimeService<{ pickDailyItem(): unknown }>(
        ctx,
        ILLUSTRATED_HANDBOOK_MODULE_ID
      )
      return library?.pickDailyItem() ?? null
    })
    ipcMain.handle('quick-access:getTrayStatus', () => getTrayStatusForIpc())
    ipcMain.handle('quick-access:showDailyWidget', () => showDailyWidget())
    ipcMain.handle('quick-access:hideDailyWidget', () => hideDailyWidget())
    ipcMain.handle('quick-access:openDailyInMain', () => openDailyInMain())
    ipcMain.handle('quick-access:getTrayMenuContext', () => getTrayMenuContextForIpc())
    ipcMain.handle('quick-access:trayMenuAction', (_e, action) => executeTrayMenuAction(action))
    ipcMain.handle('quick-access:hideTrayMenu', () => hideTrayMenuWindow())
    ipcMain.handle(
      'quick-access:reportTrayMenuLayout',
      (_e, size: { width: number; height: number }) => {
        applyTrayMenuLayout(size)
      }
    )
  }
}
