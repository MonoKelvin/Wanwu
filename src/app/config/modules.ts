import type { WwIconName } from '@shared/icons/registry'

export interface ModuleNavItem {
  id: string
  label: string
  icon: WwIconName
  path: string
}

/** 主模块导航（新增模块时在此维护，设置页启动项会同步） */
export const MODULE_NAV_ITEMS = [
  { id: 'library', label: '全库', icon: 'database', path: '/library' },
  { id: 'rss', label: 'RSS', icon: 'globe', path: '/rss' },
  { id: 'personal', label: '个人', icon: 'user', path: '/personal' },
  { id: 'settings', label: '设置', icon: 'settings', path: '/settings' }
] as const satisfies readonly ModuleNavItem[]

export type ModuleId = (typeof MODULE_NAV_ITEMS)[number]['id']

export const DEFAULT_MODULE_ID: ModuleId = 'library'

export function isModuleId(value: string): value is ModuleId {
  return MODULE_NAV_ITEMS.some((item) => item.id === value)
}

export function modulePathById(id: ModuleId): string {
  const item = MODULE_NAV_ITEMS.find((m) => m.id === id)
  return item?.path ?? `/${DEFAULT_MODULE_ID}`
}
