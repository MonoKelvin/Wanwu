import { app, BrowserWindow, nativeImage, screen, type Point, type Rectangle } from 'electron'
import { existsSync } from 'fs'
import { join } from 'path'
import type { NoteItem } from '../../../src/shared/types/notes'
import { resolveAppLogoPath } from '../media/appAssets'
import { getMainWindow } from '../../windowState'
import {
  clearNotePopoutUserDismissed,
  ensureNotePopoutSession,
  getNotePopoutSession,
  isNotePopoutUserDismissed,
  initNotePopoutPersistence,
  listNotePopoutScopeIds,
  markNotePopoutUserDismissed,
  patchNotePopoutSession,
  shouldRestorePopoutSession
} from './notePopoutPersistence'
import { isPlaceholderPopoutBounds, resolvePopoutBoundsNearCursor } from './notePopoutPlacement'

type PopoutVisibilitySource = 'user' | 'batch'

const POPOUT_WIDTH = 320
const POPOUT_HEIGHT = 360
const POPOUT_MIN_WIDTH = 240
const POPOUT_MIN_HEIGHT = 260

interface PopoutEntry {
  win: BrowserWindow
  alwaysOnTop: boolean
  hidden: boolean
}

const popouts = new Map<string, PopoutEntry>()
const boundsSaveTimers = new Map<string, ReturnType<typeof setTimeout>>()
let staggerIndex = 0
let persistenceBasePath: string | null = null

export function configureNotePopoutPersistence(basePath: string): void {
  persistenceBasePath = basePath
  initNotePopoutPersistence(basePath)
}

function isDev(): boolean {
  return !app.isPackaged
}

function rendererIndexPath(): string {
  return join(__dirname, '../renderer/index.html')
}

function popoutHash(noteId: string): string {
  return `/note-popout/${encodeURIComponent(noteId)}`
}

async function loadPopoutRenderer(win: BrowserWindow, noteId: string): Promise<void> {
  const hash = popoutHash(noteId)
  if (isDev() && process.env.ELECTRON_RENDERER_URL) {
    const base = process.env.ELECTRON_RENDERER_URL.replace(/\/$/, '')
    await win.loadURL(`${base}/#${hash}`)
    return
  }
  const file = rendererIndexPath()
  if (!existsSync(file)) {
    throw new Error(`renderer not found: ${file}`)
  }
  await win.loadFile(file, { hash })
}

function cursorPopoutBounds(anchor?: Point): Rectangle {
  const bounds = resolvePopoutBoundsNearCursor(anchor ?? screen.getCursorScreenPoint(), {
    width: POPOUT_WIDTH,
    height: POPOUT_HEIGHT,
    staggerIndex: staggerIndex
  })
  staggerIndex += 1
  return bounds
}

function rectIntersectsWorkArea(rect: Rectangle, workArea: Rectangle): boolean {
  const rRight = rect.x + rect.width
  const rBottom = rect.y + rect.height
  const wRight = workArea.x + workArea.width
  const wBottom = workArea.y + workArea.height
  return rect.x < wRight && rRight > workArea.x && rect.y < wBottom && rBottom > workArea.y
}

/** 上次保存的窗口若已不在可见工作区内，则回退默认位置 */
function ensurePopoutBoundsVisible(bounds: Rectangle): Rectangle {
  for (const display of screen.getAllDisplays()) {
    if (rectIntersectsWorkArea(bounds, display.workArea)) {
      return bounds
    }
  }
  return cursorPopoutBounds()
}

function resolveSavedPopoutBounds(noteId: string): Rectangle | null {
  const saved = getNotePopoutSession(noteId)?.bounds
  if (!saved || isPlaceholderPopoutBounds(saved)) return null
  return ensurePopoutBoundsVisible(saved)
}

function resolvePopoutBoundsForOpen(
  noteId: string,
  source: PopoutVisibilitySource,
  anchor?: Point
): Rectangle {
  if (source === 'user') {
    return cursorPopoutBounds(anchor)
  }
  return resolveSavedPopoutBounds(noteId) ?? cursorPopoutBounds(anchor)
}

