import { useRouter } from 'vue-router'
import type { ModuleId } from '@app/config/modules'
import { useAppStore } from '@shared/stores/app'

export function useModuleNavigation() {
  const router = useRouter()
  const appStore = useAppStore()

  function navigateToModule(id: ModuleId) {
    const path = appStore.pathForModule(id)
    if (router.currentRoute.value.fullPath !== path) {
      void router.push(path)
    }
  }

  return { navigateToModule }
}
