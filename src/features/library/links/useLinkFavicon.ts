import { computed, ref, watch, type MaybeRefOrGetter, toValue } from 'vue'

const cache = new Map<string, string>()

function faviconUrlForPage(url: string): string | null {
  try {
    const { hostname } = new URL(url)
    if (!hostname) return null
    if (cache.has(hostname)) return cache.get(hostname)!
    const src = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=64`
    cache.set(hostname, src)
    return src
  } catch {
    return null
  }
}

export function invalidateFaviconForUrl(url: string): void {
  try {
    const { hostname } = new URL(url)
    cache.delete(hostname)
  } catch {
    /* ignore */
  }
}

export function useLinkFavicon(pageUrl: MaybeRefOrGetter<string>) {
  const src = ref<string | null>(null)
  const failed = ref(false)
  const loaded = ref(false)

  function resolve() {
    failed.value = false
    loaded.value = false
    src.value = faviconUrlForPage(toValue(pageUrl))
  }

  watch(() => toValue(pageUrl), resolve, { immediate: true })

  const pending = computed(() => !!src.value && !failed.value && !loaded.value)
  const showImage = computed(() => !!src.value && !failed.value && loaded.value)
  const showFallback = computed(() => !src.value || failed.value)

  function onLoad() {
    loaded.value = true
  }

  function onError() {
    failed.value = true
    loaded.value = false
    src.value = null
  }

  function refresh() {
    invalidateFaviconForUrl(toValue(pageUrl))
    resolve()
  }

  return { src, failed, loaded, pending, showImage, showFallback, onLoad, onError, refresh }
}
