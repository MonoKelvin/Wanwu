/** 主模块 ID（Electron 与渲染进程共用，勿依赖 UI 图标配置） */
export const MODULE_IDS = ['library', 'rss', 'personal', 'settings'] as const

export type ModuleId = (typeof MODULE_IDS)[number]

export const DEFAULT_MODULE_ID: ModuleId = 'library'

const MODULE_PATH_BY_ID: Record<ModuleId, string> = {
  library: '/library',
  rss: '/rss',
  personal: '/personal',
  settings: '/settings'
}

export function isModuleId(value: string): value is ModuleId {
  return (MODULE_IDS as readonly string[]).includes(value)
}

export function modulePathById(id: ModuleId): string {
  return MODULE_PATH_BY_ID[id]
}
