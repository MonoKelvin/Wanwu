import {
  clipboard,
  globalShortcut,
  nativeImage,
  Tray
} from 'electron'
import type { AppServices } from '../../../../../electron/ipc/types'
import { createMainProcessContext } from '../../../../../electron/app/mainProcessContext'
import { broadcastToAllWindows } from '../../../../../electron/app/windowBroadcast'
import { mergeAppSettings, normalizeAppSettings } from '@shared/settings/normalizeAppSettings'
import { resolveAppLogoPath } from '../../../../../electron/services/media/appAssets'
import { requestAppQuit } from '../../../../../electron/services/app/appQuit'
import { getMainWindow } from '../../../../../electron/windowState'
import { registerFrameworkLifecycleContributor } from '../../../../../electron/app/frameworkLifecycleBridge'
import { getModuleRuntimeService } from '@shared/module-bridge/mainProcessRegistry'
import { QUICK_ACCESS_MODULE_ID } from '@modules/quick-access/domain/moduleId'
import { ILLUSTRATED_HANDBOOK_MODULE_ID } from '@modules/library/illustrated-handbook/domain/moduleId'
import type { AppSettings } from '@shared/types/settings'
import { readQuickAccessModuleSettings } from '@modules/quick-access/domain/settings'
import type {
  ClipboardAssistPayload,
  QuickAccessOpenTarget,
  QuickAccessTrayStatus
} from '@shared/types/quickAccess'
import type { TrayMenuAction } from '@shared/types/trayMenu'
import { clipboardLibraryHints, searchHitsByKind, unifiedSearch } from './unifiedSearch'
import { readRssTrayCounts, emptyTrayStatus } from '@modules/quick-access/domain/trayStatus'
import {
  closeDailyWidgetForAppExit,
  hideDailyWidget,
  isDailyWidgetOpen,
  showDailyWidget
} from './dailyWidgetWindow'
import { aggregateTrayStatus } from '../trayStatus'
import {
  bindTrayMenuContext,
  closeTrayMenuForAppExit,
  hideTrayMenuWindow,
  resolveTrayMenuAnchor,
  showTrayMenuWindow,
  applyTrayMenuLayout
} from './trayMenuWindow'

const PALETTE_ACCELERATOR = 'CommandOrControl+Shift+P'
const CLIPBOARD_POLL_MS = 900

let servicesRef: AppServices | null = null
let tray: Tray | null = null
let clipboardTimer: ReturnType<typeof setInterval> | null = null
let lastClipboardText = ''
let appIsQuitting = false

export function isAppQuittingState(): boolean {
  return appIsQuitting
}

export function markAppQuittingState(): void {
  appIsQuitting = true
}

export function isTrayActiveState(): boolean {
  return tray !== null
}

export function ensureTrayForWindowHide(): void {
  if (!tray) setupTray()
  const settings = normalizeAppSettings(servicesRef?.userData?.getAppSettings() ?? {})
  if (settings.trayEnabled || !servicesRef?.userData) return
  const next = mergeAppSettings({ trayEnabled: true }, settings)
  servicesRef.userData.updateAppSettings(next)
  broadcastToAllWindows('app:settings-changed', next)
  syncQuickAccessFromSettings(next)
}

function trayIconImage(): Electron.NativeImage | undefined {
  const path = resolveAppLogoPath(256)
  if (!path) return undefined
  const img = nativeImage.createFromPath(path)
  if (img.isEmpty()) return undefined
  return process.platform === 'darwin' ? img.resize({ width: 22, height: 22 }) : img.resize({ width: 16, height: 16 })
}

export function focusMainWindowFromQuickAccess(): void {
  const win = getMainWindow()
  if (!win || win.isDestroyed()) return
  if (!win.isVisible()) win.show()
  if (win.isMinimized()) win.restore()
  win.focus()
}

function sendTogglePalette(): void {
  focusMainWindowFromQuickAccess()
  broadcastToAllWindows('quick-access:toggle-palette', undefined)
}

