import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { screen, type BrowserWindow, type Rectangle } from 'electron'
import { normalizeAppSettings } from '../data/settings'
import type { WindowStateMode } from '../../../src/shared/types/settings'

export const DEFAULT_WINDOW_SIZE = {
  width: 1080,
  height: 720,
  minWidth: 800,
  minHeight: 600
} as const

export interface PersistedWindowState {
  bounds: Rectangle
  isMaximized: boolean
  isMinimized?: boolean
  displayId?: number
}

function stateFilePath(basePath: string): string {
  return join(basePath, 'window-state.json')
}

function readStateFile(basePath: string): PersistedWindowState | null {
  const file = stateFilePath(basePath)
  if (!existsSync(file)) return null
  try {
    const raw = JSON.parse(readFileSync(file, 'utf-8')) as Partial<PersistedWindowState>
    const b = raw.bounds
    if (
      !b ||
      typeof b.x !== 'number' ||
      typeof b.y !== 'number' ||
      typeof b.width !== 'number' ||
      typeof b.height !== 'number'
    ) {
      return null
    }
    return {
      bounds: {
        x: b.x,
        y: b.y,
        width: Math.max(b.width, DEFAULT_WINDOW_SIZE.minWidth),
        height: Math.max(b.height, DEFAULT_WINDOW_SIZE.minHeight)
      },
      isMaximized: Boolean(raw.isMaximized),
      isMinimized: Boolean(raw.isMinimized),
      displayId: typeof raw.displayId === 'number' ? raw.displayId : undefined
    }
  } catch {
    return null
  }
}

function writeStateFile(basePath: string, state: PersistedWindowState): void {
  mkdirSync(basePath, { recursive: true })
  writeFileSync(stateFilePath(basePath), JSON.stringify(state, null, 2), 'utf-8')
}

function defaultCenteredBounds(): Rectangle {
  const { width, height } = DEFAULT_WINDOW_SIZE
  const { workArea } = screen.getPrimaryDisplay()
  return {
    x: Math.round(workArea.x + (workArea.width - width) / 2),
    y: Math.round(workArea.y + (workArea.height - height) / 2),
    width,
    height
  }
}

function rectIntersectsWorkArea(rect: Rectangle, workArea: Rectangle): boolean {
  const rRight = rect.x + rect.width
  const rBottom = rect.y + rect.height
  const wRight = workArea.x + workArea.width
  const wBottom = workArea.y + workArea.height
  return rect.x < wRight && rRight > workArea.x && rect.y < wBottom && rBottom > workArea.y
}

function ensureOnVisibleDisplay(bounds: Rectangle, displayId?: number): Rectangle {
  const displays = screen.getAllDisplays()
  if (displayId != null) {
    const target = displays.find((d) => d.id === displayId)
    if (target && rectIntersectsWorkArea(bounds, target.workArea)) {
      return bounds
    }
  }
  for (const d of displays) {
    if (rectIntersectsWorkArea(bounds, d.workArea)) return bounds
  }
  return defaultCenteredBounds()
}

export function captureWindowState(win: BrowserWindow): PersistedWindowState {
  const bounds = win.isMaximized() ? win.getNormalBounds() : win.getBounds()
  const display = screen.getDisplayMatching(bounds)
  return {
    bounds,
    isMaximized: win.isMaximized(),
    isMinimized: win.isMinimized(),
    displayId: display.id
  }
}

export function saveWindowState(basePath: string, win: BrowserWindow): void {
  writeStateFile(basePath, captureWindowState(win))
}

export function getInitialWindowBounds(mode: WindowStateMode, basePath: string): Rectangle {
  if (mode === 'remember') {
    const saved = readStateFile(basePath)
    if (saved) {
      return ensureOnVisibleDisplay(saved.bounds, saved.displayId)
    }
  }
  return defaultCenteredBounds()
}

export function shouldRestoreMaximized(mode: WindowStateMode, basePath: string): boolean {
  if (mode === 'maximize') return true
  if (mode !== 'remember') return false
  return readStateFile(basePath)?.isMaximized ?? false
}

export function shouldRestoreMinimized(mode: WindowStateMode, basePath: string): boolean {
  if (mode !== 'remember') return false
  return readStateFile(basePath)?.isMinimized ?? false
}

export type WindowPersistenceOptions = {
  getBasePath: () => string
  getMode: () => WindowStateMode
}

let saveTimer: ReturnType<typeof setTimeout> | null = null

function scheduleSave(win: BrowserWindow, options: WindowPersistenceOptions): void {
  if (options.getMode() !== 'remember') return
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    saveTimer = null
    if (win.isDestroyed()) return
    saveWindowState(options.getBasePath(), win)
  }, 400)
}

export function attachWindowStatePersistence(
  win: BrowserWindow,
  options: WindowPersistenceOptions
): void {
  const persistNow = () => {
    if (options.getMode() !== 'remember' || win.isDestroyed()) return
    saveWindowState(options.getBasePath(), win)
  }

  win.on('resize', () => scheduleSave(win, options))
  win.on('move', () => scheduleSave(win, options))
  win.on('maximize', () => scheduleSave(win, options))
  win.on('unmaximize', () => scheduleSave(win, options))
  win.on('close', persistNow)
}

export function applyStartupWindowState(
  win: BrowserWindow,
  mode: WindowStateMode,
  basePath: string
): void {
  if (shouldRestoreMaximized(mode, basePath)) {
    win.maximize()
  } else if (shouldRestoreMinimized(mode, basePath)) {
    win.minimize()
  }
}

/** 从数据库读取窗口状态模式（主进程启动用） */
export function readWindowStateModeFromSettings(
  getSettings: () => Record<string, unknown> | undefined
): WindowStateMode {
  return normalizeAppSettings(getSettings() ?? {}).windowStateMode
}
