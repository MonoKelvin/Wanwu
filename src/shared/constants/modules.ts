/** 主模块 ID（运行时由 moduleNavRegistry 注册，类型层面为 string） */
export type ModuleId = string

/** 启动/设置持久化时的默认主模块（模块未注册前的兜底） */
export const DEFAULT_MODULE_ID: ModuleId = 'library'

export function isModuleId(value: string): value is ModuleId {
  return typeof value === 'string' && value.trim().length > 0
}
