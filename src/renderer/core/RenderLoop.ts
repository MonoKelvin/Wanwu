import * as THREE from 'three'

export type FrameCallback = (dt: number, elapsed: number) => void

/**
 * 独立渲染循环 — 管理 RAF、delta time 与帧回调队列。
 * 不含任何业务逻辑，仅负责调度。
 */
export class RenderLoop {
  private readonly clock = new THREE.Clock()
  private animationId = 0
  private running = false
  private disposed = false
  private readonly preRender: FrameCallback[] = []
  private readonly postRender: FrameCallback[] = []

  /** 每帧渲染前回调（子系统 update、反射 pass 等） */
  onPreRender(callback: FrameCallback): () => void {
    this.preRender.push(callback)
    return () => {
      const i = this.preRender.indexOf(callback)
      if (i >= 0) this.preRender.splice(i, 1)
    }
  }

  /** 每帧渲染后回调 */
  onPostRender(callback: FrameCallback): () => void {
    this.postRender.push(callback)
    return () => {
      const i = this.postRender.indexOf(callback)
      if (i >= 0) this.postRender.splice(i, 1)
    }
  }

  start(tick: FrameCallback): void {
    if (this.running || this.disposed) return
    this.running = true
    this.clock.start()

    const loop = (): void => {
      if (this.disposed) return
      this.animationId = requestAnimationFrame(loop)
      const elapsed = this.clock.getElapsedTime()
      const dt = this.clock.getDelta()

      for (const cb of this.preRender) cb(dt, elapsed)
      tick(dt, elapsed)
      for (const cb of this.postRender) cb(dt, elapsed)
    }
    this.animationId = requestAnimationFrame(loop)
  }

  stop(): void {
    this.running = false
    cancelAnimationFrame(this.animationId)
  }

  dispose(): void {
    this.disposed = true
    this.stop()
    this.preRender.length = 0
    this.postRender.length = 0
  }
}
