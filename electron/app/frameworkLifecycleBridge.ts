import type { AppSettings } from '../../src/shared/types/settings'

/** 可选模块向框架注册的跨切面钩子（删除模块后回退为安全默认行为） */
export interface OptionalModuleHooks {
  isAppQuitting?: () => boolean
  markAppQuitting?: () => void
  isTrayActive?: () => boolean
  ensureTrayForWindowHide?: () => void
  disposeQuickAccess?: () => void
  syncQuickAccessFromSettings?: (settings?: AppSettings) => void
  focusMainWindow?: () => void
  waitForLibraryBootstrap?: () => Promise<void>
  closeAllNotePopoutsForAppExit?: () => void
  onMainWindowCreated?: (mainWindow: import('electron').BrowserWindow) => void
  registerNotePopoutLifecycle?: () => void
  consumeStartupNotices?: () => string[]
}

let hooks: OptionalModuleHooks = {}

export function registerOptionalModuleHooks(next: OptionalModuleHooks): void {
  hooks = { ...hooks, ...next }
}

export function clearOptionalModuleHooks(): void {
  hooks = {}
}

export function isAppQuitting(): boolean {
  return hooks.isAppQuitting?.() ?? false
}

export function markAppQuitting(): void {
  hooks.markAppQuitting?.()
}

export function isTrayActive(): boolean {
  return hooks.isTrayActive?.() ?? false
}

export function ensureTrayForWindowHide(): void {
  hooks.ensureTrayForWindowHide?.()
}

export function disposeQuickAccess(): void {
  hooks.disposeQuickAccess?.()
}

export function syncQuickAccessFromSettings(settings?: AppSettings): void {
  hooks.syncQuickAccessFromSettings?.(settings)
}

export function focusMainWindow(): void {
  hooks.focusMainWindow?.()
}

export function waitForLibraryBootstrap(): Promise<void> {
  return hooks.waitForLibraryBootstrap?.() ?? Promise.resolve()
}

export function closeAllNotePopoutsForAppExit(): void {
  hooks.closeAllNotePopoutsForAppExit?.()
}

export function notifyMainWindowCreated(mainWindow: import('electron').BrowserWindow): void {
  hooks.onMainWindowCreated?.(mainWindow)
}

export function registerNotePopoutLifecycleFromModule(): void {
  hooks.registerNotePopoutLifecycle?.()
}

export function consumeStartupNotices(): string[] {
  return hooks.consumeStartupNotices?.() ?? []
}
