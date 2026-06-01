import { onUnmounted, watch, type Ref } from 'vue'

type Options = {
  /** 距离底部多少 px 内触发 */
  threshold?: number
  /** 是否启用 */
  enabled?: Ref<boolean>
}

export function useScrollNearEnd(
  rootRef: Ref<HTMLElement | null | undefined>,
  onNearEnd: () => void | Promise<void>,
  options: Options = {}
) {
  const threshold = options.threshold ?? 240
  let loading = false

  async function check() {
    const el = rootRef.value
    if (!el || loading) return
    if (options.enabled && !options.enabled.value) return
    if (el.scrollHeight <= el.clientHeight + threshold) {
      loading = true
      try {
        await onNearEnd()
      } finally {
        loading = false
      }
      return
    }
    const remaining = el.scrollHeight - el.scrollTop - el.clientHeight
    if (remaining > threshold) return
    loading = true
    try {
      await onNearEnd()
    } finally {
      loading = false
    }
  }

  function onScroll() {
    void check()
  }

  function bind(el: HTMLElement) {
    unbind(el)
    el.addEventListener('scroll', onScroll, { passive: true })
  }

  function unbind(el?: HTMLElement | null) {
    el?.removeEventListener('scroll', onScroll)
  }

  let bound: HTMLElement | null = null

  watch(
    rootRef,
    (el, prev) => {
      if (prev) unbind(prev)
      bound = el ?? null
      if (el) {
        bind(el)
        void check()
      }
    },
    { immediate: true }
  )

  onUnmounted(() => {
    if (bound) unbind(bound)
  })

  return { recheck: check }
}
