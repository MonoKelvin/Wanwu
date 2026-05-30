import { computed, ref, watch, type MaybeRefOrGetter, toValue } from 'vue'
import {
  isLikelyGenericFavicon,
  linkFaviconSources
} from '@shared/utils/linkIcon'

export function invalidateFaviconForUrl(url: string): void {
  /* 多源按 URL 重新解析，无需缓存 */
  void url
}

export function useLinkFavicon(pageUrl: MaybeRefOrGetter<string>) {
  const sourceIndex = ref(0)
  const sources = ref<string[]>([])
  const failed = ref(false)
  const loaded = ref(false)

  function resolve() {
    sourceIndex.value = 0
    failed.value = false
    loaded.value = false
    sources.value = linkFaviconSources(toValue(pageUrl))
  }

  watch(() => toValue(pageUrl), resolve, { immediate: true })

  const activeSrc = computed(() => {
    if (failed.value || !sources.value.length) return null
    return sources.value[sourceIndex.value] ?? null
  })

  const pending = computed(() => !!activeSrc.value && !failed.value && !loaded.value)
  const showImage = computed(() => !!activeSrc.value && !failed.value && loaded.value)
  const showFallback = computed(() => !activeSrc.value || failed.value)

  function tryNextSource() {
    loaded.value = false
    if (sourceIndex.value < sources.value.length - 1) {
      sourceIndex.value += 1
      return
    }
    failed.value = true
  }

  function onLoad(event: Event) {
    const img = event.target
    if (!(img instanceof HTMLImageElement)) return
    if (isLikelyGenericFavicon(img)) {
      tryNextSource()
      return
    }
    loaded.value = true
  }

  function onError() {
    tryNextSource()
  }

  function refresh() {
    resolve()
  }

  return {
    activeSrc,
    failed,
    loaded,
    pending,
    showImage,
    showFallback,
    onLoad,
    onError,
    refresh
  }
}
