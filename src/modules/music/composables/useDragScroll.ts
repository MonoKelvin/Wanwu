import { onUnmounted, ref, watch, type Ref } from 'vue'

const DRAG_THRESHOLD = 6
const MOMENTUM_FRICTION = 0.92
const MOMENTUM_MIN = 0.08

export function useDragScroll(containerRef: Ref<HTMLElement | null>) {
  const isDragging = ref(false)
  let pointerId: number | null = null
  let startX = 0
  let startScrollLeft = 0
  let dragActive = false
  let suppressClick = false
  let boundEl: HTMLElement | null = null
  let lastX = 0
  let lastTime = 0
  let velocity = 0
  let momentumFrame: number | null = null
  let dragFrame: number | null = null
  let pendingScrollLeft = 0

  function stopMomentum() {
    if (momentumFrame != null) {
      cancelAnimationFrame(momentumFrame)
      momentumFrame = null
    }
  }

  function clampScroll(el: HTMLElement) {
    const max = Math.max(0, el.scrollWidth - el.clientWidth)
    el.scrollLeft = Math.min(max, Math.max(0, el.scrollLeft))
  }

  function applyMomentum() {
    const el = containerRef.value
    if (!el) {
      momentumFrame = null
      return
    }
    if (Math.abs(velocity) < MOMENTUM_MIN) {
      momentumFrame = null
      return
    }
    el.scrollLeft -= velocity * 16
    clampScroll(el)
    velocity *= MOMENTUM_FRICTION
    momentumFrame = requestAnimationFrame(applyMomentum)
  }

  function shouldSkipDrag(target: HTMLElement): boolean {
    return !!target.closest(
      'button, a, input, textarea, select, [data-no-drag-scroll], .ww-music-glass-play-btn, .ww-music-cover__play-glass, .ww-music-cover__shade'
    )
  }

  function onPointerDown(e: PointerEvent) {
    const el = containerRef.value
    if (!el || e.button !== 0) return
    const target = e.target as HTMLElement
    if (shouldSkipDrag(target)) return

    stopMomentum()
    if (dragFrame != null) {
      cancelAnimationFrame(dragFrame)
      dragFrame = null
    }

    dragActive = false
    suppressClick = false
    pointerId = e.pointerId
    startX = e.clientX
    lastX = e.clientX
    lastTime = performance.now()
    velocity = 0
    startScrollLeft = el.scrollLeft
    pendingScrollLeft = el.scrollLeft
  }

  function onPointerMove(e: PointerEvent) {
    const el = containerRef.value
    if (!el || e.pointerId !== pointerId) return

    const dx = e.clientX - startX
    if (!dragActive) {
      if (Math.abs(dx) <= DRAG_THRESHOLD) return
      dragActive = true
      suppressClick = true
      isDragging.value = true
      el.setPointerCapture(e.pointerId)
      el.classList.add('is-dragging')
    }

    const now = performance.now()
    const dt = now - lastTime
    if (dt > 0) {
      velocity = (e.clientX - lastX) / dt
    }
    lastX = e.clientX
    lastTime = now

    pendingScrollLeft = startScrollLeft - dx
    if (dragFrame == null) {
      dragFrame = requestAnimationFrame(() => {
        dragFrame = null
        if (!containerRef.value) return
        containerRef.value.scrollLeft = pendingScrollLeft
        clampScroll(containerRef.value)
      })
    }
  }

  function onPointerUp(e: PointerEvent) {
    const el = containerRef.value
    if (!el || e.pointerId !== pointerId) return

    if (dragActive) {
      try {
        el.releasePointerCapture(e.pointerId)
      } catch {
        /* ignore */
      }
      el.classList.remove('is-dragging')
      if (Math.abs(velocity) >= MOMENTUM_MIN) {
        stopMomentum()
        momentumFrame = requestAnimationFrame(applyMomentum)
      }
    }

    dragActive = false
    isDragging.value = false
    pointerId = null
  }

  function bind(el: HTMLElement) {
    unbind()
    boundEl = el
    el.addEventListener('pointerdown', onPointerDown)
    el.addEventListener('pointermove', onPointerMove)
    el.addEventListener('pointerup', onPointerUp)
    el.addEventListener('pointercancel', onPointerUp)
  }

  function unbind() {
    stopMomentum()
    if (dragFrame != null) {
      cancelAnimationFrame(dragFrame)
      dragFrame = null
    }
    if (!boundEl) return
    boundEl.removeEventListener('pointerdown', onPointerDown)
    boundEl.removeEventListener('pointermove', onPointerMove)
    boundEl.removeEventListener('pointerup', onPointerUp)
    boundEl.removeEventListener('pointercancel', onPointerUp)
    boundEl.classList.remove('is-dragging')
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
    const ignore = suppressClick
    suppressClick = false
    return ignore
  }

  return { isDragging, shouldIgnoreClick }
}