function sendOpenTarget(target: QuickAccessOpenTarget): void {
  focusMainWindowFromQuickAccess()
  broadcastToAllWindows('quick-access:open-target', target)
}

async function buildTrayStatus(): Promise<QuickAccessTrayStatus> {
  if (!servicesRef) return emptyTrayStatus()
  return aggregateTrayStatus(createMainProcessContext(servicesRef))
}

async function syncTrayTooltip(): Promise<void> {
  if (!tray) return
  const status = await buildTrayStatus()
  const { entryCount, feedCount } = readRssTrayCounts(status)
  const rssLabel =
    feedCount > 0 ? `RSS 文章 ${entryCount} 篇 / ${feedCount} 源` : 'RSS：暂无订阅'
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
      sendOpenTarget({ kind: 'rss', id: 'rss-home' })
      break
    case 'focus-main':
      focusMainWindowFromQuickAccess()
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
      requestAppQuit()
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
  if (!icon) {
    console.warn('[wanwu] tray icon not found; skip creating system tray')
    return
  }
  destroyTray()
  tray = new Tray(icon)
  bindTrayMenuContext(servicesRef, tray)
  tray.setContextMenu(null)
  tray.on('double-click', () => focusMainWindowFromQuickAccess())
  tray.on('click', (event) => {
    if (isTrayContextMenuEvent(event)) {
      openTrayContextMenu()
      return
    }
    focusMainWindowFromQuickAccess()
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
      const quickAccess = readQuickAccessModuleSettings(settings)
      if (!quickAccess.clipboardAssistEnabled || !servicesRef) return

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

export function bindQuickAccessServices(services: AppServices): void {
  servicesRef = services
  appIsQuitting = false
}

export function syncQuickAccessFromSettings(override?: AppSettings): void {
  const settings =
    override ?? normalizeAppSettings(servicesRef?.userData?.getAppSettings() ?? {})

  const quickAccess = readQuickAccessModuleSettings(settings)

  registerGlobalShortcut()

  if (settings.trayEnabled) {
    setupTray()
  } else {
    destroyTray()
  }

  if (quickAccess.clipboardAssistEnabled) {
    startClipboardWatch()
  } else {
    stopClipboardWatch()
  }

  if (quickAccess.dailyWidgetEnabled) {
    void showDailyWidget()
  } else {
    hideDailyWidget()
  }

  void syncTrayTooltip()
}

export function disposeQuickAccessRuntime(): void {
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
  kind: import('@shared/types/quickAccess').QuickAccessHitKind,
  query: string
) {
  if (!servicesRef) return []
  return searchHitsByKind(servicesRef, kind, query)
}

export function openDailyInMain(): void {
  if (!servicesRef) return
  const ctx = createMainProcessContext(servicesRef)
  const library = getModuleRuntimeService<{ pickDailyItem(): { id: string } | null }>(
    ctx,
    ILLUSTRATED_HANDBOOK_MODULE_ID
  )
  const daily = library?.pickDailyItem()
  if (!daily) return
  sendOpenTarget({
    kind: 'library',
    id: daily.id,
    payload: { itemSource: 'library', itemId: daily.id }
  })
}

export function registerQuickAccessLifecycleHooks(): void {
  registerFrameworkLifecycleContributor({
    id: QUICK_ACCESS_MODULE_ID,
    order: 0,
    isAppQuitting: isAppQuittingState,
    markAppQuitting: markAppQuittingState,
    isTrayActive: isTrayActiveState,
    ensureTrayForWindowHide,
    onBeforeAppQuit: disposeQuickAccessRuntime,
    onSettingsSync: syncQuickAccessFromSettings,
    focusMainWindow: focusMainWindowFromQuickAccess
  })
}

export { showDailyWidget, hideDailyWidget, isDailyWidgetOpen, applyTrayMenuLayout, hideTrayMenuWindow }
