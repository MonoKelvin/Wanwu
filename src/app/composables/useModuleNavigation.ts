import { useRouter } from 'vue-router'
import { isModuleId, modulePathById, type ModuleId } from '@app/config/modules'
import { prepareShellNavigation } from '@app/composables/shellNavigation'
import { useAppStore } from '@shared/stores/app'
import { isItemDetailPath, moduleIdForItemDetailSource } from '@shared/utils/itemDetailRoute'

function belongsToModule(path: string, id: ModuleId): boolean {
  const normalized = path.replace(/^#/, '')
  const seg = normalized.split('?')[0]?.split('/').filter(Boolean)[0]
  if (seg === id) return true
  if (id === 'library' && seg === 'notes') return true
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

  async function navigateToModule(id: ModuleId) {
    const remembered = appStore.pathForModule(id)
    const path = belongsToModule(remembered, id) ? remembered : modulePathById(id)
    const active = currentRouteModule(router)
    const resolved = router.resolve(path)
    const samePath = router.currentRoute.value.fullPath === resolved.fullPath

    if (active === id && samePath) {
      appStore.bumpShellOutlet()
      return
    }

    await prepareShellNavigation()
    await router.push(path).catch(() => {})
  }

  return { navigateToModule }
}
