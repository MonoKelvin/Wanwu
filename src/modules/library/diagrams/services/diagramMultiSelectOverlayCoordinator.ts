import type LogicFlow from '@logicflow/core'
import {
  countSelectedDiagramNodes,
  getMultiSelectOverlayRect,
  setLiveMultiSelectCount,
  type DiagramMultiSelectLayout
} from '@modules/library/diagrams/lib/diagramMultiSelectResize'

export interface DiagramMultiSelectOverlayPorts {
  getLf(): LogicFlow | null
  getCanvasFrameEl(): HTMLElement | null
  onLayoutChange(layout: DiagramMultiSelectLayout): void
  refreshMultiSelectResize(): void
  refreshMultiSelectResizeNow(): DiagramMultiSelectLayout | undefined
}

/**
 * 多选包围盒 overlay：DOM 标记、布局 payload 与 rAF/microtask 刷新时序。
 */
export class DiagramMultiSelectOverlayCoordinator {
  private overlayLayoutPayload: DiagramMultiSelectLayout = { rect: null, nodeCount: 0 }
  private overlayLayoutRaf: number | null = null
  private overlayLayoutMicrotaskQueued = false
  private overlayLayoutRetryRaf: number | null = null

  constructor(private readonly ports: DiagramMultiSelectOverlayPorts) {}

  dispose(): void {
    if (this.overlayLayoutRaf != null) {
      cancelAnimationFrame(this.overlayLayoutRaf)
      this.overlayLayoutRaf = null
    }
    if (this.overlayLayoutRetryRaf != null) {
      cancelAnimationFrame(this.overlayLayoutRetryRaf)
      this.overlayLayoutRetryRaf = null
    }
    this.overlayLayoutMicrotaskQueued = false
    setLiveMultiSelectCount(0)
    this.ports.getCanvasFrameEl()?.removeAttribute('data-dg-multi-active')
  }

  getLayoutPayload(): DiagramMultiSelectLayout {
    return this.overlayLayoutPayload
  }

  syncDomFlags(nodeCount?: number): void {
    const frame = this.ports.getCanvasFrameEl()
    const lf = this.ports.getLf()
    if (!frame || !lf) return
    const count = nodeCount ?? countSelectedDiagramNodes(lf.graphModel, lf)
    setLiveMultiSelectCount(count)
    if (count >= 2) {
      frame.setAttribute('data-dg-multi-active', '')
    } else {
      frame.removeAttribute('data-dg-multi-active')
    }
  }

  resolveLayout(layout?: DiagramMultiSelectLayout): DiagramMultiSelectLayout {
    if (layout) {
      this.overlayLayoutPayload = layout
      return layout
    }
    const lf = this.ports.getLf()
    if (!lf) return this.overlayLayoutPayload
    this.overlayLayoutPayload = {
      rect: getMultiSelectOverlayRect(lf),
      nodeCount: countSelectedDiagramNodes(lf.graphModel, lf)
    }
    return this.overlayLayoutPayload
  }

  flushLayout(layout?: DiagramMultiSelectLayout): void {
    const payload = this.resolveLayout(layout)
    if (this.overlayLayoutRaf != null) {
      cancelAnimationFrame(this.overlayLayoutRaf)
      this.overlayLayoutRaf = null
    }
    this.ports.onLayoutChange(payload)
  }

  scheduleLayout(layout?: DiagramMultiSelectLayout): void {
    this.resolveLayout(layout)
    if (this.overlayLayoutRaf != null) return
    this.overlayLayoutRaf = requestAnimationFrame(() => {
      this.overlayLayoutRaf = null
      this.ports.onLayoutChange(this.overlayLayoutPayload)
    })
  }

  flushNow(): void {
    const lf = this.ports.getLf()
    if (!lf) return
    const layout = this.ports.refreshMultiSelectResizeNow()
    this.syncDomFlags(layout?.nodeCount)
    this.flushLayout(layout)
  }

  /**
   * mouseup 早于 click，LogicFlow 在 click 阶段才更新 isSelected，需延迟到选区稳定后再读。
   */
  scheduleRefresh(): void {
    this.flushNow()

    if (!this.overlayLayoutMicrotaskQueued) {
      this.overlayLayoutMicrotaskQueued = true
      queueMicrotask(() => {
        this.overlayLayoutMicrotaskQueued = false
        this.flushNow()
      })
    }

    if (this.overlayLayoutRetryRaf != null) {
      cancelAnimationFrame(this.overlayLayoutRetryRaf)
    }
    this.overlayLayoutRetryRaf = requestAnimationFrame(() => {
      this.flushNow()
      requestAnimationFrame(() => {
        this.overlayLayoutRetryRaf = null
        this.flushNow()
      })
    })
  }

  refreshDuringDrag(): void {
    this.ports.refreshMultiSelectResize()
    this.scheduleLayout()
  }
}
