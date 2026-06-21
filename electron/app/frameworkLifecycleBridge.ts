import type { AppSettings } from '../../src/shared/types/settings'

/** 模块向框架注册的跨切面生命周期钩子 */
export interface FrameworkLifecycleContributor {
  readonly id: string
  order?: number
  onMainWindowCreated?: (mainWindow: import('electron').BrowserWindow) => void
  onAppReady?: () => void
  onBeforeAppQuit?: () => void
  onWindowAllClosed?: () => void
  onSettingsSync?: (settings?: AppSettings) => void
  waitForBootstrap?: () => Promise<void>
  consumeStartupNotices?: () => string[]
  focusMainWindow?: () => void
  isAppQuitting?: () => boolean
  markAppQuitting?: () => void
  isTrayActive?: () => boolean
  ensureTrayForWindowHide?: () => void
}

const contributors: FrameworkLifecycleContributor[] = []

function sortContributors(): void {
  contributors.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
}

export function registerFrameworkLifecycleContributor(
  contributor: FrameworkLifecycleContributor
): void {
  contributors.push(contributor)
  sortContributors()
}

export function clearFrameworkLifecycleContributors(): void {
  contributors.length = 0
}

function findLastHook<T extends keyof FrameworkLifecycleContributor>(
  key: T
): NonNullable<FrameworkLifecycleContributor[T]> | undefined {
  for (let i = contributors.length - 1; i >= 0; i--) {
    const hook = contributors[i][key]
    if (hook) return hook as NonNullable<FrameworkLifecycleContributor[T]>
  }
  return undefined
}

function runAllHooks(key: 'onAppReady' | 'onBeforeAppQuit' | 'onWindowAllClosed'): void
function runAllHooks(
  key: 'onMainWindowCreated',
  mainWindow: import('electron').BrowserWindow
): void
function runAllHooks(
  key: 'onMainWindowCreated' | 'onAppReady' | 'onBeforeAppQuit' | 'onWindowAllClosed',
  mainWindow?: import('electron').BrowserWindow
): void {
  for (const contributor of contributors) {
    if (key === 'onMainWindowCreated') {
      contributor.onMainWindowCreated?.(mainWindow!)
      continue
    }
    if (key === 'onAppReady') contributor.onAppReady?.()
    if (key === 'onBeforeAppQuit') contributor.onBeforeAppQuit?.()
    if (key === 'onWindowAllClosed') contributor.onWindowAllClosed?.()
  }
}

export function isAppQuitting(): boolean {
  return findLastHook('isAppQuitting')?.() ?? false
}

export function markAppQuitting(): void {
  findLastHook('markAppQuitting')?.()
}

export function isTrayActive(): boolean {
  return findLastHook('isTrayActive')?.() ?? false
}

export function ensureTrayForWindowHide(): void {
  findLastHook('ensureTrayForWindowHide')?.()
}

export function disposeQuickAccess(): void {
  runAllHooks('onBeforeAppQuit')
}

export function syncQuickAccessFromSettings(settings?: AppSettings): void {
  for (const contributor of contributors) {
    contributor.onSettingsSync?.(settings)
  }
}

export function focusMainWindow(): void {
  findLastHook('focusMainWindow')?.()
}

export function waitForBootstrap(): Promise<void> {
  const hook = findLastHook('waitForBootstrap')
  return hook?.() ?? Promise.resolve()
}

/** @deprecated 使用 waitForBootstrap */
export function waitForLibraryBootstrap(): Promise<void> {
  return waitForBootstrap()
}

export function closeAllNotePopoutsForAppExit(): void {
  runAllHooks('onWindowAllClosed')
}

export function notifyMainWindowCreated(mainWindow: import('electron').BrowserWindow): void {
  runAllHooks('onMainWindowCreated', mainWindow)
}

export function runAppReadyLifecycleHooks(): void {
  runAllHooks('onAppReady')
}

/** @deprecated 使用 runAppReadyLifecycleHooks */
export function registerNotePopoutLifecycleFromModule(): void {
  runAppReadyLifecycleHooks()
}

export function consumeStartupNotices(): string[] {
  const lines: string[] = []
  for (const contributor of contributors) {
    const chunk = contributor.consumeStartupNotices?.()
    if (chunk?.length) lines.push(...chunk)
  }
  return lines
}
