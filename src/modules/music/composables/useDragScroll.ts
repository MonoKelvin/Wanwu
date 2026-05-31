import { onUnmounted, ref, watch, type Ref } from 'vue'

const DRAG_THRESHOLD = 5

export function useDragScroll(containerRef: Ref<HTMLElement | null>) {
  const isDragging = ref(false)
  let pointerId: number | null = null
  let startX = 0
  let startScrollLeft = 0
  let moved = false
  let boundEl: HTMLElement | null = null

  function shouldSkipDrag(target: HTMLElement): boolean {
    if (target.closest('.ww-music-card-item')) return false
    return !!target.closest('button, a, input, textarea, [data-no-drag-scroll]')
  }

  function onPointerDown(e: PointerEvent) {
    const el = containerRef.value
    if (!el || e.button !== 0) return
    const target = e.target as HTMLElement
    if (shouldSkipDrag(target)) return
    isDragging.value = true
    moved = false
    pointerId = e.pointerId
    startX = e.clientX
    startScrollLeft = el.scrollLeft
    el.setPointerCapture(e.pointerId)
    el.classList.add('is-dragging')
  }

  function onPointerMove(e: PointerEvent) {
    const el = containerRef.value
    if (!el || !isDragging.value || e.pointerId !== pointerId) return
    const dx = e.clientX - startX
    if (Math.abs(dx) > DRAG_THRESHOLD) moved = true
    el.scrollLeft = startScrollLeft - dx
  }

  function onPointerUp(e: PointerEvent) {
    const el = containerRef.value
    if (!el || e.pointerId !== pointerId) return
    isDragging.value = false
    pointerId = null
    el.classList.remove('is-dragging')
    try {
      el.releasePointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
  }

  function bind(el: HTMLElement) {
    unbind()
    boundEl = el
    el.addEventListener('pointerdown', onPointerDown, { capture: true })
    el.addEventListener('pointermove', onPointerMove)
    el.addEventListener('pointerup', onPointerUp)
    el.addEventListener('pointercancel', onPointerUp)
  }

  function unbind() {
    if (!boundEl) return
    boundEl.removeEventListener('pointerdown', onPointerDown, { capture: true })
    boundEl.removeEventListener('pointermove', onPointerMove)
    boundEl.removeEventListener('pointerup', onPointerUp)
    boundEl.removeEventListener('pointercancel', onPointerUp)
    boundEl = null
  }

  watch(
    containerRef,
    (el) => {
      if (el) bind(el)
      else unbind()
    },
    { immediate: true }
  )

  onUnmounted(unbind)

  function shouldIgnoreClick(): boolean {
    const wasMoved = moved
    moved = false
    return wasMoved
  }

  return { isDragging, shouldIgnoreClick }
}
