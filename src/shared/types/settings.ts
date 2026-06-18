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

/** 点击关闭主窗口时的行为 */
export type CloseBehavior = 'quit' | 'tray' | 'ask'

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
  /** 便笺标题与正文拼写检查 */
  notesSpellcheckEnabled: boolean
  /** 登录系统后自动启动应用 */
  launchAtStartup: boolean
  /** 在任务栏显示托盘图标 */
  trayEnabled: boolean
  /** 关闭主窗口时的行为 */
  closeBehavior: CloseBehavior
  /** 今日一物小浮窗 */
  dailyWidgetEnabled: boolean
  /** 剪贴板复制后联想图鉴条目 */
  clipboardAssistEnabled: boolean
  /** Verome API 根地址 */
  musicApiBaseUrl: string
  /** remote = 使用 musicApiBaseUrl；local = 127.0.0.1:musicApiLocalPort */
  musicApiMode: 'remote' | 'local'
  musicApiLocalPort: number
  /** 发现页地区（Verome trending/charts） */
  musicDiscoverCountry: string
  /** 可选 Jamendo client_id */
  musicJamendoClientId: string
  /** 可选 Audius API Bearer（仅主进程） */
  musicAudiusApiKey: string
  /** 主音源：kugou | netease | verome */
  musicPrimarySource: 'netease' | 'verome' | 'kugou'
  /** 网易云内嵌 API 网关端口（预留） */
  musicNeteasePort: number
  musicNeteaseRealIp: string
  musicNeteaseProxy: string
  musicNeteaseQuality:
    | 'standard'
    | 'higher'
    | 'exhigh'
    | 'lossless'
    | 'hires'
    | 'jyeffect'
    | 'sky'
    | 'dolby'
    | 'jymaster'
  /** 最近使用的字体（CSS font-family） */
  recentFonts: string[]
  /** 最近使用的颜色值 */
  recentColors: string[]
  /** 流程图最近使用的图元 id */
  diagramRecentShapes: string[]
  /** 各业务模块独立设置（按 module id 索引） */
  moduleSettings: Record<string, Record<string, unknown>>
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
  notesPopoutRestore: 'on-enter-notes',
  notesSpellcheckEnabled: false,
  launchAtStartup: false,
  trayEnabled: true,
  closeBehavior: 'quit',
  dailyWidgetEnabled: false,
  clipboardAssistEnabled: false,
  musicApiBaseUrl: 'https://verome-api.deno.dev',
  musicApiMode: 'remote',
  musicApiLocalPort: 8000,
  musicDiscoverCountry: 'China',
  musicJamendoClientId: '',
  musicAudiusApiKey: '',
  musicPrimarySource: 'kugou',
  musicNeteasePort: 25884,
  musicNeteaseRealIp: '',
  musicNeteaseProxy: '',
  musicNeteaseQuality: 'standard',
  recentFonts: [],
  recentColors: [],
  diagramRecentShapes: [],
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

export const RSS_FETCH_LIMIT_OPTIONS: RssFetchLimit[] = [20, 30, 50]

export const RSS_AUTO_REFRESH_OPTIONS: Array<{ label: string; value: RssAutoRefreshMinutes }> = [
  { label: '关闭', value: 0 },
  { label: '每 30 分钟', value: 30 },
  { label: '每 1 小时', value: 60 },
  { label: '每 2 小时', value: 120 }
]

export const CLOSE_BEHAVIOR_OPTIONS: Array<{ label: string; value: CloseBehavior }> = [
  { label: '直接关闭', value: 'quit' },
  { label: '最小化到系统托盘', value: 'tray' },
  { label: '每次询问', value: 'ask' }
]

/** 写入 localStorage 的键（重置设置时清除） */
export const APP_LOCAL_STORAGE_KEYS = [
  'wanwu.library.viewMode',
  'wanwu.library.sortField',
  'wanwu.dismissiblePrompts'
] as const