function persistSessionVisibilityState(noteId: string): void {
  if (!persistenceBasePath) return
  const entry = popouts.get(noteId)
  const lastSessionOpen = Boolean(entry && !entry.win.isDestroyed())
  const lastSessionVisible = isNotePopoutVisible(noteId)
  patchNotePopoutSession(noteId, { lastSessionOpen, lastSessionVisible })
}

function syncSessionVisibilityState(noteId: string): void {
  if (!persistenceBasePath) return
  if (popouts.has(noteId)) {
    persistSessionVisibilityState(noteId)
  }
}

function captureWindowBounds(win: BrowserWindow): Rectangle {
  const bounds = win.getBounds()
  return {
    x: bounds.x,
    y: bounds.y,
    width: Math.max(bounds.width, POPOUT_MIN_WIDTH),
    height: Math.max(bounds.height, POPOUT_MIN_HEIGHT)
  }
}

function persistEntryState(noteId: string, entry: PopoutEntry, scrollTop?: number): void {
  if (!persistenceBasePath) return
  const patch: Parameters<typeof patchNotePopoutSession>[1] = {
    bounds: captureWindowBounds(entry.win),
    alwaysOnTop: entry.alwaysOnTop
  }
  if (typeof scrollTop === 'number') {
    patch.scrollTop = scrollTop
  }
  patchNotePopoutSession(noteId, patch)
}

function scheduleBoundsPersist(noteId: string, entry: PopoutEntry): void {
  const prev = boundsSaveTimers.get(noteId)
  if (prev) clearTimeout(prev)
  boundsSaveTimers.set(
    noteId,
    setTimeout(() => {
      boundsSaveTimers.delete(noteId)
      if (entry.win.isDestroyed()) return
      persistEntryState(noteId, entry)
    }, 280)
  )
}

function attachPopoutWindowPersistence(noteId: string, entry: PopoutEntry): void {
  const persistBounds = () => scheduleBoundsPersist(noteId, entry)
  entry.win.on('move', persistBounds)
  entry.win.on('resize', persistBounds)
  entry.win.on('close', () => {
    const timer = boundsSaveTimers.get(noteId)
    if (timer) clearTimeout(timer)
    boundsSaveTimers.delete(noteId)
  })
}

function restorePopoutScroll(noteId: string, win: BrowserWindow): void {
  const scrollTop = getNotePopoutSession(noteId)?.scrollTop ?? 0
  if (!win.isDestroyed()) {
    win.webContents.send('notes:popout-restore-scroll', { scrollTop })
  }
}

function notifyPopoutState(noteId: string, open: boolean, visible: boolean): void {
  broadcastToAllWindows('notes:popout-state', { noteId, open, visible })
}

function notifyPopoutFocused(noteId: string): void {
  const main = getMainWindow()
  if (main && !main.isDestroyed()) {
    main.webContents.send('notes:popout-focused', { noteId })
  }
}

function attachPopoutFocusSync(noteId: string, entry: PopoutEntry): void {
  entry.win.on('focus', () => {
    notifyPopoutFocused(noteId)
  })
}

function createPopoutOptions(
  noteId: string,
  bounds: Rectangle
): Electron.BrowserWindowConstructorOptions {
  const saved = getNotePopoutSession(noteId)
  const preloadMjs = join(__dirname, '../preload/index.mjs')
  const preloadJs = join(__dirname, '../preload/index.js')
  const preload = existsSync(preloadMjs) ? preloadMjs : preloadJs
  const appIcon = resolveAppLogoPath(256)

  return {
    ...bounds,
    minWidth: POPOUT_MIN_WIDTH,
    minHeight: POPOUT_MIN_HEIGHT,
    show: false,
    frame: false,
    title: '便笺',
    ...(appIcon ? { icon: appIcon } : {}),
    autoHideMenuBar: true,
    resizable: true,
    thickFrame: process.platform === 'win32',
    skipTaskbar: false,
    alwaysOnTop: saved?.alwaysOnTop ?? true,
    webPreferences: {
      preload,
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  }
}

export function broadcastToAllWindows(channel: string, payload: unknown): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send(channel, payload)
    }
  }
}

