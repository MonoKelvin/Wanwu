import { onUnmounted, ref, toValue, watch, type MaybeRefOrGetter } from 'vue'

const STORAGE_KEY = 'wanwu:links:live-sync'

function readEnabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== '0'
  } catch {
    return true
  }
}

/** @param watchActive 为 false 时不监听；browserSourceId 限定仅响应当前浏览器文件变更 */
export function useLinksLiveSync(
  onSync: () => void | Promise<void>,
  watchActive: MaybeRefOrGetter<boolean> = true,
  browserSourceId: MaybeRefOrGetter<string | null> = null
) {
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
    if (!liveSyncEnabled.value || !toValue(watchActive)) return
    unsubscribe = window.wanwu.links.onBookmarksFileChanged((payload) => {
      const activeId = toValue(browserSourceId)
      if (activeId && payload.browserSourceId !== activeId) return
      void onSync()
    })
  }

  watch(
    [liveSyncEnabled, () => toValue(watchActive), () => toValue(browserSourceId)],
    ([enabled]) => {
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
