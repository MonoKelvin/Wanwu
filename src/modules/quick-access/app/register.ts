import { registerAppModule } from '@app/modules/moduleRegistryCore'
import { bindQuickAccessRendererModule } from '@shared/module-bridge/quickAccessRendererBridge'
import * as kindRegistry from '@modules/quick-access/domain/quickAccessKindRegistry'
import * as targetRegistry from '@modules/quick-access/domain/quickAccessTargetRegistry'
import { quickAccessAppModule } from '@modules/quick-access/app/quickAccessAppModule'

bindQuickAccessRendererModule({
  registerQuickAccessKind: kindRegistry.registerQuickAccessKind,
  registerQuickAccessTargetHandler: targetRegistry.registerQuickAccessTargetHandler,
  getQuickAccessKindMeta: kindRegistry.getQuickAccessKindMeta,
  collectQuickAccessKindOrder: kindRegistry.collectQuickAccessKindOrder,
  getQuickAccessTargetHandlers: targetRegistry.getQuickAccessTargetHandlers,
  dispatchQuickAccessTarget: targetRegistry.dispatchQuickAccessTarget
})

kindRegistry.registerQuickAccessKind({ kind: 'favorite', label: '收藏', icon: 'heart', order: 60 })
registerAppModule(quickAccessAppModule)
