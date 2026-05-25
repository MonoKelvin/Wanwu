import { onUnmounted, ref, watch } from 'vue'

const STORAGE_KEY = 'wanwu:links:live-sync'

function readEnabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== '0'
  } catch {
    return true
  }
}

export function useLinksLiveSync(onSync: () => void | Promise<void>) {
  const liveSyncEnabled = ref(readEnabled())
  let unsubscribe: (() => void) | null = null

  function persistEnabled(value: boolean) {
    try {
      localStorage.setItem(STORAGE_KEY, value ? '1' : '0')
    } catch {
      /* ignore */
    }
  }

  function bindWatcher() {
    unsubscribe?.()
    unsubscribe = null
    if (!liveSyncEnabled.value) return
    unsubscribe = window.wanwu.links.onBookmarksFileChanged(() => {
      void onSync()
    })
  }

  watch(
    liveSyncEnabled,
    (enabled) => {
      persistEnabled(enabled)
      bindWatcher()
    },
    { immediate: true }
  )

  onUnmounted(() => {
    unsubscribe?.()
  })

  return { liveSyncEnabled }
}
