import { dispatchQuickAccessTarget } from '@shared/module-bridge/quickAccessRendererBridge'
import type { QuickAccessOpenTarget } from '@shared/types/quickAccess'
import { hitToOpenTarget } from '@shared/types/quickAccess'
import { nextTick } from 'vue'
import { useRouter } from 'vue-router'

export { hitToOpenTarget }

export function useQuickAccessTargets() {
  const router = useRouter()

  async function openTarget(target: QuickAccessOpenTarget): Promise<void> {
    await dispatchQuickAccessTarget(target, {
      pushRoute: async (location) => {
        await router.push(location)
      },
      afterRouteReady: () => nextTick()
    })
  }

  return { openTarget, hitToOpenTarget }
}
