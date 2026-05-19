import type { ModuleId } from '@shared/stores/app'
import type { WwIconName } from '@shared/icons/registry'

export interface ModuleNavItem {
  id: ModuleId
  label: string
  icon: WwIconName
  path: string
}

export const MODULE_NAV_ITEMS: ModuleNavItem[] = [
  { id: 'library', label: '全库', icon: 'database', path: '/library' },
  { id: 'rss', label: 'RSS', icon: 'globe', path: '/rss' },
  { id: 'personal', label: '个人', icon: 'user', path: '/personal' },
  { id: 'settings', label: '设置', icon: 'settings', path: '/settings' }
]
