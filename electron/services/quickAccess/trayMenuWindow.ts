import { app, BrowserWindow, nativeTheme, screen, type Tray } from 'electron'
import { existsSync } from 'fs'
import { join } from 'path'
import { normalizeAppSettings } from '../data/settings'
import { resolveAppLogoPath } from '../media/appAssets'
import type { AppServices } from '../../ipc/handlers'

/** 与 --ww-elevated 一致；窗口即菜单，无额外底色块 */
const TRAY_MENU_BG_LIGHT = '#ffffff'
const TRAY_MENU_BG_DARK = '#1f1f23'

const MENU_LAYOUT_STAGE_WIDTH = 320
const MENU_LAYOUT_STAGE_HEIGHT = 480
const MENU_FALLBACK_WIDTH = 220
const MENU_FALLBACK_HEIGHT = 280
const MENU_MAX_WIDTH = 300
const EDGE_MARGIN = 8
const TRAY_GAP = 6

let servicesRef: AppServices | null = null
let trayRef: Tray | null = null
let menuWin: BrowserWindow | null = null
let blurHideTimer: ReturnType<typeof setTimeout> | null = null
let pendingAnchor = { x: 0, y: 0 }
let suppressBlurHideUntil = 0
let layoutFallbackTimer: ReturnType<typeof setTimeout> | null = null

export function bindTrayMenuContext(services: AppServices, tray: Tray | null): void {
  servicesRef = services
  trayRef = tray
}

function isDev(): boolean {
  return !app.isPackaged
}

function rendererIndexPath(): string {
  return join(__dirname, '../renderer/index.html')
}

function trayMenuBackgroundColor(): string {
  const scheme = normalizeAppSettings(servicesRef?.userData?.getAppSettings() ?? {}).colorScheme
  const dark =
    scheme === 'dark' || (scheme === 'system' && nativeTheme.shouldUseDarkColors)
  return dark ? TRAY_MENU_BG_DARK : TRAY_MENU_BG_LIGHT
}

function applyTrayMenuWindowChrome(win: BrowserWindow): void {
  win.setBackgroundColor(trayMenuBackgroundColor())
  if (process.platform === 'win32' && typeof win.setBackgroundMaterial === 'function') {
    try {
      win.setBackgroundMaterial('none')
    } catch {
      /* 忽略 */
    }
  }
}

function normalizeMenuSize(size: { width: number; height: number }): { width: number; height: number } {
  const width = Math.min(
    MENU_MAX_WIDTH,
    Math.max(1, Math.ceil(size.width)) || MENU_FALLBACK_WIDTH
  )
  const height = Math.max(1, Math.ceil(size.height)) || MENU_FALLBACK_HEIGHT
  return { width, height }
}

function clearLayoutFallbackTimer(): void {
  if (layoutFallbackTimer) {
    clearTimeout(layoutFallbackTimer)
    layoutFallbackTimer = null
  }
}

function scheduleLayoutFallback(): void {
  clearLayoutFallbackTimer()
  layoutFallbackTimer = setTimeout(() => {
    layoutFallbackTimer = null
    if (!menuWin || menuWin.isDestroyed() || menuWin.isVisible()) return
    applyTrayMenuLayout({ width: MENU_FALLBACK_WIDTH, height: MENU_FALLBACK_HEIGHT })
  }, 450)
}

