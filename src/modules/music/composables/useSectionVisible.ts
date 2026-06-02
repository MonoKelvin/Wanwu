import { nextTick, onActivated, onBeforeUnmount, onMounted, ref, type Ref } from 'vue'

type Options = {
  rootMargin?: string
  threshold?: number
  enabled?: () => boolean
}

/** 区块进入视口时触发一次（配合发现页懒加载） */
export function useSectionVisible(
  rootRef: Ref<HTMLElement | null | undefined>,
  onVisible: () => void,
  options: Options = {}
) {
  const fired = ref(false)
  let observer: IntersectionObserver | null = null

  function isEnabled() {
    return options.enabled?.() !== false
  }

  function disconnect() {
    observer?.disconnect()
    observer = null
  }

  function bind() {
    disconnect()
    const el = rootRef.value
    if (!el || fired.value || !isEnabled()) return

    observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting || fired.value || !isEnabled()) return
        fired.value = true
        onVisible()
        disconnect()
      },
      {
        rootMargin: options.rootMargin ?? '160px 0px',
        threshold: options.threshold ?? 0.01
      }
    )
    observer.observe(el)
  }

  onMounted(() => {
    void nextTick(bind)
  })

  onActivated(() => {
    if (!fired.value) void nextTick(bind)
  })

  onBeforeUnmount(disconnect)

  return { fired }
}
