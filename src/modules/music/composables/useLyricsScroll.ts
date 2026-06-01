import { onUnmounted, ref, watch, type Ref } from 'vue'

const DRAG_THRESHOLD = 10
const MOMENTUM_FRICTION = 0.92
const MOMENTUM_MIN = 0.08
const AUTO_SCROLL_RESUME_MS = 2400
const ACTIVE_LINE_HALF = 26

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

function lineIndexFromPointerTarget(list: HTMLElement, target: EventTarget | null): number | null {
  if (!(target instanceof Element)) return null
  const li = target.closest('li[data-idx]')
  if (!li || !list.contains(li)) return null
  const idx = Number((li as HTMLElement).dataset.idx)
  return Number.isFinite(idx) ? idx : null
}

export function useLyricsScroll(
  listRef: Ref<HTMLElement | null>,
  onResumeAutoScroll: () => void,
  onScroll?: () => void,
  onTapLine?: (index: number) => void
) {
  const edgePad = ref(0)
  const isDragging = ref(false)

  let pointerId: number | null = null
  let startY = 0
  let startScrollTop = 0
  let dragActive = false
  let pointerCaptured = false
  let suppressAutoScroll = false
  let resumeTimer: ReturnType<typeof setTimeout> | null = null
  let lastY = 0
  let lastTime = 0
  let velocity = 0
  let momentumFrame: number | null = null
  let scrollFrame: number | null = null
  let boundEl: HTMLElement | null = null
  let resizeObserver: ResizeObserver | null = null

  function notifyScroll() {
    onScroll?.()
  }

  function stopMomentum() {
    if (momentumFrame != null) {
      cancelAnimationFrame(momentumFrame)
      momentumFrame = null
    }
  }

  function stopScrollAnim() {
    if (scrollFrame != null) {
      cancelAnimationFrame(scrollFrame)
      scrollFrame = null
    }
  }

  function clampScroll(el: HTMLElement) {
    const max = Math.max(0, el.scrollHeight - el.clientHeight)
    el.scrollTop = Math.min(max, Math.max(0, el.scrollTop))
  }

  function releaseCapture(el: HTMLElement) {
    if (!pointerCaptured || pointerId == null) return
    try {
      el.releasePointerCapture(pointerId)
    } catch {
      /* ignore */
    }
    pointerCaptured = false
  }

  function measureEdgePad() {
    const el = listRef.value
    if (!el || el.clientHeight <= 0) return
    edgePad.value = Math.max(0, el.clientHeight / 2 - ACTIVE_LINE_HALF)
  }

  function targetScrollForIndex(idx: number): number | null {
    const list = listRef.value
    if (!list || idx < 0) return null
    const line = list.querySelector(`[data-idx="${idx}"]`) as HTMLElement | null
    if (!line) return null
    const listRect = list.getBoundingClientRect()
    const lineRect = line.getBoundingClientRect()
    const lineCenter = lineRect.top - listRect.top + list.scrollTop + lineRect.height / 2
    const target = lineCenter - list.clientHeight / 2
    const max = Math.max(0, list.scrollHeight - list.clientHeight)
    return Math.max(0, Math.min(max, target))
  }

  function scrollToIndex(idx: number, smooth = true) {
    if (suppressAutoScroll || idx < 0) return
    const list = listRef.value
    const target = targetScrollForIndex(idx)
    if (!list || target == null) return

    stopMomentum()
    stopScrollAnim()

    if (!smooth) {
      list.scrollTop = target
      notifyScroll()
      return
    }

    const start = list.scrollTop
    const diff = target - start
    if (Math.abs(diff) < 0.5) {
      notifyScroll()
      return
    }

    const duration = Math.min(680, Math.max(320, Math.abs(diff) * 0.55))
    const startTime = performance.now()

    function frame(now: number) {
      const listEl = listRef.value
      if (!listEl) {
        scrollFrame = null
        return
      }
      const t = Math.min(1, (now - startTime) / duration)
      listEl.scrollTop = start + diff * easeOutCubic(t)
      notifyScroll()
      if (t < 1) scrollFrame = requestAnimationFrame(frame)
      else scrollFrame = null
    }

    scrollFrame = requestAnimationFrame(frame)
  }

  function pauseAutoScroll() {
    suppressAutoScroll = true
    if (resumeTimer) clearTimeout(resumeTimer)
  }

  function scheduleAutoScrollResume() {
    if (resumeTimer) clearTimeout(resumeTimer)
    resumeTimer = setTimeout(() => {
      suppressAutoScroll = false
      onResumeAutoScroll()
    }, AUTO_SCROLL_RESUME_MS)
  }

  function applyMomentum() {
    const el = listRef.value
    if (!el) {
      momentumFrame = null
      return
    }
    if (Math.abs(velocity) < MOMENTUM_MIN) {
      momentumFrame = null
      scheduleAutoScrollResume()
      return
    }
    el.scrollTop -= velocity * 16
    clampScroll(el)
    notifyScroll()
    velocity *= MOMENTUM_FRICTION
    momentumFrame = requestAnimationFrame(applyMomentum)
  }

  function onPointerDown(e: PointerEvent) {
    const el = listRef.value
    if (!el || e.button !== 0) return

    stopMomentum()
    stopScrollAnim()
    pauseAutoScroll()

    dragActive = false
    pointerCaptured = false
    pointerId = e.pointerId
    startY = e.clientY
    lastY = e.clientY
    lastTime = performance.now()
    velocity = 0
    startScrollTop = el.scrollTop
  }

  function onPointerMove(e: PointerEvent) {
    const el = listRef.value
    if (!el || pointerId !== e.pointerId) return

    const dy = e.clientY - startY
    if (!dragActive && Math.abs(dy) > DRAG_THRESHOLD) {
      dragActive = true
      isDragging.value = true
      try {
        el.setPointerCapture(e.pointerId)
        pointerCaptured = true
      } catch {
        /* ignore */
      }
    }
    if (!dragActive) return

    e.preventDefault()

    const now = performance.now()
    const dt = Math.max(8, now - lastTime)
    velocity = (e.clientY - lastY) / dt
    lastY = e.clientY
    lastTime = now

    el.scrollTop = startScrollTop - dy
    clampScroll(el)
    notifyScroll()
  }

  function onPointerUp(e: PointerEvent) {
    const el = listRef.value
    if (!el || pointerId !== e.pointerId) return

    const wasDrag = dragActive
    releaseCapture(el)

    pointerId = null
    isDragging.value = false
    dragActive = false

    if (!wasDrag) {
      const idx = lineIndexFromPointerTarget(el, e.target)
      if (idx != null) onTapLine?.(idx)
    } else if (Math.abs(velocity) > MOMENTUM_MIN) {
      momentumFrame = requestAnimationFrame(applyMomentum)
    } else {
      scheduleAutoScrollResume()
    }
  }

  function clearAutoScrollPause() {
    suppressAutoScroll = false
    if (resumeTimer) {
      clearTimeout(resumeTimer)
      resumeTimer = null
    }
  }

  function bindList(el: HTMLElement | null) {
    if (boundEl) {
      boundEl.removeEventListener('pointerdown', onPointerDown)
      boundEl.removeEventListener('pointermove', onPointerMove)
      boundEl.removeEventListener('pointerup', onPointerUp)
      boundEl.removeEventListener('pointercancel', onPointerUp)
    }
    boundEl = el
    if (!el) return
    el.addEventListener('pointerdown', onPointerDown)
    el.addEventListener('pointermove', onPointerMove)
    el.addEventListener('pointerup', onPointerUp)
    el.addEventListener('pointercancel', onPointerUp)
    measureEdgePad()
  }

  watch(listRef, (el, _, onCleanup) => {
    bindList(el)
    measureEdgePad()
    resizeObserver?.disconnect()
    resizeObserver = new ResizeObserver(() => measureEdgePad())
    if (el) resizeObserver.observe(el)
    onCleanup(() => resizeObserver?.disconnect())
  })

  onUnmounted(() => {
    stopMomentum()
    stopScrollAnim()
    if (resumeTimer) clearTimeout(resumeTimer)
    resizeObserver?.disconnect()
    bindList(null)
  })

  return {
    edgePad,
    isDragging,
    scrollToIndex,
    measureEdgePad,
    clearAutoScrollPause
  }
}
