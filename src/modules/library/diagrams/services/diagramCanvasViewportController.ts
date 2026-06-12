import type LogicFlow from '@logicflow/core'

export interface DiagramCanvasViewportPorts {
  getLf(): LogicFlow | null
  onViewportChange(): void
  /** 中键平移期间暂停框选 */
  onMiddlePanActiveChange(active: boolean): void
  centerContent(): void
}

/** 画布视口交互：中键平移、Shift+滚轮横向滚动 */
export class DiagramCanvasViewportController {
  private middlePanning = false

  isMiddlePanning(): boolean {
    return this.middlePanning
  }

  bindMiddleMousePan(el: HTMLElement, ports: DiagramCanvasViewportPorts): () => void {
    let panning = false
    let lastX = 0
    let lastY = 0
    let lastMiddleDownAt = 0
    let lastMiddleDownX = 0
    let lastMiddleDownY = 0

    const blockMiddlePointer = (event: PointerEvent) => {
      if (event.button !== 1) return
      event.preventDefault()
      event.stopImmediatePropagation()
    }

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 1) return
      blockMiddlePointer(event)

      const now = Date.now()
      const isDoubleClick =
        now - lastMiddleDownAt < 400 &&
        Math.hypot(event.clientX - lastMiddleDownX, event.clientY - lastMiddleDownY) < 6

      if (isDoubleClick) {
        lastMiddleDownAt = 0
        ports.centerContent()
        return
      }

      lastMiddleDownAt = now
      lastMiddleDownX = event.clientX
      lastMiddleDownY = event.clientY

      panning = true
      this.middlePanning = true
      ports.onMiddlePanActiveChange(true)
      lastX = event.clientX
      lastY = event.clientY
      el.style.cursor = 'grabbing'
    }

    const onPointerMove = (event: PointerEvent) => {
      const lf = ports.getLf()
      if (!panning || !lf) return
      const dx = event.clientX - lastX
      const dy = event.clientY - lastY
      lastX = event.clientX
      lastY = event.clientY
      lf.translate(dx, dy)
    }

    const endPan = () => {
      if (!panning) return
      panning = false
      this.middlePanning = false
      ports.onMiddlePanActiveChange(false)
      el.style.cursor = ''
      ports.onViewportChange()
    }

    const onPointerUp = (event: PointerEvent) => {
      if (event.button !== 1) return
      blockMiddlePointer(event)
      endPan()
    }

    const onAuxClick = (event: MouseEvent) => {
      if (event.button !== 1) return
      event.preventDefault()
      event.stopImmediatePropagation()
    }

    el.addEventListener('pointerdown', onPointerDown, true)
    el.addEventListener('pointerup', onPointerUp, true)
    el.addEventListener('auxclick', onAuxClick, true)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)

    return () => {
      el.removeEventListener('pointerdown', onPointerDown, true)
      el.removeEventListener('pointerup', onPointerUp, true)
      el.removeEventListener('auxclick', onAuxClick, true)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      el.style.cursor = ''
      this.middlePanning = false
    }
  }

  bindShiftWheelPan(el: HTMLElement, ports: DiagramCanvasViewportPorts): () => void {
    let stepScrollX = 0

    const onWheel = (event: WheelEvent) => {
      const lf = ports.getLf()
      if (!lf) return
      if (!event.shiftKey || event.ctrlKey || event.metaKey) return

      event.preventDefault()
      event.stopImmediatePropagation()

      const { transformModel, gridSize } = lf.graphModel
      const deltaX = event.deltaX !== 0 ? event.deltaX : event.deltaY
      stepScrollX += deltaX
      if (Math.abs(stepScrollX) >= gridSize) {
        const remainderX = stepScrollX % gridSize
        const moveDistance = stepScrollX - remainderX
        transformModel.translate(-moveDistance * transformModel.SCALE_X, 0)
        stepScrollX = remainderX
      }
      ports.onViewportChange()
    }

    el.addEventListener('wheel', onWheel, { capture: true, passive: false })
    return () => el.removeEventListener('wheel', onWheel, true)
  }
}
