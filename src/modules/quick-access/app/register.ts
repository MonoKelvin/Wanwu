import { registerAppModule } from '@app/modules/moduleRegistryCore'
import { registerQuickAccessKind } from '@app/modules/quickAccessKindRegistry'
import { quickAccessAppModule } from '@modules/quick-access/app/quickAccessAppModule'

registerQuickAccessKind({ kind: 'favorite', label: '收藏', icon: 'heart', order: 60 })
registerAppModule(quickAccessAppModule)
