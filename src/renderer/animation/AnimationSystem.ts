import * as THREE from 'three'
import { gsap } from 'gsap'

/**
 * 动画系统 — 封装 THREE.AnimationMixer 与 GSAP 时间轴注册。
 * 不含展厅/车辆等业务动画逻辑。
 */
export class AnimationSystem {
  private readonly mixers = new Map<THREE.Object3D, THREE.AnimationMixer>()
  private readonly gsapTimelines: gsap.core.Timeline[] = []

  /** 为 Object3D 创建或获取 AnimationMixer */
  getMixer(root: THREE.Object3D): THREE.AnimationMixer {
    let mixer = this.mixers.get(root)
    if (!mixer) {
      mixer = new THREE.AnimationMixer(root)
      this.mixers.set(root, mixer)
    }
    return mixer
  }

  /** 播放 GLTF 骨骼/变形动画 */
  playClip(
    root: THREE.Object3D,
    clip: THREE.AnimationClip,
    options: { loop?: THREE.AnimationActionLoopStyles; timeScale?: number } = {}
  ): THREE.AnimationAction {
    const mixer = this.getMixer(root)
    const action = mixer.clipAction(clip)
    if (options.loop !== undefined) action.setLoop(options.loop, 1)
    if (options.timeScale !== undefined) action.timeScale = options.timeScale
    action.play()
    return action
  }

  /** 注册 GSAP 时间轴以便统一 kill/dispose */
  registerTimeline(timeline: gsap.core.Timeline): gsap.core.Timeline {
    this.gsapTimelines.push(timeline)
    return timeline
  }

  /** 每帧更新所有 AnimationMixer */
  update(dt: number): void {
    for (const mixer of this.mixers.values()) {
      mixer.update(dt)
    }
  }

  killAllTimelines(): void {
    for (const tl of this.gsapTimelines) tl.kill()
    this.gsapTimelines.length = 0
  }

  dispose(): void {
    this.killAllTimelines()
    for (const mixer of this.mixers.values()) mixer.stopAllAction()
    this.mixers.clear()
  }
}

export { gsap } from './gsap'
