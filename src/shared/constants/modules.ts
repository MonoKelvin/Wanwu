/** 主模块 ID（运行时由 moduleNavRegistry 注册，类型层面为 string） */
export type ModuleId = string

/** 启动/设置持久化时的默认主模块（模块未注册前的兜底） */
export const DEFAULT_MODULE_ID: ModuleId = 'library'

/**
 * 主进程或模块尚未完成注册时的已知 ID 白名单（仅用于设置归一化兜底）。
 * 渲染进程优先使用 moduleNavRegistry.isModuleIdRegistered()。
 */
export const KNOWN_MODULE_IDS = [
  'library',
  'rss',
  'music',
  'personal',
  'settings'
] as const

export function isKnownModuleId(value: string): boolean {
  return KNOWN_MODULE_IDS.includes(value as (typeof KNOWN_MODULE_IDS)[number])
}

/** @deprecated 使用 isKnownModuleId 或 moduleNavRegistry.isModuleIdRegistered */
export function isModuleId(value: string): value is ModuleId {
  return typeof value === 'string' && value.length > 0 && isKnownModuleId(value)
}
