import type { BrowserWindow } from 'electron'

let mainWindow: BrowserWindow | null = null

export function setMainWindow(win: BrowserWindow | null): void {
  mainWindow = win
}

export function getMainWindow(): BrowserWindow | null {
  return mainWindow
}

export function broadcastMaximizedState(): void {
  if (!mainWindow) return
  mainWindow.webContents.send('window:maximized-changed', mainWindow.isMaximized())
}
