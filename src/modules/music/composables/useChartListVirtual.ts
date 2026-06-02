import { computed, ref, watch, type Ref } from 'vue'

export const CHART_LIST_ITEM_HEIGHT = 52
export const CHART_LIST_VIRTUAL_THRESHOLD = 100
const OVERSCAN = 6

export function useChartListVirtual(
  scrollEl: Ref<HTMLElement | null>,
  listEl: Ref<HTMLElement | null>,
  count: Ref<number>
) {
  const listOffsetTop = ref(0)
  const scrollTop = ref(0)
  const viewportHeight = ref(480)

  const enabled = computed(() => count.value > CHART_LIST_VIRTUAL_THRESHOLD)

  function measure() {
    const scroll = scrollEl.value
    const list = listEl.value
    if (!scroll || !list) return
    viewportHeight.value = scroll.clientHeight
    listOffsetTop.value = list.offsetTop
    scrollTop.value = Math.max(0, scroll.scrollTop - listOffsetTop.value)
  }

  const range = computed(() => {
    if (!enabled.value) {
      return { start: 0, end: count.value, offsetY: 0, totalHeight: count.value * CHART_LIST_ITEM_HEIGHT }
    }
    const start = Math.max(0, Math.floor(scrollTop.value / CHART_LIST_ITEM_HEIGHT) - OVERSCAN)
    const end = Math.min(
      count.value,
      start + Math.ceil(viewportHeight.value / CHART_LIST_ITEM_HEIGHT) + OVERSCAN * 2
    )
    return {
      start,
      end,
      offsetY: start * CHART_LIST_ITEM_HEIGHT,
      totalHeight: count.value * CHART_LIST_ITEM_HEIGHT
    }
  })

  watch(
    scrollEl,
    (el, _, onCleanup) => {
      if (!el) return
      const onScroll = () => measure()
      measure()
      el.addEventListener('scroll', onScroll, { passive: true })
      const ro = new ResizeObserver(() => measure())
      ro.observe(el)
      onCleanup(() => {
        el.removeEventListener('scroll', onScroll)
        ro.disconnect()
      })
    },
    { immediate: true }
  )

  watch([count, listEl], () => measure())

  return { enabled, range, measure }
}
