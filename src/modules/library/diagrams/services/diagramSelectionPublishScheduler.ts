/**
 * 选区推送调度器：管理 publish 世代号与 microtask/rAF 时序，
 * 避免 pointerup 与 node:click 竞态导致属性面板滞留旧选区。
 */
export class DiagramSelectionPublishScheduler {
  private epoch = 0
  private publishRaf: number | null = null
  private pointerSyncRaf: number | null = null

  getEpoch(): number {
    return this.epoch
  }

  bumpEpoch(): number {
    this.epoch += 1
    return this.epoch
  }

  cancelScheduled(): void {
    if (this.publishRaf != null) {
      cancelAnimationFrame(this.publishRaf)
      this.publishRaf = null
    }
    if (this.pointerSyncRaf != null) {
      cancelAnimationFrame(this.pointerSyncRaf)
      this.pointerSyncRaf = null
    }
  }

  /**
   * 用户点选/框选后推送选区：立即 + microtask + rAF 三级确认。
   * node:click 回调末尾已更新 LF 选区，可安全立即 publish。
   */
  scheduleUserSelectionPublish(publish: () => void, onAfterRaf?: () => void): void {
    publish()
    queueMicrotask(() => {
      publish()
      this.publishRaf = requestAnimationFrame(() => {
        this.publishRaf = null
        publish()
        onAfterRaf?.()
      })
    })
  }

  /**
   * pointerup 兜底：LF 选区框已切换但 node:click 未推送时补推。
   * pointerup 早于 click，须延迟到 LF 选区稳定后再读。
   */
  bindPointerUpSync(
    el: HTMLElement,
    options: {
      shouldSkip: () => boolean
      getLiveSelectionKey: () => string
      getLastSelectionKey: () => string
      publishIfChanged: () => void
    }
  ): () => void {
    const scheduleSync = () => {
      this.cancelPointerSyncRaf()
      const epochAtSchedule = this.epoch

      const tryPublish = () => {
        if (options.shouldSkip()) return
        if (epochAtSchedule !== this.epoch) return
        if (options.getLiveSelectionKey() !== options.getLastSelectionKey()) {
          options.publishIfChanged()
        }
      }

      queueMicrotask(() => {
        if (epochAtSchedule !== this.epoch) return
        tryPublish()
        this.pointerSyncRaf = requestAnimationFrame(() => {
          this.pointerSyncRaf = null
          if (epochAtSchedule !== this.epoch) return
          tryPublish()
        })
      })
    }

    const onPointerUp = (e: PointerEvent) => {
      if (e.button !== 0) return
      scheduleSync()
    }

    el.addEventListener('pointerup', onPointerUp, { passive: true })
    return () => {
      this.cancelPointerSyncRaf()
      el.removeEventListener('pointerup', onPointerUp)
    }
  }

  private cancelPointerSyncRaf(): void {
    if (this.pointerSyncRaf != null) {
      cancelAnimationFrame(this.pointerSyncRaf)
      this.pointerSyncRaf = null
    }
  }
}