async function loadTrayMenuRenderer(win: BrowserWindow): Promise<void> {
  const hash = 'tray-menu'
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

function clearBlurHideTimer(): void {
  if (blurHideTimer) {
    clearTimeout(blurHideTimer)
    blurHideTimer = null
  }
}

/** 托盘图标中心为锚点，菜单优先出现在图标上方 */
export function resolveTrayMenuAnchor(): { x: number; y: number } {
  const cursor = screen.getCursorScreenPoint()
  if (!trayRef) return cursor
  const bounds = trayRef.getBounds()
  if (bounds.width <= 0 || bounds.height <= 0) return cursor
  return {
    x: Math.round(bounds.x + bounds.width / 2),
    y: bounds.y
  }
}

function resolveMenuBounds(
  anchor: { x: number; y: number },
  size: { width: number; height: number }
): { x: number; y: number; width: number; height: number } {
  const display = screen.getDisplayNearestPoint(anchor)
  const area = display.workArea
  const normalized = normalizeMenuSize(size)
  const width = normalized.width
  const height = normalized.height

  const nearBottom = anchor.y > area.y + area.height * 0.55

  let top = nearBottom ? anchor.y - height - TRAY_GAP : anchor.y + TRAY_GAP
  let left = anchor.x - Math.round(width / 2)

  if (left + width > area.x + area.width - EDGE_MARGIN) {
    left = area.x + area.width - width - EDGE_MARGIN
  }
  if (left < area.x + EDGE_MARGIN) left = area.x + EDGE_MARGIN
  if (top + height > area.y + area.height - EDGE_MARGIN) {
    top = area.y + area.height - height - EDGE_MARGIN
  }
  if (top < area.y + EDGE_MARGIN) top = area.y + EDGE_MARGIN

  return {
    x: Math.round(left),
    y: Math.round(top),
    width,
    height
  }
}

export function isTrayMenuWindowOpen(): boolean {
  return menuWin !== null && !menuWin.isDestroyed()
}

export function hideTrayMenuWindow(): void {
  clearBlurHideTimer()
  clearLayoutFallbackTimer()
  if (!menuWin || menuWin.isDestroyed()) return
  menuWin.hide()
}

export function closeTrayMenuForAppExit(): void {
  clearBlurHideTimer()
  clearLayoutFallbackTimer()
  if (!menuWin || menuWin.isDestroyed()) return
  menuWin.destroy()
  menuWin = null
}

export function applyTrayMenuLayout(size: { width: number; height: number }): void {
  if (!menuWin || menuWin.isDestroyed()) return
  clearLayoutFallbackTimer()
  suppressBlurHideUntil = Date.now() + 400
  applyTrayMenuWindowChrome(menuWin)
  const bounds = resolveMenuBounds(pendingAnchor, normalizeMenuSize(size))
  menuWin.setBounds(bounds)
  if (!menuWin.isVisible()) menuWin.show()
  menuWin.focus()
}

function attachWindowHandlers(win: BrowserWindow): void {
  win.on('closed', () => {
    menuWin = null
    clearBlurHideTimer()
  })

  win.on('blur', () => {
    if (Date.now() < suppressBlurHideUntil) return
    clearBlurHideTimer()
    blurHideTimer = setTimeout(() => {
      if (!menuWin || menuWin.isDestroyed()) return
      if (Date.now() < suppressBlurHideUntil) return
      if (!menuWin.isFocused()) hideTrayMenuWindow()
    }, 200)
  })
}

function createMenuWindow(): BrowserWindow {
  const appIcon = resolveAppLogoPath(256)
  const win = new BrowserWindow({
    x: -32000,
    y: -32000,
    width: 1,
    height: 1,
    show: false,
    frame: false,
    resizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    autoHideMenuBar: true,
    transparent: false,
    backgroundColor: trayMenuBackgroundColor(),
    hasShadow: false,
    thickFrame: false,
    roundedCorners: false,
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
  attachWindowHandlers(win)
  applyTrayMenuWindowChrome(win)
  return win
}

async function waitForTrayMenuRenderer(win: BrowserWindow): Promise<void> {
  if (win.webContents.isLoading()) {
    await new Promise<void>((resolve) => {
      win.webContents.once('did-finish-load', () => resolve())
    })
  }
  // 等待 Vue 挂载并注册 onTrayMenuShow
  await new Promise((resolve) => setTimeout(resolve, 80))
}

/** 屏幕外放大，供渲染进程量出菜单真实宽高后再收紧 */
function stageMenuWindowForLayout(win: BrowserWindow): void {
  win.setBounds({
    x: -32000,
    y: -32000,
    width: MENU_LAYOUT_STAGE_WIDTH,
    height: MENU_LAYOUT_STAGE_HEIGHT
  })
}

function notifyTrayMenuShow(): void {
  if (!menuWin || menuWin.isDestroyed()) return
  stageMenuWindowForLayout(menuWin)
  menuWin.webContents.send('tray-menu:show')
  scheduleLayoutFallback()
}

export async function showTrayMenuWindow(anchor?: { x: number; y: number }): Promise<void> {
  pendingAnchor = anchor ?? resolveTrayMenuAnchor()
  clearLayoutFallbackTimer()
  suppressBlurHideUntil = Date.now() + 500

  if (menuWin && !menuWin.isDestroyed()) {
    applyTrayMenuWindowChrome(menuWin)
    menuWin.hide()
    notifyTrayMenuShow()
    return
  }

  menuWin = createMenuWindow()
  await loadTrayMenuRenderer(menuWin)
  await waitForTrayMenuRenderer(menuWin)
  notifyTrayMenuShow()
}
