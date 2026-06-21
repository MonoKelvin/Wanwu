import type { ModuleId } from '@shared/constants/modules'

export type NavAlign = 'center' | 'start'
export type NavDisplay = 'icon' | 'both'

/** 启动模块：`last` 表示上次退出时所在模块 */
export type StartupModule = 'last' | ModuleId

/** 启动时窗口行为 */
export type WindowStateMode = 'remember' | 'maximize' | 'default'

/** 界面配色偏好；`system` 表示跟随操作系统 */
export type ColorScheme = 'light' | 'dark' | 'system'

/** 实际应用到 DOM 的配色 */
export type ResolvedColorScheme = 'light' | 'dark'

/** 点击关闭主窗口时的行为 */
export type CloseBehavior = 'quit' | 'tray' | 'ask'

/** 框架壳层设置：不含各业务模块字段 */
export interface AppSettings {
  navAlign: NavAlign
  navDisplay: NavDisplay
  startupModule: StartupModule
  lastActiveModule: ModuleId
  windowStateMode: WindowStateMode
  colorScheme: ColorScheme
  launchAtStartup: boolean
  trayEnabled: boolean
  closeBehavior: CloseBehavior
  recentFonts: string[]
  recentColors: string[]
  moduleSettings: Record<string, Record<string, unknown>>
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  navAlign: 'start',
  navDisplay: 'icon',
  startupModule: 'last',
  lastActiveModule: 'library',
  windowStateMode: 'remember',
  colorScheme: 'system',
  launchAtStartup: false,
  trayEnabled: true,
  closeBehavior: 'quit',
  recentFonts: [],
  recentColors: [],
  moduleSettings: {}
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

export const CLOSE_BEHAVIOR_OPTIONS: Array<{ label: string; value: CloseBehavior }> = [
  { label: '直接关闭', value: 'quit' },
  { label: '最小化到系统托盘', value: 'tray' },
  { label: '每次询问', value: 'ask' }
]

