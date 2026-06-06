import type { BrowserWindow } from 'electron'
import { normalizeAppSettings } from '../data/settings'
import type { AppServices } from '../../ipc/types'
import { getMainWindow } from '../../windowState'
import { requestAppQuit } from './appQuit'
import {
  ensureTrayForWindowHide,
  isAppQuitting,
  isTrayActive
} from '../quickAccess/quickAccessManager'

export type MainWindowCloseResult = 'hidden' | 'quit' | 'cancelled'
export type ClosePromptChoice = 'tray' | 'quit' | 'cancel'

let servicesRef: AppServices | null = null
let pendingCloseResolve: ((result: MainWindowCloseResult) => void) | null = null

export function configureWindowClosePolicy(services: AppServices): void {
  servicesRef = services
}

function currentSettings() {
  return normalizeAppSettings(servicesRef?.userData?.getAppSettings() ?? {})
}

/** 关闭主窗口后是否保持进程（已缩到托盘） */
export function shouldKeepAppRunningAfterWindowClose(): boolean {
  return !isAppQuitting() && isTrayActive()
}

function focusForClosePrompt(win: BrowserWindow): void {
  if (!win.isVisible()) win.show()
  if (win.isMinimized()) win.restore()
  win.focus()
}

function hideToTray(win: BrowserWindow): MainWindowCloseResult {
  ensureTrayForWindowHide()
  win.hide()
  return 'hidden'
}

function quitFromWindow(_win: BrowserWindow): MainWindowCloseResult {
  requestAppQuit()
  return 'quit'
}

function askCloseAction(win: BrowserWindow): Promise<MainWindowCloseResult> {
  if (pendingCloseResolve) return Promise.resolve('cancelled')

  focusForClosePrompt(win)

  return new Promise((resolve) => {
    pendingCloseResolve = resolve
    win.webContents.send('window:close-prompt')
  })
}

export function resolveClosePrompt(choice: ClosePromptChoice): void {
  const win = getMainWindow()
  const resolve = pendingCloseResolve
  pendingCloseResolve = null

  if (!resolve) return

  if (!win || win.isDestroyed()) {
    resolve('cancelled')
    return
  }

  if (choice === 'cancel') {
    resolve('cancelled')
    return
  }
  if (choice === 'tray') {
    resolve(hideToTray(win))
    return
  }

  requestAppQuit()
  resolve('quit')
}

/** 标题栏关闭（需已 preventDefault，除 quit 模式外） */
export async function handleMainWindowClose(win: BrowserWindow): Promise<MainWindowCloseResult> {
  if (isAppQuitting()) return quitFromWindow(win)

  const { closeBehavior } = currentSettings()

  switch (closeBehavior) {
    case 'tray':
      return hideToTray(win)
    case 'ask':
      return askCloseAction(win)
    case 'quit':
    default:
      return quitFromWindow(win)
  }
}

export function attachMainWindowCloseBehavior(win: BrowserWindow): void {
  win.on('close', (event) => {
    if (isAppQuitting()) return

    const { closeBehavior } = currentSettings()
    if (closeBehavior === 'quit') {
      event.preventDefault()
      requestAppQuit()
      return
    }

    event.preventDefault()
    void handleMainWindowClose(win)
  })
}
