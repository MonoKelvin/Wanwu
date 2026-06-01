import { onUnmounted, watch, type Ref } from 'vue'

const DEFAULT_FADE_PX = 58
const IMMERSION_FADE_PX = 76
const LERP = 0.32

function smoothstep(t: number): number {
  const x = Math.min(1, Math.max(0, t))
  return x * x * (3 - 2 * x)
}

/** 0 = 清晰区，1 = 贴近可视边缘 */
function edgeAmount(lineCenterY: number, viewHeight: number, fade: number): number {
  if (lineCenterY < fade) {
    return smoothstep((fade - lineCenterY) / fade)
  }
  if (lineCenterY > viewHeight - fade) {
    return smoothstep((lineCenterY - (viewHeight - fade)) / fade)
  }
  return 0
}

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t
}

export function useLyricsEdgeBlur(
  listRef: Ref<HTMLElement | null>,
  fadePx: Ref<number> | number = DEFAULT_FADE_PX
) {
  let raf = 0
  const opacityState = new WeakMap<HTMLElement, number>()

  function resolveFade(list: HTMLElement): number {
    const configured = typeof fadePx === 'number' ? fadePx : fadePx.value
    return Math.min(configured, Math.max(48, list.clientHeight * 0.24))
  }

  function updateLineEdgeEffects(): boolean {
    const list = listRef.value
    if (!list) return false

    const fade = resolveFade(list)
    const rect = list.getBoundingClientRect()
    const viewHeight = rect.height
    let needsMore = false

    for (const li of list.querySelectorAll<HTMLElement>('li')) {
      const liRect = li.getBoundingClientRect()
      const lineCenterY = (liRect.top + liRect.bottom) / 2 - rect.top
      const edge = edgeAmount(lineCenterY, viewHeight, fade)
      const targetOpacity = 1 - edge

      const prev = opacityState.get(li) ?? targetOpacity
      const opacity = lerp(prev, targetOpacity, LERP)
      opacityState.set(li, opacity)

      if (Math.abs(opacity - targetOpacity) > 0.025) {
        needsMore = true
      }

      if (opacity > 0.992) {
        li.style.opacity = ''
        li.style.filter = ''
        opacityState.delete(li)
      } else {
        li.style.filter = ''
        li.style.opacity = opacity.toFixed(3)
      }
    }

    return needsMore
  }

  function runEdgeFadeFrame() {
    const needsMore = updateLineEdgeEffects()
    if (needsMore) {
      raf = requestAnimationFrame(runEdgeFadeFrame)
    } else {
      raf = 0
    }
  }

  function refreshEdgeBlur() {
    if (raf) cancelAnimationFrame(raf)
    raf = requestAnimationFrame(runEdgeFadeFrame)
  }

  watch(listRef, (el, _, onCleanup) => {
    if (!el) return
    el.addEventListener('scroll', refreshEdgeBlur, { passive: true })
    const ro = new ResizeObserver(refreshEdgeBlur)
    ro.observe(el)
    refreshEdgeBlur()
    onCleanup(() => {
      el.removeEventListener('scroll', refreshEdgeBlur)
      ro.disconnect()
      if (raf) cancelAnimationFrame(raf)
      raf = 0
    })
  })

  if (typeof fadePx !== 'number') {
    watch(fadePx, refreshEdgeBlur)
  }

  onUnmounted(() => {
    if (raf) cancelAnimationFrame(raf)
  })

  return { refreshEdgeBlur }
}

export function lyricsEdgeFadePx(variant: 'list' | 'duet' | 'immersion' | undefined): number {
  return variant === 'immersion' ? IMMERSION_FADE_PX : DEFAULT_FADE_PX
}
