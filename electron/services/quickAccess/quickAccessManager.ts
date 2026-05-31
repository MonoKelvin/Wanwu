import {
  app,
  clipboard,
  globalShortcut,
  nativeImage,
  Tray,
  type BrowserWindow
} from 'electron'
import type { AppServices } from '../../ipc/handlers'
import { mergeAppSettings, normalizeAppSettings } from '../data/settings'
import { resolveAppLogoPath } from '../media/appAssets'
import { getMainWindow } from '../../windowState'
import { broadcastToAllWindows } from '../notes/noteWindowManager'
import type {
  ClipboardAssistPayload,
  QuickAccessOpenTarget,
  QuickAccessTrayStatus
} from '../../../src/shared/types/quickAccess'
import { clipboardLibraryHints, searchHitsByKind, unifiedSearch } from './unifiedSearch'
import {
  closeDailyWidgetForAppExit,
  hideDailyWidget,
  isDailyWidgetOpen,
  showDailyWidget
} from './dailyWidgetWindow'
import { waitForLibraryBootstrap } from '../library/pack'
import { ensureRssSchema } from '../rss/schema'
import type { TrayMenuAction } from '../../../src/shared/types/trayMenu'
import {
  bindTrayMenuContext,
  closeTrayMenuForAppExit,
  hideTrayMenuWindow,
  resolveTrayMenuAnchor,
  showTrayMenuWindow
} from './trayMenuWindow'

const PALETTE_ACCELERATOR = 'CommandOrControl+Shift+P'
const CLIPBOARD_POLL_MS = 900

let servicesRef: AppServices | null = null
let tray: Tray | null = null
let clipboardTimer: ReturnType<typeof setInterval> | null = null
let lastClipboardText = ''
let appIsQuitting = false

export function isAppQuitting(): boolean {
  return appIsQuitting
}

export function markAppQuitting(): void {
  appIsQuitting = true
}

export function isTrayActive(): boolean {
  return tray !== null
}

/** 缩到托盘时确保图标存在，并同步开启「系统托盘」设置 */
export function ensureTrayForWindowHide(): void {
  if (!tray) setupTray()
  const settings = normalizeAppSettings(servicesRef?.userData?.getAppSettings() ?? {})
  if (settings.trayEnabled || !servicesRef?.userData) return
  const next = mergeAppSettings({ trayEnabled: true }, settings)
  servicesRef.userData.updateAppSettings(next)
  broadcastToAllWindows('app:settings-changed', next)
  syncQuickAccessFromSettings()
}

function trayIconImage(): Electron.NativeImage | undefined {
  const path = resolveAppLogoPath(256)
  if (!path) return undefined
  const img = nativeImage.createFromPath(path)
  if (img.isEmpty()) return undefined
  return process.platform === 'darwin' ? img.resize({ width: 22, height: 22 }) : img.resize({ width: 16, height: 16 })
}

export function focusMainWindow(): void {
  const win = getMainWindow()
  if (!win || win.isDestroyed()) return
  if (!win.isVisible()) win.show()
  if (win.isMinimized()) win.restore()
  win.focus()
}

function sendTogglePalette(): void {
  focusMainWindow()
  broadcastToAllWindows('quick-access:toggle-palette', undefined)
}

function sendOpenTarget(target: QuickAccessOpenTarget): void {
  focusMainWindow()
  broadcastToAllWindows('quick-access:open-target', target)
}

async function buildTrayStatus(): Promise<QuickAccessTrayStatus> {
  await waitForLibraryBootstrap()
  const daily = servicesRef?.library?.pickDailyItem() ?? null
  let rssEntryCount = 0
  let rssFeedCount = 0
  if (servicesRef?.db) {
    ensureRssSchema(servicesRef.db.getRssDb())
    const rssDb = servicesRef.db.getRssDb()
    rssEntryCount = (rssDb.prepare('SELECT COUNT(*) as c FROM rss_entries').get() as { c: number }).c
    rssFeedCount = (
      rssDb
        .prepare(`SELECT COUNT(*) as c FROM rss_feeds WHERE deleted_at IS NULL`)
        .get() as { c: number }
    ).c
  }
  return { daily, rssEntryCount, rssFeedCount }
}

async function syncTrayTooltip(): Promise<void> {
  if (!tray) return
  const status = await buildTrayStatus()
  const rssLabel =
    status.rssFeedCount > 0
      ? `RSS 文章 ${status.rssEntryCount} 篇 / ${status.rssFeedCount} 源`
      : 'RSS：暂无订阅'
  tray.setToolTip(
    status.daily ? `万物 · ${status.daily.name}` : `万物 · ${rssLabel}`
  )
}

function isTrayContextMenuEvent(event: unknown): boolean {
  const e = event as { button?: number; ctrlKey?: boolean }
  if (e.button === 2) return true
  return process.platform === 'darwin' && Boolean(e.ctrlKey)
}

function openTrayContextMenu(): void {
  void showTrayMenuWindow(resolveTrayMenuAnchor())
}

