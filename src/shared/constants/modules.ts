/** 主模块 ID（Electron 与渲染进程共用，勿依赖 UI 图标配置） */
export const MODULE_IDS = ['library', 'rss', 'cloud-abode', 'personal', 'settings'] as const

export type ModuleId = (typeof MODULE_IDS)[number]

/** 云斋模块是否对用户开放（false = 侧栏隐藏，路由重定向） */
export const CLOUD_ABODE_ENABLED = false

export const DEFAULT_MODULE_ID: ModuleId = 'library'

const MODULE_PATH_BY_ID: Record<ModuleId, string> = {
  library: '/library',
  rss: '/rss',
  'cloud-abode': '/cloud-abode',
  personal: '/personal',
  settings: '/settings'
}

export function isModuleId(value: string): value is ModuleId {
  return (MODULE_IDS as readonly string[]).includes(value)
}

export function modulePathById(id: ModuleId): string {
  return MODULE_PATH_BY_ID[id]
}

/** 与各模块根视图 defineOptions({ name }) 一致，供 AppShell KeepAlive */
export const MODULE_KEEP_ALIVE = [
  'LibraryView',
  'RssView',
  'CloudAbodeView',
  'PersonalView',
  'SettingsView'
] as const
