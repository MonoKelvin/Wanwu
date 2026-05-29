import type { ModuleId } from '@shared/constants/modules'

export type NavAlign = 'center' | 'start'
export type NavDisplay = 'icon' | 'both'
export type RssFetchLimit = 20 | 30 | 50

/** 启动模块：`last` 表示上次退出时所在模块 */
export type StartupModule = 'last' | ModuleId

/** 后台 RSS 刷新间隔（分钟），0 为关闭 */
export type RssAutoRefreshMinutes = 0 | 30 | 60 | 120

/** 启动时窗口行为 */
export type WindowStateMode = 'remember' | 'maximize' | 'default'

/** 界面配色偏好；`system` 表示跟随操作系统 */
export type ColorScheme = 'light' | 'dark' | 'system'

/** 实际应用到 DOM 的配色 */
export type ResolvedColorScheme = 'light' | 'dark'

/** 便笺独立窗口自动还原时机 */
export type NotesPopoutRestoreMode = 'on-startup' | 'on-enter-notes' | 'never'

export interface AppSettings {
  navAlign: NavAlign
  navDisplay: NavDisplay
  rssFetchLimit: RssFetchLimit
  startupModule: StartupModule
  lastActiveModule: ModuleId
  rssAutoRefreshMinutes: RssAutoRefreshMinutes
  windowStateMode: WindowStateMode
  colorScheme: ColorScheme
  notesPopoutRestore: NotesPopoutRestoreMode
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  navAlign: 'start',
  navDisplay: 'icon',
  rssFetchLimit: 20,
  startupModule: 'last',
  lastActiveModule: 'library',
  rssAutoRefreshMinutes: 0,
  windowStateMode: 'remember',
  colorScheme: 'system',
  notesPopoutRestore: 'on-enter-notes'
}

export const COLOR_SCHEME_OPTIONS: Array<{ label: string; value: ColorScheme }> = [
  { label: '跟随系统', value: 'system' },
  { label: '浅色', value: 'light' },
  { label: '深色', value: 'dark' }
]

export const WINDOW_STATE_MODE_OPTIONS: Array<{ label: string; value: WindowStateMode }> = [
  { label: '记忆上次状态', value: 'remember' },
  { label: '最大化', value: 'maximize' },
  { label: '不记忆', value: 'default' }
]

export const RSS_FETCH_LIMIT_OPTIONS: RssFetchLimit[] = [20, 30, 50]

export const RSS_AUTO_REFRESH_OPTIONS: Array<{ label: string; value: RssAutoRefreshMinutes }> = [
  { label: '关闭', value: 0 },
  { label: '每 30 分钟', value: 30 },
  { label: '每 1 小时', value: 60 },
  { label: '每 2 小时', value: 120 }
]

export const NOTES_POPOUT_RESTORE_OPTIONS: Array<{
  label: string
  value: NotesPopoutRestoreMode
}> = [
  { label: '启动软件', value: 'on-startup' },
  { label: '进入便笺', value: 'on-enter-notes' },
  { label: '不自动还原', value: 'never' }
]

/** 写入 localStorage 的键（重置设置时清除） */
export const APP_LOCAL_STORAGE_KEYS = [
  'wanwu.library.viewMode',
  'wanwu.library.sortField',
  'wanwu.dismissiblePrompts'
] as const
