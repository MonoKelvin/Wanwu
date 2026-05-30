import type { IRenderContext } from '../types/context'
import type { RenderContextOptions } from './RenderContext'
import { RenderContext } from './RenderContext'
import { WebGPURenderContext } from './WebGPURenderContext'
import { probeRenderBackend } from './RenderBackendProbe'
import type { RenderBackend } from '../types/engine'

export interface CreateRenderContextOptions extends RenderContextOptions {
  backend?: RenderBackend
}

/**
 * 异步创建渲染上下文 — WebGL（全功能）或 WebGPU（TSL Bloom + 离屏 PMREM）。
 */
export async function createRenderContext(
  container: HTMLElement,
  options: CreateRenderContextOptions = {}
): Promise<IRenderContext> {
  const requested = options.backend ?? 'webgl'
  const probe = await probeRenderBackend(requested)

  if (probe.effective === 'webgpu') {
    try {
      return await WebGPURenderContext.create(container, options)
    } catch (err) {
      console.warn('[createRenderContext] WebGPU 初始化失败，降级 WebGL', err)
    }
  }
  return new RenderContext(container, options)
}
