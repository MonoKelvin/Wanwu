import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { isModuleId, type ModuleId } from '@app/config/modules'
import { shellModuleFromReturnPath } from '@app/shell/moduleShell'
import { useAppStore } from '@shared/stores/app'
import { isItemDetailRoute } from '@shared/utils/itemDetailRoute'

/** 主内容区底层应展示的模块（物品详情时为进入详情前的模块，而非 params.source） */
export function useShellModule() {
  const route = useRoute()
  const appStore = useAppStore()

  return computed((): ModuleId => {
    if (isItemDetailRoute(route.name)) {
      return shellModuleFromReturnPath(appStore.itemDetailReturnPath)
    }
    const m = route.meta.module as string | undefined
    return m && isModuleId(m) ? m : 'library'
  })
}
