import * as THREE from 'three'
import { gsap } from '../animation/gsap'
import type { RenderEngine } from '../core/RenderEngine'

export interface CinematicKeyframe {
  /** 相对时间轴的秒数 */
  at: number
  position?: THREE.Vector3Tuple
  target?: THREE.Vector3Tuple
  fov?: number
  ease?: string
}

export interface CinematicOptions {
  duration?: number
  ease?: string
  onUpdate?: () => void
  onComplete?: () => void
}

/**
 * 影视级摄像机动画 — GSAP 驱动 position / target / FOV。
 * 不含展厅业务逻辑，可在任意场景复用。
 */
export class CinematicCameraController {
  private timeline: gsap.core.Timeline | null = null

  constructor(private readonly engine: RenderEngine) {}

  get camera(): THREE.PerspectiveCamera {
    return this.engine.threeCamera
  }

  /** 沿关键帧序列运镜 */
  playSequence(keyframes: CinematicKeyframe[], options: CinematicOptions = {}): gsap.core.Timeline {
    this.kill()
    const tl = gsap.timeline({
      onUpdate: () => {
        this.engine.syncOrbitControls()
        options.onUpdate?.()
      },
      onComplete: options.onComplete
    })
    this.timeline = tl

    const sorted = [...keyframes].sort((a, b) => a.at - b.at)
    for (const frame of sorted) {
      const ease = frame.ease ?? options.ease ?? 'power2.inOut'
      if (frame.position) {
        tl.to(
          this.camera.position,
          { x: frame.position[0], y: frame.position[1], z: frame.position[2], ease },
          frame.at
        )
      }
      if (frame.target) {
        tl.to(
          this.engine.controls.target,
          { x: frame.target[0], y: frame.target[1], z: frame.target[2], ease },
          frame.at
        )
      }
      if (frame.fov !== undefined) {
        tl.to(
          this.camera,
          {
            fov: frame.fov,
            ease,
            onUpdate: () => this.camera.updateProjectionMatrix()
          },
          frame.at
        )
      }
    }

    if (options.duration !== undefined) {
      tl.duration(options.duration)
    }
    return tl
  }

  /** 单段平滑移动到目标位置 */
  flyTo(
    position: THREE.Vector3Tuple,
    target: THREE.Vector3Tuple,
    duration = 2,
    ease = 'power2.inOut',
    options: Pick<CinematicOptions, 'onUpdate' | 'onComplete'> = {}
  ): gsap.core.Timeline {
    this.kill()
    const tl = gsap.timeline({
      onUpdate: () => {
        this.engine.syncOrbitControls()
        options.onUpdate?.()
      },
      onComplete: options.onComplete
    })
    this.timeline = tl
    tl.to(this.camera.position, {
      x: position[0],
      y: position[1],
      z: position[2],
      duration,
      ease
    })
    tl.to(
      this.engine.controls.target,
      { x: target[0], y: target[1], z: target[2], duration, ease },
      0
    )
    return tl
  }

  setFov(fov: number, duration = 0): void {
    if (duration <= 0) {
      this.engine.setCameraFov(fov)
      return
    }
    gsap.to(this.camera, {
      fov,
      duration,
      ease: 'power2.inOut',
      onUpdate: () => this.camera.updateProjectionMatrix()
    })
  }

  kill(): void {
    this.timeline?.kill()
    this.timeline = null
  }

  dispose(): void {
    this.kill()
  }
}
