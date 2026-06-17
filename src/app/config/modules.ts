import type { WwIconName } from '@shared/icons/registry'
import { CLOUD_ABODE_ENABLED } from '@shared/constants/modules'
export {
  CLOUD_ABODE_ENABLED,
  DEFAULT_MODULE_ID,
  isModuleId,
  type ModuleId
} from '@shared/constants/modules'

export {
  collectModuleNavItems as MODULE_NAV_ITEMS,
  modulePathById
} from '@app/modules/moduleNavRegistry'

export type { IModuleNavContributor as ModuleNavItem } from '@app/modules/moduleNavRegistry'
