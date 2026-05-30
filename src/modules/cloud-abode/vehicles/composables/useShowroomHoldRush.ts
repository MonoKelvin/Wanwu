import type { Ref } from 'vue'
import type { RenderEngine } from '@renderer/core/RenderEngine'
import type { ShowroomDirector } from '../services/showroomDirector'
import type { ShowroomViewMode } from '../types/showroom'

const HOLD_MS = 420
const DRAG_CANCEL_PX = 10

export interface HoldRushBindings {
  dispose: () => void
}

/**
 * 长按画布进入运动模式，松开恢复定制展示
 */
export function bindShowroomHoldRush(
  engine: RenderEngine,
  director: ShowroomDirector,
  viewMode: Ref<ShowroomViewMode>
): HoldRushBindings {
  const el = engine.domElement
  let holdTimer: ReturnType<typeof setTimeout> | null = null
  let driveFromHold = false
  let downX = 0
  let downY = 0

  const clearHoldTimer = (): void => {
    if (holdTimer !== null) {
      clearTimeout(holdTimer)
      holdTimer = null
    }
  }

  const canStartHold = (): boolean => {
    if (engine.isInteractLocked) return false
    if (viewMode.value === 'aero' || viewMode.value === 'radar' || viewMode.value === 'size') {
      return false
    }
    return true
  }

  const onPointerDown = (e: PointerEvent): void => {
    if (e.button !== 0) return
    if (!canStartHold()) return

    downX = e.clientX
    downY = e.clientY
    clearHoldTimer()

    holdTimer = setTimeout(() => {
      holdTimer = null
      if (!canStartHold()) return
      driveFromHold = true
      director.beginHoldDrive()
      if (driveFromHold) viewMode.value = 'drive'
    }, HOLD_MS)
  }

  const onPointerMove = (e: PointerEvent): void => {
    if (driveFromHold) return
    if (holdTimer === null) return
    const dx = e.clientX - downX
    const dy = e.clientY - downY
    if (dx * dx + dy * dy > DRAG_CANCEL_PX * DRAG_CANCEL_PX) {
      clearHoldTimer()
    }
  }

  const endHold = (): void => {
    clearHoldTimer()
    if (driveFromHold) {
      driveFromHold = false
      director.endHoldDrive()
      if (viewMode.value === 'drive') viewMode.value = 'customize'
    }
  }

  el.addEventListener('pointerdown', onPointerDown)
  el.addEventListener('pointermove', onPointerMove)
  el.addEventListener('pointerup', endHold)
  el.addEventListener('pointerleave', endHold)
  el.addEventListener('pointercancel', endHold)

  return {
    dispose: () => {
      clearHoldTimer()
      endHold()
      el.removeEventListener('pointerdown', onPointerDown)
      el.removeEventListener('pointermove', onPointerMove)
      el.removeEventListener('pointerup', endHold)
      el.removeEventListener('pointerleave', endHold)
      el.removeEventListener('pointercancel', endHold)
    }
  }
}
