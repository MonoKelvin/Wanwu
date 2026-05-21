import type { WwIconName } from '@shared/icons/registry'
export {
  DEFAULT_MODULE_ID,
  isModuleId,
  MODULE_KEEP_ALIVE,
  modulePathById,
  type ModuleId
} from '@shared/constants/modules'

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
