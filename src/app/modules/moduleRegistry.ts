export * from '@app/modules/moduleRegistryCore'
import '@app/modules/moduleRegistryBootstrap'

import { getAppModules } from '@app/modules/moduleRegistryCore'

if (import.meta.env.DEV && getAppModules().length === 0) {
  console.error(
    '[moduleRegistry] 未注册任何业务模块，路由将为空并导致启动白屏。请检查 modules/**/app/register.ts 是否被正确加载。'
  )
}
