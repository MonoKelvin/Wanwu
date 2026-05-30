import type * as THREE from 'three'
import type { WebGPURenderer } from 'three/webgpu'
import type { RenderQuality } from '../types/engine'
import type { PostStackOptions } from '../types/pipeline'

interface BloomPassNode {
  strength: { value: number }
  threshold: { value: number }
  radius?: { value: number }
}

interface UniformNode {
  value: number
}

interface TslRenderPipeline {
  render(): void
  outputColorTransform?: boolean
}

export interface WebGPUPostStackBundle {
  renderPipeline: TslRenderPipeline
  bloomPass: BloomPassNode | null
  dofFocusDistance: UniformNode | null
  dofFocalLength: UniformNode | null
  dofBokehScale: UniformNode | null
}

/**
 * WebGPU TSL 后期栈 — Bloom / DoF / ToneMapping
 * @see examples/webgpu_postprocessing_bloom.html, webgpu_postprocessing_dof.html
 */
export class WebGPUPostStack {
  private readonly renderPipeline: TslRenderPipeline
  private readonly bloomPass: BloomPassNode | null
  private readonly dofFocusDistance: UniformNode | null
  private readonly dofFocalLength: UniformNode | null
  private readonly dofBokehScale: UniformNode | null
  private disposed = false

  private constructor(bundle: WebGPUPostStackBundle) {
    this.renderPipeline = bundle.renderPipeline
    this.bloomPass = bundle.bloomPass
    this.dofFocusDistance = bundle.dofFocusDistance
    this.dofFocalLength = bundle.dofFocalLength
    this.dofBokehScale = bundle.dofBokehScale
  }

  static async create(
    webgpuRenderer: WebGPURenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
    _quality: RenderQuality,
    options: PostStackOptions & { exposure?: number } = {}
  ): Promise<WebGPUPostStack> {
    const THREE = await import('three/webgpu')
    const { pass, uniform, toneMapping } = await import('three/tsl')
    const { bloom } = await import('three/addons/tsl/display/BloomNode.js')

    const renderPipeline = new THREE.RenderPipeline(webgpuRenderer)
    renderPipeline.outputColorTransform = false

    const scenePass = pass(scene, camera)
    let color = scenePass.getTextureNode('output')

    let dofFocus: UniformNode | null = null
    let dofFocal: UniformNode | null = null
    let dofBokeh: UniformNode | null = null

    if (options.enableDoF) {
      const { dof } = await import('three/addons/tsl/display/DepthOfFieldNode.js')
      const viewZ = scenePass.getViewZNode()
      dofFocus = uniform(options.dofFocusDistance ?? 7) as unknown as UniformNode
      dofFocal = uniform(120) as unknown as UniformNode
      dofBokeh = uniform(options.dofBokehScale ?? 2) as unknown as UniformNode
      color = (
        dof as unknown as (colorNode: typeof color, ...args: unknown[]) => typeof color
      )(color, viewZ, dofFocus, dofFocal, dofBokeh)
    }

    const bloomPass = bloom(
      color,
      options.bloomIntensity ?? 1,
      options.bloomLuminanceSmoothing ?? 0.1,
      1
    ) as BloomPassNode
    bloomPass.threshold.value = options.bloomLuminanceThreshold ?? 0
    bloomPass.strength.value = options.bloomIntensity ?? 1

    let output = (color as unknown as { add: (node: unknown) => typeof color }).add(bloomPass)

    if (options.enableToneMapping !== false) {
      output = toneMapping(
        THREE.ACESFilmicToneMapping,
        uniform(options.exposure ?? 1),
        output
      ) as unknown as typeof output
    }

    renderPipeline.outputNode = output

    return new WebGPUPostStack({
      renderPipeline,
      bloomPass,
      dofFocusDistance: dofFocus,
      dofFocalLength: dofFocal,
      dofBokehScale: dofBokeh
    })
  }

  render(): void {
    if (this.disposed) return
    this.renderPipeline.render()
  }

  setBloomIntensity(intensity: number): void {
    if (this.bloomPass) this.bloomPass.strength.value = intensity
  }

  setBloomThreshold(threshold: number): void {
    if (this.bloomPass) this.bloomPass.threshold.value = threshold
  }

  setBloomSmoothing(smoothing: number): void {
    if (this.bloomPass?.radius) this.bloomPass.radius.value = smoothing
  }

  setDoFFocus(distance: number, _range?: number): void {
    if (this.dofFocusDistance) this.dofFocusDistance.value = distance
  }

  setSize(_width: number, _height: number): void {}

  dispose(): void {
    this.disposed = true
  }
}
