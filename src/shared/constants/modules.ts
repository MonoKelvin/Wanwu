/** 主模块 ID（Electron 与渲染进程共用，勿依赖 UI 图标配置） */
export const MODULE_IDS = ['library', 'rss', 'music', 'cloud-abode', 'personal', 'settings'] as const

export type ModuleId = (typeof MODULE_IDS)[number]

/** 云斋模块是否对用户开放（false = 侧栏隐藏，路由重定向） */
export const CLOUD_ABODE_ENABLED = false

export const DEFAULT_MODULE_ID: ModuleId = 'library'

export function isModuleId(value: string): value is ModuleId {
  return (MODULE_IDS as readonly string[]).includes(value)
}
