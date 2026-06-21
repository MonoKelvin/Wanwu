import type { WwIconName } from '@shared/icons/registry'
export {
  DEFAULT_MODULE_ID,
  type ModuleId
} from '@shared/constants/modules'
export {
  collectModuleNavItems,
  collectModuleNavItems as MODULE_NAV_ITEMS,
  isModuleId,
  isModuleIdRegistered,
  modulePathById,
  resolveDefaultModuleId
} from '@app/modules/moduleNavRegistry'

export type { IModuleNavContributor as ModuleNavItem } from '@app/modules/moduleNavRegistry'
