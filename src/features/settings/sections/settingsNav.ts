import type { WwIconName } from '@shared/icons/registry'
import type { SettingsSection } from './types'

export const SETTINGS_NAV_ITEMS: Array<{
  id: SettingsSection
  label: string
  icon: WwIconName
}> = [
  { id: 'app', label: '应用', icon: 'sliders-horizontal' },
  { id: 'rss', label: 'RSS', icon: 'globe' },
  { id: 'data', label: '数据与安全', icon: 'database' },
  { id: 'about', label: '关于', icon: 'sparkles' }
]