export function broadcastNoteChanged(note: NoteItem): void {
  broadcastToAllWindows('notes:changed', note)
}

export function broadcastNoteDeleted(noteId: string): void {
  broadcastToAllWindows('notes:deleted', noteId)
}

export function broadcastNoteImageRemoved(imageId: string): void {
  broadcastToAllWindows('notes:image-removed', imageId)
}

export function isNotePopoutOpen(noteId: string): boolean {
  const entry = popouts.get(noteId)
  return Boolean(entry && !entry.win.isDestroyed())
}

export function isNotePopoutVisible(noteId: string): boolean {
  const entry = popouts.get(noteId)
  // 以 hidden 标记为准；新建窗口在 ready-to-show 前 hidden=false 即视为可见意图
  return Boolean(entry && !entry.win.isDestroyed() && !entry.hidden)
}

export function listOpenNotePopouts(): string[] {
  return [...popouts.keys()].filter((id) => isNotePopoutOpen(id))
}

export function getNotePopoutAlwaysOnTop(noteId: string): boolean {
  return popouts.get(noteId)?.alwaysOnTop ?? getNotePopoutSession(noteId)?.alwaysOnTop ?? false
}

export function saveNotePopoutScroll(noteId: string, scrollTop: number): void {
  if (!isNotePopoutOpen(noteId)) return
  patchNotePopoutSession(noteId, { scrollTop: Math.max(0, scrollTop) })
}

export function openNotePopout(
  noteId: string,
  source: PopoutVisibilitySource = 'user',
  anchor?: Point
): void {
  if (source === 'user') {
    clearNotePopoutUserDismissed(noteId)
  }

  const existing = popouts.get(noteId)
  if (existing && !existing.win.isDestroyed()) {
    existing.hidden = false
    if (!existing.win.isVisible()) existing.win.show()
    existing.win.focus()
    restorePopoutScroll(noteId, existing.win)
    notifyPopoutState(noteId, true, true)
    syncSessionVisibilityState(noteId)
    return
  }

  const bounds = resolvePopoutBoundsForOpen(noteId, source, anchor)
  ensureNotePopoutSession(noteId, {
    bounds,
    alwaysOnTop: true,
    scrollTop: getNotePopoutSession(noteId)?.scrollTop ?? 0
  })
  patchNotePopoutSession(noteId, { bounds })

  const saved = getNotePopoutSession(noteId)
  const win = new BrowserWindow(createPopoutOptions(noteId, bounds))
  const appIcon = resolveAppLogoPath(256)
  if (appIcon) {
    const image = nativeImage.createFromPath(appIcon)
    if (!image.isEmpty()) win.setIcon(image)
  }
  const alwaysOnTop = saved?.alwaysOnTop ?? true
  const entry: PopoutEntry = {
    win,
    alwaysOnTop,
    hidden: false
  }
  popouts.set(noteId, entry)
  win.setAlwaysOnTop(alwaysOnTop)
  attachPopoutWindowPersistence(noteId, entry)
  attachPopoutFocusSync(noteId, entry)

  win.on('close', () => {
    const current = popouts.get(noteId)
    if (current) persistEntryState(noteId, current)
  })

  win.once('ready-to-show', () => {
    if (!win.isDestroyed()) {
      win.show()
      restorePopoutScroll(noteId, win)
      syncSessionVisibilityState(noteId)
      notifyPopoutState(noteId, true, true)
    }
  })

  void loadPopoutRenderer(win, noteId).catch((err) => {
    console.error('[wanwu] note popout load failed', noteId, err)
    if (!win.isDestroyed()) win.show()
  })

  win.on('closed', () => {
    popouts.delete(noteId)
    notifyPopoutState(noteId, false, false)
  })

  notifyPopoutState(noteId, true, false)
}

