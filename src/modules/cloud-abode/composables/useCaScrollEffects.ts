import { onUnmounted, ref, type Ref } from 'vue'

/** 云斋内容区滚动：顶栏态 + 背景/前景视差 CSS 变量 */
export function useCaScrollEffects(rootRef: Ref<HTMLElement | null | undefined>) {
  const scrolled = ref(false)
  const scrollY = ref(0)
  let scrollEl: HTMLElement | null = null
  let raf = 0

  function apply(y: number) {
    scrollY.value = y
    scrolled.value = y > 8
    const root = rootRef.value
    if (!root) return
    root.style.setProperty('--ca-scroll-y', String(y))
    root.style.setProperty('--ca-parallax-y', `${y}px`)
    root.style.setProperty('--ca-parallax-bg', `${y * 0.38}px`)
    root.style.setProperty('--ca-parallax-fg', `${y * -0.045}px`)
  }

  function onScroll() {
    if (raf) return
    raf = requestAnimationFrame(() => {
      raf = 0
      apply(scrollEl?.scrollTop ?? 0)
    })
  }

  function bind() {
    unbind()
    scrollEl = rootRef.value?.querySelector<HTMLElement>('.ww-ca-scroll') ?? null
    scrollEl?.addEventListener('scroll', onScroll, { passive: true })
    apply(scrollEl?.scrollTop ?? 0)
  }

  function unbind() {
    scrollEl?.removeEventListener('scroll', onScroll)
    scrollEl = null
    if (raf) {
      cancelAnimationFrame(raf)
      raf = 0
    }
    scrolled.value = false
    scrollY.value = 0
    rootRef.value?.style.removeProperty('--ca-scroll-y')
    rootRef.value?.style.removeProperty('--ca-parallax-y')
    rootRef.value?.style.removeProperty('--ca-parallax-bg')
    rootRef.value?.style.removeProperty('--ca-parallax-fg')
  }

  onUnmounted(unbind)

  return { scrolled, scrollY, bind, unbind }
}
