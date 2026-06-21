import { registerLocalStorageKeys } from '@shared/module-bridge/localStorageKeysRegistry'
import { HANDBOOK_SORT_FIELD_KEY, HANDBOOK_VIEW_MODE_KEY } from './localStorageKeys'

registerLocalStorageKeys([HANDBOOK_VIEW_MODE_KEY, HANDBOOK_SORT_FIELD_KEY])