export function getTrayMenuContextForIpc() {
  return { dailyWidgetOpen: isDailyWidgetOpen() }
}

export function executeTrayMenuAction(action: TrayMenuAction): void {
  hideTrayMenuWindow()
  switch (action) {
    case 'open-daily':
      openDailyInMain()
      break
    case 'open-rss':
      sendOpenTarget({ kind: 'rss', id: 'rss-home', feedId: undefined })
      break
    case 'focus-main':
      focusMainWindow()
      break
    case 'toggle-daily-widget':
      void (async () => {
        if (isDailyWidgetOpen()) hideDailyWidget()
        else await showDailyWidget()
        void syncTrayTooltip()
      })()
      break
    case 'toggle-palette':
      sendTogglePalette()
      break
    case 'quit':
      markAppQuitting()
      app.quit()
      break
    default:
      break
  }
}

function destroyTray(): void {
  hideTrayMenuWindow()
  bindTrayMenuContext(servicesRef, null)
  if (tray) {
    tray.destroy()
    tray = null
  }
}

function setupTray(): void {
  const icon = trayIconImage()
  if (!icon) return
  destroyTray()
  tray = new Tray(icon)
  bindTrayMenuContext(servicesRef, tray)
  tray.setContextMenu(null)
  tray.on('double-click', () => focusMainWindow())
  tray.on('click', (event) => {
    if (isTrayContextMenuEvent(event)) {
      openTrayContextMenu()
      return
    }
    focusMainWindow()
  })
  tray.on('right-click', () => openTrayContextMenu())
  void syncTrayTooltip()
}

function stopClipboardWatch(): void {
  if (clipboardTimer) {
    clearInterval(clipboardTimer)
    clipboardTimer = null
  }
  lastClipboardText = ''
}

function startClipboardWatch(): void {
  stopClipboardWatch()
  clipboardTimer = setInterval(() => {
    void (async () => {
      const settings = normalizeAppSettings(servicesRef?.userData?.getAppSettings() ?? {})
      if (!settings.clipboardAssistEnabled || !servicesRef) return

      const text = clipboard.readText().trim()
      if (!text || text === lastClipboardText) return
      lastClipboardText = text

      const hits = await clipboardLibraryHints(servicesRef, text, 3)
      if (!hits.length) return

      const payload: ClipboardAssistPayload = { query: text, hits }
      const win = getMainWindow()
      if (win && !win.isDestroyed()) {
        win.webContents.send('quick-access:clipboard-matches', payload)
      }
    })()
  }, CLIPBOARD_POLL_MS)
}

function registerGlobalShortcut(): void {
  globalShortcut.unregister(PALETTE_ACCELERATOR)
  if (!globalShortcut.register(PALETTE_ACCELERATOR, sendTogglePalette)) {
    console.warn('[wanwu] failed to register global shortcut', PALETTE_ACCELERATOR)
  }
}

function unregisterGlobalShortcut(): void {
  globalShortcut.unregister(PALETTE_ACCELERATOR)
}


export function initQuickAccess(services: AppServices): void {
  servicesRef = services
  appIsQuitting = false
  syncQuickAccessFromSettings()
}

export function syncQuickAccessFromSettings(): void {
  const settings = normalizeAppSettings(servicesRef?.userData?.getAppSettings() ?? {})

  registerGlobalShortcut()

  if (settings.trayEnabled) {
    setupTray()
  } else {
    destroyTray()
  }

  if (settings.clipboardAssistEnabled) {
    startClipboardWatch()
  } else {
    stopClipboardWatch()
  }

  if (settings.dailyWidgetEnabled) {
    void showDailyWidget()
  } else {
    hideDailyWidget()
  }

  void syncTrayTooltip()
}

export function disposeQuickAccess(): void {
  appIsQuitting = true
  unregisterGlobalShortcut()
  stopClipboardWatch()
  destroyTray()
  hideDailyWidget()
  closeDailyWidgetForAppExit()
  closeTrayMenuForAppExit()
}

export async function getTrayStatusForIpc(): Promise<QuickAccessTrayStatus> {
  return buildTrayStatus()
}

export async function searchForIpc(query: string, limit?: number) {
  if (!servicesRef) return []
  return unifiedSearch(servicesRef, query, limit)
}

export async function searchByKindForIpc(
  kind: import('../../../src/shared/types/quickAccess').QuickAccessHitKind,
  query: string
) {
  if (!servicesRef) return []
  await waitForLibraryBootstrap()
  return searchHitsByKind(servicesRef, kind, query)
}

export function openDailyInMain(): void {
  void (async () => {
    await waitForLibraryBootstrap()
    const daily = servicesRef?.library?.pickDailyItem()
    if (!daily) return
    sendOpenTarget({
      kind: 'library',
      id: daily.id,
      itemSource: 'library',
      itemId: daily.id
    })
  })()
}

export { showDailyWidget, hideDailyWidget, isDailyWidgetOpen }
