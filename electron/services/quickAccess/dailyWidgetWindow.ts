import { app, BrowserWindow, nativeImage } from 'electron'
import { existsSync } from 'fs'
import { join } from 'path'
import { resolveAppLogoPath } from '../media/appAssets'

const WIDGET_WIDTH = 300
const WIDGET_HEIGHT = 400

let widgetWin: BrowserWindow | null = null

function isDev(): boolean {
  return !app.isPackaged
}

function rendererIndexPath(): string {
  return join(__dirname, '../renderer/index.html')
}

async function loadWidgetRenderer(win: BrowserWindow): Promise<void> {
  const hash = 'daily-widget'
  if (isDev() && process.env.ELECTRON_RENDERER_URL) {
    const base = process.env.ELECTRON_RENDERER_URL.replace(/\/$/, '')
    await win.loadURL(`${base}/#/${hash}`)
    return
  }
  const file = rendererIndexPath()
  if (!existsSync(file)) {
    throw new Error(`renderer not found: ${file}`)
  }
  await win.loadFile(file, { hash: `/${hash}` })
}

export function isDailyWidgetOpen(): boolean {
  return widgetWin !== null && !widgetWin.isDestroyed()
}

export async function showDailyWidget(): Promise<void> {
  if (widgetWin && !widgetWin.isDestroyed()) {
    widgetWin.show()
    widgetWin.focus()
    return
  }

  const appIcon = resolveAppLogoPath(256)
  widgetWin = new BrowserWindow({
    width: WIDGET_WIDTH,
    height: WIDGET_HEIGHT,
    minWidth: WIDGET_WIDTH,
    minHeight: WIDGET_HEIGHT,
    maxWidth: WIDGET_WIDTH,
    maxHeight: WIDGET_HEIGHT,
    show: false,
    frame: false,
    resizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    autoHideMenuBar: true,
    ...(appIcon ? { icon: appIcon } : {}),
    webPreferences: {
      preload: (() => {
        const mjs = join(__dirname, '../preload/index.mjs')
        const js = join(__dirname, '../preload/index.js')
        return existsSync(mjs) ? mjs : js
      })(),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  widgetWin.on('closed', () => {
    widgetWin = null
  })

  widgetWin.on('ready-to-show', () => {
    widgetWin?.show()
  })

  await loadWidgetRenderer(widgetWin)
}

export function hideDailyWidget(): void {
  if (!widgetWin || widgetWin.isDestroyed()) return
  widgetWin.close()
  widgetWin = null
}

export function closeDailyWidgetForAppExit(): void {
  if (!widgetWin || widgetWin.isDestroyed()) return
  widgetWin.destroy()
  widgetWin = null
}
