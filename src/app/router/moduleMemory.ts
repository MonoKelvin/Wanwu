import type { Router } from 'vue-router'
import { isModuleId, type ModuleId } from '@app/config/modules'
import { useAppStore } from '@shared/stores/app'
import { shouldRememberItemDetailReturn } from '@app/composables/useItemDetailNavigation'
import { isItemDetailRoute, moduleIdForItemDetailSource } from '@shared/utils/itemDetailRoute'

/** 离开模块 / 条目详情时记住路径，含全库物品详情页 */
export function setupModulePathMemory(router: Router) {
  router.beforeEach((to, from) => {
    const store = useAppStore()

    if (isItemDetailRoute(from.name)) {
      const owner = moduleIdForItemDetailSource(from.params.source as string | undefined)
      if (owner) {
        const toModule =
          isItemDetailRoute(to.name) ?
            moduleIdForItemDetailSource(to.params.source as string | undefined)
          : isModuleId(String(to.meta.module)) ?
            (to.meta.module as ModuleId)
          : undefined
        if (toModule !== owner) {
          store.rememberModulePath(owner, from.fullPath)
        }
      }
    }

    const fromModule = from.meta.module
    if (!fromModule || !isModuleId(String(fromModule))) return true

    const id = fromModule as ModuleId

    if (
      to.name === 'item-detail' &&
      shouldRememberItemDetailReturn(
        from.fullPath,
        from.name,
        from.meta.module,
        to.params.source as string | undefined
      )
    ) {
      store.rememberItemDetailReturn(from.fullPath)
      return true
    }

    if (to.meta.module !== fromModule) {
      store.rememberModulePath(id, from.fullPath)
    }
    return true
  })

  router.afterEach((to) => {
    const store = useAppStore()

    if (isItemDetailRoute(to.name)) {
      const owner = moduleIdForItemDetailSource(to.params.source as string | undefined)
      if (owner) store.rememberModulePath(owner, to.fullPath)
      return
    }

    const mod = to.meta.module
    if (mod && isModuleId(String(mod))) {
      store.rememberModulePath(mod as ModuleId, to.fullPath)
    }
  })
}
