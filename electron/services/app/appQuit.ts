import { app, BrowserWindow } from 'electron'
import type { AppServices } from '../../ipc/types'
import { setMainWindow } from '../../windowState'
import { shutdownDataServices } from '../data/shutdown'
import { closeAllNotePopoutsForAppExit } from '../notes/noteWindowManager'
import {
  disposeQuickAccess,
  isAppQuitting,
  markAppQuitting
} from '../quickAccess/quickAccessManager'

let servicesRef: AppServices | null = null

export function configureAppQuit(services: AppServices): void {
  servicesRef = services
}

/** 统一退出：销毁全部窗口并结束进程（避免仅隐藏托盘后进程仍驻留） */
export function requestAppQuit(): void {
  if (isAppQuitting()) return
  markAppQuitting()

  closeAllNotePopoutsForAppExit()
  disposeQuickAccess()

  if (servicesRef) {
    shutdownDataServices(servicesRef)
  }

  setMainWindow(null)
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.destroy()
  }

  app.exit(0)
}
