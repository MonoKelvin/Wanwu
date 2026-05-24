import type { IRenderContext } from '../types/context'
import type { EnvironmentManager } from '../lighting/EnvironmentManager'
import type { PostStack } from '../pipeline/PostStack'
import type { WebGPUPostStack } from '../pipeline/WebGPUPostStack'
import type { ReflectionSystem } from '../reflection/ReflectionSystem'
import type { AnimationSystem } from '../animation/AnimationSystem'
import type { PathTracingController } from '../path/PathTracingController'
import { Vector2 } from 'three'

export interface RenderPipelineDeps {
  context: IRenderContext
  postStack: PostStack | null
  getWebgpuPostStack: () => WebGPUPostStack | null
  environment: EnvironmentManager
  reflection: ReflectionSystem
  animation: AnimationSystem
  pathTracing?: PathTracingController | null
}

/** 渲染管线编排 — 环境 / 反射 / 动画 / 主渲染 / 后期 */
export class RenderPipeline {
  constructor(private readonly deps: RenderPipelineDeps) {}

  render(_dt: number): void {
    const {
      context,
      postStack,
      getWebgpuPostStack,
      environment,
      reflection,
      animation,
      pathTracing
    } = this.deps

    environment.update()
    try {
      reflection.update()
    } catch (err) {
      console.error('[RenderPipeline] 反射 pass 失败', err)
    }
    animation.update(_dt)

    if (pathTracing?.shouldRender()) {
      pathTracing.renderSample()
      return
    }

    const webgpuPostStack = getWebgpuPostStack()
    if (webgpuPostStack && context.backend === 'webgpu') {
      webgpuPostStack.render()
      return
    }

    if (postStack && context.capabilities.postProcessing) {
      try {
        postStack.updateCamera(context.camera)
        postStack.render()
      } catch (err) {
        console.error('[RenderPipeline] PostStack 渲染失败，回退直出', err)
        context.render()
      }
      return
    }

    context.render()
  }

  resize(): void {
    this.deps.context.resize()
    const renderer = this.deps.context.effectsWebGL
    const size = new Vector2()
    renderer.getDrawingBufferSize(size)
    this.deps.postStack?.setSize(Math.floor(size.width), Math.floor(size.height))
    this.deps.getWebgpuPostStack()?.setSize(
      this.deps.context.domElement.clientWidth,
      this.deps.context.domElement.clientHeight
    )
  }

  dispose(): void {
    this.deps.postStack?.dispose()
    this.deps.getWebgpuPostStack()?.dispose()
    this.deps.environment.dispose()
    this.deps.reflection.dispose()
    this.deps.animation.dispose()
    this.deps.context.dispose()
  }
}