export function hideNotePopout(
  noteId: string,
  scrollTop?: number,
  source: PopoutVisibilitySource = 'user'
): void {
  const entry = popouts.get(noteId)
  if (!entry || entry.win.isDestroyed()) {
    if (source === 'user') {
      markNotePopoutUserDismissed(noteId)
    }
    return
  }
  persistEntryState(noteId, entry, scrollTop)
  entry.hidden = true
  entry.win.hide()
  if (source === 'user') {
    markNotePopoutUserDismissed(noteId)
  } else {
    syncSessionVisibilityState(noteId)
  }
  notifyPopoutState(noteId, true, false)
}

export function showNotePopout(
  noteId: string,
  source: PopoutVisibilitySource = 'user',
  anchor?: Point
): void {
  if (isNotePopoutUserDismissed(noteId) && source === 'batch') {
    return
  }

  const entry = popouts.get(noteId)
  if (entry && !entry.win.isDestroyed()) {
    if (source === 'user') {
      clearNotePopoutUserDismissed(noteId)
    }
    entry.hidden = false
    entry.win.show()
    entry.win.focus()
    restorePopoutScroll(noteId, entry.win)
    notifyPopoutState(noteId, true, true)
    syncSessionVisibilityState(noteId)
    return
  }
  openNotePopout(noteId, source, anchor)
}

function flushBoundsSaveTimers(): void {
  for (const timer of boundsSaveTimers.values()) {
    clearTimeout(timer)
  }
  boundsSaveTimers.clear()
}

function destroyPopoutEntry(noteId: string, entry: PopoutEntry, scrollTop?: number): void {
  if (entry.win.isDestroyed()) {
    popouts.delete(noteId)
    return
  }
  if (typeof scrollTop === 'number') {
    persistEntryState(noteId, entry, scrollTop)
  } else {
    persistEntryState(noteId, entry)
  }
  entry.win.destroy()
  popouts.delete(noteId)
}

export function closeNotePopout(noteId: string, scrollTop?: number): void {
  const entry = popouts.get(noteId)
  if (!entry || entry.win.isDestroyed()) {
    popouts.delete(noteId)
    markNotePopoutUserDismissed(noteId)
    return
  }
  if (typeof scrollTop === 'number') {
    persistEntryState(noteId, entry, scrollTop)
  } else {
    persistEntryState(noteId, entry)
  }
  markNotePopoutUserDismissed(noteId)
  entry.win.close()
}

export function closeNotePopoutFromSender(
  senderWebContentsId: number,
  scrollTop?: number
): boolean {
  for (const [noteId, entry] of popouts) {
    if (entry.win.webContents.id === senderWebContentsId) {
      closeNotePopout(noteId, scrollTop)
      return true
    }
  }
  return false
}

export function toggleNotePopoutVisibility(
  noteId: string,
  scrollTop?: number,
  anchor?: Point
): { open: boolean; visible: boolean } {
  const entry = popouts.get(noteId)
  if (entry && !entry.win.isDestroyed()) {
    if (!entry.hidden && entry.win.isVisible()) {
      hideNotePopout(noteId, scrollTop, 'user')
      return { open: true, visible: false }
    }
    if (isNotePopoutUserDismissed(noteId)) {
      showNotePopout(noteId, 'user', anchor)
      return { open: true, visible: true }
    }
    // 批量隐藏后再次点「隐藏」：锁定为手动关闭，不参与后续「显示全部」
    markNotePopoutUserDismissed(noteId)
    notifyPopoutState(noteId, true, false)
    return { open: true, visible: false }
  }
  openNotePopout(noteId, 'user', anchor)
  return { open: true, visible: true }
}

/** @deprecated 使用 toggleNotePopoutVisibility */
export function toggleNotePopout(noteId: string): { open: boolean } {
  const result = toggleNotePopoutVisibility(noteId)
  return { open: result.open && result.visible }
}

