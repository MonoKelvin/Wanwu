import { ipcMain } from 'electron'
import { getMainWindow, broadcastMaximizedState } from '../../windowState'
import { handleMainWindowClose, resolveClosePrompt } from '../../services/app/windowClose'
import type { AppServices } from '../types'

export function registerWindowHandlers(services: AppServices): void {
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
  ipcMain.handle('window:close', async () => {
    const win = getMainWindow()
    if (!win) return
    await handleMainWindowClose(win)
  })
  ipcMain.handle('window:resolveClosePrompt', (_e, choice: 'tray' | 'quit' | 'cancel') => {
    resolveClosePrompt(choice)
  })
}
