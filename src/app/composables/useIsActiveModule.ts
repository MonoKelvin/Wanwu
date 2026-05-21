import { computed } from 'vue'
import { useRoute } from 'vue-router'
import type { ModuleId } from '@app/config/modules'

/** 当前路由是否属于指定主模块（用于 KeepAlive 缓存页内忽略其它模块的路由变化） */
export function useIsActiveModule(moduleId: ModuleId) {
  const route = useRoute()
  return computed(() => route.meta.module === moduleId)
}