export function toggleNotePopoutAlwaysOnTop(noteId: string): { alwaysOnTop: boolean } {
  const entry = popouts.get(noteId)
  if (!entry || entry.win.isDestroyed()) {
    return { alwaysOnTop: false }
  }
  entry.alwaysOnTop = !entry.alwaysOnTop
  entry.win.setAlwaysOnTop(entry.alwaysOnTop)
  patchNotePopoutSession(noteId, { alwaysOnTop: entry.alwaysOnTop })
  return { alwaysOnTop: entry.alwaysOnTop }
}

/** 退出应用时关闭全部独立窗口（含隐藏），并落盘位置/大小等记忆 */
export function closeAllNotePopoutsForAppExit(): void {
  flushBoundsSaveTimers()
  for (const noteId of [...popouts.keys()]) {
    const entry = popouts.get(noteId)
    if (!entry) continue
    persistEntryState(noteId, entry)
    persistSessionVisibilityState(noteId)
    destroyPopoutEntry(noteId, entry)
  }
}

export function closeAllNotePopouts(): void {
  closeAllNotePopoutsForAppExit()
}

export function getPopoutsBatchState(): {
  scopeCount: number
  openCount: number
  visibleCount: number
} {
  const scopeIds = listNotePopoutScopeIds()
  const scopeSet = new Set(scopeIds)
  let visibleCount = 0
  for (const id of scopeIds) {
    if (isNotePopoutVisible(id)) visibleCount += 1
  }
  const openCount = listOpenNotePopouts().filter((id) => scopeSet.has(id)).length
  return { scopeCount: scopeIds.length, openCount, visibleCount }
}

export function hideAllNotePopouts(): {
  scopeCount: number
  openCount: number
  visibleCount: number
} {
  for (const noteId of listNotePopoutScopeIds()) {
    if (!isNotePopoutOpen(noteId)) continue
    if (isNotePopoutVisible(noteId)) {
      hideNotePopout(noteId, undefined, 'batch')
    }
  }
  return getPopoutsBatchState()
}

export function showAllNotePopouts(): {
  scopeCount: number
  openCount: number
  visibleCount: number
} {
  for (const noteId of listNotePopoutScopeIds()) {
    if (isNotePopoutUserDismissed(noteId)) continue
    showNotePopout(noteId, 'batch')
  }
  return getPopoutsBatchState()
}

/** 按上次退出时的会话状态自动还原便笺独立窗口（跳过用户手动关闭的） */
export function restoreNotePopoutsFromSession(): { restoredCount: number } {
  let restoredCount = 0
  for (const noteId of listNotePopoutScopeIds()) {
    if (!shouldRestorePopoutSession(noteId)) continue
    if (isNotePopoutOpen(noteId)) continue

    const session = getNotePopoutSession(noteId)
    const restoreVisible = session?.lastSessionVisible !== false

    if (restoreVisible) {
      showNotePopout(noteId, 'batch')
    } else {
      openNotePopout(noteId, 'batch')
      hideNotePopout(noteId, undefined, 'batch')
    }
    restoredCount += 1
  }
  return { restoredCount }
}

/** 批量显示/隐藏用户曾手动打开过的独立便笺；单条手动显示/隐藏优先级更高 */
export function toggleAllNotePopoutsVisibility(): {
  scopeCount: number
  openCount: number
  visibleCount: number
} {
  const state = getPopoutsBatchState()
  if (state.scopeCount === 0) return state
  if (state.visibleCount > 0) return hideAllNotePopouts()
  return showAllNotePopouts()
}

let appQuitPopoutsHandled = false

export function attachMainWindowNotePopoutCleanup(mainWindow: BrowserWindow): void {
  mainWindow.on('close', () => {
    closeAllNotePopoutsForAppExit()
  })
}

export function registerNotePopoutAppLifecycle(): void {
  app.on('before-quit', (event) => {
    if (appQuitPopoutsHandled) return
    if (popouts.size === 0) return
    event.preventDefault()
    appQuitPopoutsHandled = true
    closeAllNotePopoutsForAppExit()
    app.quit()
  })
}
