import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { isModuleId, type ModuleId } from '@app/config/modules'
import { isItemDetailRoute, moduleIdForItemDetailSource } from '@shared/utils/itemDetailRoute'

/** 当前路由对应的主模块（含全库等物品详情页） */
export function useRouteModule() {
  const route = useRoute()

  return computed((): ModuleId | undefined => {
    if (isItemDetailRoute(route.name)) {
      return moduleIdForItemDetailSource(route.params.source as string | undefined)
    }
    const m = route.meta.module as string | undefined
    return m && isModuleId(m) ? m : undefined
  })
}
