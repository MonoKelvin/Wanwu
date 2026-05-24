import type * as THREE from 'three'
import type { IRenderContext } from '../types/context'

export interface PathTracingOptions {
  samplesPerFrame?: number
  bounces?: number
  transmissiveBounces?: number
  maxSamples?: number
  tiles?: [number, number]
}

interface PathTracerLike {
  samples: number
  bounces: number
  renderSample(): void
  updateCamera(): void
  setBVHWorker(worker: unknown): void
  setSceneAsync(
    scene: THREE.Scene,
    camera: THREE.Camera,
    options?: { onProgress?: (v: number) => void }
  ): Promise<void>
  reset(): void
  dispose?(): void
}

/**
 * WebGL 路径追踪 — three-gpu-pathtracer（需 WebGL 后端 + three r180+）
 * 启用后由 RenderPipeline 调用 renderSample() 替代常规定向渲染。
 */
export class PathTracingController {
  private enabled = false
  private ready = false
  private tracer: PathTracerLike | null = null
  private loadError: string | null = null

  constructor(
    private readonly context: IRenderContext,
    private readonly options: PathTracingOptions = {}
  ) {}

  get isEnabled(): boolean {
    return this.enabled
  }

  get isReady(): boolean {
    return this.ready
  }

  get sampleCount(): number {
    return this.tracer?.samples ?? 0
  }

  get loadErrorMessage(): string | null {
    return this.loadError
  }

  get isSupported(): boolean {
    return this.context.backend === 'webgl' && this.context.capabilities.pathTracing
  }

  shouldRender(): boolean {
    return this.enabled && this.ready && this.tracer != null
  }

  async prepare(scene: THREE.Scene, camera: THREE.Camera): Promise<boolean> {
    if (!this.isSupported) {
      this.loadError = '路径追踪需要 WebGL 主后端'
      return false
    }

    try {
      const [{ WebGLPathTracer }, { ParallelMeshBVHWorker }] = await Promise.all([
        import('three-gpu-pathtracer'),
        import('three-mesh-bvh/worker')
      ])

      this.tracer?.dispose?.()
      const tracer = new WebGLPathTracer(this.context.effectsWebGL) as unknown as PathTracerLike
      tracer.bounces = this.options.bounces ?? 6
      tracer.setBVHWorker(new ParallelMeshBVHWorker())

      const tiles = this.options.tiles ?? [2, 2]
      const t = tracer as PathTracerLike & { tiles?: { set: (x: number, y: number) => void } }
      t.tiles?.set(tiles[0], tiles[1])

      await tracer.setSceneAsync(scene, camera)
      this.tracer = tracer
      this.ready = true
      this.loadError = null
      return true
    } catch (err) {
      this.ready = false
      this.loadError =
        err instanceof Error ? err.message : 'three-gpu-pathtracer 加载失败'
      console.warn('[PathTracingController]', this.loadError)
      return false
    }
  }

  async setEnabled(enabled: boolean, scene?: THREE.Scene, camera?: THREE.Camera): Promise<void> {
    if (!enabled) {
      this.enabled = false
      this.tracer?.reset()
      return
    }

    if (!this.isSupported) {
      console.warn('[PathTracingController]', this.loadError ?? '路径追踪不可用')
      return
    }

    if (!this.ready && scene && camera) {
      const ok = await this.prepare(scene, camera)
      if (!ok) return
    }

    this.enabled = true
    this.tracer?.reset()
  }

  renderSample(): void {
    if (!this.shouldRender() || !this.tracer) return
    const max = this.options.maxSamples ?? 256
    if (this.tracer.samples >= max) return
    for (let i = 0; i < (this.options.samplesPerFrame ?? 1); i++) {
      if (this.tracer.samples >= max) break
      this.tracer.renderSample()
    }
  }

  syncCamera(): void {
    if (this.ready) this.tracer?.updateCamera()
  }

  reset(): void {
    this.tracer?.reset()
  }

  dispose(): void {
    this.enabled = false
    this.ready = false
    this.tracer?.dispose?.()
    this.tracer = null
  }
}
