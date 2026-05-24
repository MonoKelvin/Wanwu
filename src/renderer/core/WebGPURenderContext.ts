import type { WebGPURenderer } from 'three/webgpu'
import * as THREE from 'three'
import { OffscreenGlBackend } from './OffscreenGlBackend'
import type { IRenderContext, RenderCapabilities } from '../types/context'
import type { RenderContextOptions } from './RenderContext'

/**
 * WebGPU 渲染上下文 — 主路径 WebGPURenderer + 离屏 WebGL 烘焙 PMREM。
 */
export class WebGPURenderContext implements IRenderContext {
  readonly backend = 'webgpu' as const
  readonly capabilities: RenderCapabilities = {
    pmrem: true,
    postProcessing: false,
    tslPostProcessing: true,
    pathTracing: false,
    planarReflection: false
  }
  readonly supportsPostProcessing = false
  readonly renderer: THREE.WebGLRenderer
  readonly effectsWebGL: THREE.WebGLRenderer
  readonly webgpuRenderer: WebGPURenderer
  readonly scene: THREE.Scene
  readonly camera: THREE.PerspectiveCamera
  readonly root: THREE.Group
  readonly pmrem: THREE.PMREMGenerator
  readonly domElement: HTMLCanvasElement

  private readonly offscreen = OffscreenGlBackend.get()

  private constructor(
    webgpuRenderer: WebGPURenderer,
    container: HTMLElement,
    options: RenderContextOptions = {}
  ) {
    this.webgpuRenderer = webgpuRenderer
    this.effectsWebGL = this.offscreen.renderer
    // 兼容旧 API：WebGPU 模式下勿用于 PlanarReflector / postprocessing 库
    this.renderer = this.effectsWebGL
    this.pmrem = this.offscreen.pmrem

    const width = Math.max(container.clientWidth, 1)
    const height = Math.max(container.clientHeight, 1)

    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x000000)
    this.root = new THREE.Group()
    this.scene.add(this.root)

    this.camera = new THREE.PerspectiveCamera(
      options.cameraFov ?? 50,
      width / height,
      options.cameraNear ?? 0.1,
      options.cameraFar ?? 200
    )

    this.webgpuRenderer.setPixelRatio(options.pixelRatio ?? 1)
    this.webgpuRenderer.setSize(width, height, false)
    if (options.toneMapping !== undefined) {
      this.webgpuRenderer.toneMapping = options.toneMapping
    }
    this.webgpuRenderer.toneMappingExposure = options.exposure ?? 1
    this.domElement = this.webgpuRenderer.domElement
    this.domElement.classList.add('block', 'h-full', 'w-full', 'touch-none')
    container.appendChild(this.domElement)
  }

  static async create(
    container: HTMLElement,
    options: RenderContextOptions = {}
  ): Promise<WebGPURenderContext> {
    const { WebGPURenderer } = await import('three/webgpu')
    const webgpu = new WebGPURenderer({
      antialias: options.antialias ?? true,
      powerPreference: 'high-performance'
    })
    await webgpu.init()
    return new WebGPURenderContext(webgpu, container, options)
  }

  render(): void {
    this.webgpuRenderer.render(this.scene, this.camera)
  }

  resize(): void {
    const parent = this.domElement.parentElement
    if (!parent) return
    const w = Math.max(parent.clientWidth, 1)
    const h = Math.max(parent.clientHeight, 1)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.webgpuRenderer.setSize(w, h, false)
  }

  dispose(): void {
    this.root.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh
        mesh.geometry?.dispose()
        const mat = mesh.material
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose())
        else mat?.dispose()
      }
    })
    this.scene.clear()
    this.webgpuRenderer.dispose()
    this.domElement.remove()
  }
}
