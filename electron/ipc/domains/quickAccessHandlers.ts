import { ipcMain } from 'electron'
import { waitForLibraryBootstrap } from '../../services/library/pack'
import {
  getTrayStatusForIpc,
  hideDailyWidget,
  openDailyInMain,
  searchForIpc,
  searchByKindForIpc,
  showDailyWidget,
  executeTrayMenuAction,
  getTrayMenuContextForIpc
} from '../../services/quickAccess/quickAccessManager'
import { applyTrayMenuLayout, hideTrayMenuWindow } from '../../services/quickAccess/trayMenuWindow'
import type { TrayMenuAction } from '../../../src/shared/types/trayMenu'
import type { AppServices } from '../types'

export function registerQuickAccessHandlers(services: AppServices): void {
  ipcMain.handle('quick-access:search', async (_e, params: { query: string; limit?: number }) => {
    return searchForIpc(params.query, params.limit)
  })
  ipcMain.handle(
    'quick-access:searchByKind',
    async (_e, params: { kind: import('../../../src/shared/types/quickAccess').QuickAccessHitKind; query: string }) => {
      return searchByKindForIpc(params.kind, params.query)
    }
  )
  ipcMain.handle('quick-access:getDailyPick', async () => {
    await waitForLibraryBootstrap()
    return services.library?.pickDailyItem() ?? null
  })
  ipcMain.handle('quick-access:getTrayStatus', () => getTrayStatusForIpc())
  ipcMain.handle('quick-access:showDailyWidget', () => showDailyWidget())
  ipcMain.handle('quick-access:hideDailyWidget', () => {
    hideDailyWidget()
  })
  ipcMain.handle('quick-access:openDailyInMain', () => {
    openDailyInMain()
  })
  ipcMain.handle('quick-access:getTrayMenuContext', () => getTrayMenuContextForIpc())
  ipcMain.handle('quick-access:trayMenuAction', (_e, action: TrayMenuAction) => {
    executeTrayMenuAction(action)
  })
  ipcMain.handle('quick-access:hideTrayMenu', () => {
    hideTrayMenuWindow()
  })
  ipcMain.handle(
    'quick-access:reportTrayMenuLayout',
    (_e, size: { width: number; height: number }) => {
      applyTrayMenuLayout(size)
    }
  )
}
