import { useRouter } from 'vue-router'
import { isModuleId, modulePathById, type ModuleId } from '@app/config/modules'
import { useAppStore } from '@shared/stores/app'
import { isItemDetailPath, moduleIdForItemDetailSource } from '@shared/utils/itemDetailRoute'

function belongsToModule(path: string, id: ModuleId): boolean {
  const normalized = path.replace(/^#/, '')
  const seg = normalized.split('?')[0]?.split('/').filter(Boolean)[0]
  if (seg === id) return true
  if (isItemDetailPath(normalized)) {
    const source = normalized.split('?')[0]?.split('/')[2]
    return moduleIdForItemDetailSource(source) === id
  }
  return false
}

function currentRouteModule(router: ReturnType<typeof useRouter>): ModuleId | undefined {
  const m = router.currentRoute.value.meta.module
  return m && isModuleId(String(m)) ? (m as ModuleId) : undefined
}

export function useModuleNavigation() {
  const router = useRouter()
  const appStore = useAppStore()

  function navigateToModule(id: ModuleId) {
    const remembered = appStore.pathForModule(id)
    const path = belongsToModule(remembered, id) ? remembered : modulePathById(id)
    const active = currentRouteModule(router)
    if (active !== id) {
      void router.push(path)
      return
    }
    if (router.currentRoute.value.fullPath !== path) {
      void router.push(path)
    }
  }

  return { navigateToModule }
}
