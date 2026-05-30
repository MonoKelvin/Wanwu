import { onUnmounted, ref, type Ref } from 'vue'

/** 监听云斋内容区滚动，驱动顶栏毛玻璃「已滚动」态 */
export function useCaShellScroll(rootRef: Ref<HTMLElement | null | undefined>) {
  const scrolled = ref(false)
  let scrollEl: HTMLElement | null = null

  function onScroll() {
    scrolled.value = (scrollEl?.scrollTop ?? 0) > 6
  }

  function bind() {
    unbind()
    scrollEl = rootRef.value?.querySelector<HTMLElement>('.ww-ca-scroll') ?? null
    scrollEl?.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
  }

  function unbind() {
    scrollEl?.removeEventListener('scroll', onScroll)
    scrollEl = null
    scrolled.value = false
  }

  onUnmounted(unbind)

  return { scrolled, bind, unbind }
}
