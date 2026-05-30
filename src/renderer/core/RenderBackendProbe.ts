import type { RenderBackend } from '../types/engine'

/** 探测用最小 WebGPU 类型（DOM lib 未包含 GPU 接口） */
interface GPUAdapterLike {
  readonly limits?: unknown
}

interface GPULike {
  requestAdapter(options?: {
    powerPreference?: 'low-power' | 'high-performance'
  }): Promise<GPUAdapterLike | null>
}

type NavigatorWithWebGPU = Navigator & { gpu?: GPULike }

export interface BackendProbeResult {
  requested: RenderBackend
  effective: RenderBackend
  webgpuAvailable: boolean
  webgl2Available: boolean
}

/**
 * 探测 WebGPU / WebGL2 可用性。
 * WebGPURenderer 在 three.js 中可自动降级 WebGL2，此处仅做能力检测供 RenderEngine 记录。
 */
export async function probeRenderBackend(
  requested: RenderBackend = 'webgl'
): Promise<BackendProbeResult> {
  const webgl2Available = detectWebGL2()
  const webgpuAvailable = await detectWebGPU()

  let effective: RenderBackend = 'webgl'
  if (requested === 'webgpu' && webgpuAvailable) {
    effective = 'webgpu'
  }

  return { requested, effective, webgpuAvailable, webgl2Available }
}

function detectWebGL2(): boolean {
  if (typeof document === 'undefined') return true
  try {
    const canvas = document.createElement('canvas')
    return !!canvas.getContext('webgl2')
  } catch {
    return false
  }
}

async function detectWebGPU(): Promise<boolean> {
  if (typeof navigator === 'undefined') return false
  const gpu = (navigator as NavigatorWithWebGPU).gpu
  if (!gpu) return false
  try {
    const adapter = await gpu.requestAdapter({ powerPreference: 'high-performance' })
    return adapter !== null
  } catch {
    return false
  }
}

/**
 * 尝试初始化 WebGPURenderer（three/webgpu），失败则返回 null。
 * P3 将接入 RenderContext 双后端；P2 仅提供探测与工厂入口。
 */
export async function tryCreateWebGPURenderer(
  options: { antialias?: boolean } = {}
): Promise<import('three/webgpu').WebGPURenderer | null> {
  const probe = await probeRenderBackend('webgpu')
  if (!probe.webgpuAvailable) return null

  try {
    const { WebGPURenderer } = await import('three/webgpu')
    const renderer = new WebGPURenderer({ antialias: options.antialias ?? true })
    await renderer.init()
    return renderer
  } catch {
    return null
  }
}
