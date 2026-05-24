import * as THREE from 'three'
import type { IRenderContext, RenderCapabilities } from '../types/context'

export interface RenderContextOptions {
  cameraFov?: number
  cameraNear?: number
  cameraFar?: number
  antialias?: boolean
  pixelRatio?: number
  toneMapping?: THREE.ToneMapping
  exposure?: number
}

/**
 * WebGL 渲染上下文 — 完整 postprocessing / PMREM 支持。
 */
export class RenderContext implements IRenderContext {
  readonly backend = 'webgl' as const
  readonly capabilities: RenderCapabilities = {
    pmrem: true,
    postProcessing: true,
    tslPostProcessing: false,
    pathTracing: true,
    planarReflection: true
  }
  readonly supportsPostProcessing = true
  readonly effectsWebGL: THREE.WebGLRenderer
  readonly webgpuRenderer = null
  readonly renderer: THREE.WebGLRenderer
  readonly scene: THREE.Scene
  readonly camera: THREE.PerspectiveCamera
  readonly root: THREE.Group
  readonly pmrem: THREE.PMREMGenerator
  readonly domElement: HTMLCanvasElement

  constructor(container: HTMLElement, options: RenderContextOptions = {}) {
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

    this.renderer = new THREE.WebGLRenderer({
      antialias: options.antialias ?? true,
      alpha: false,
      powerPreference: 'high-performance'
    })
    this.effectsWebGL = this.renderer
    this.renderer.setPixelRatio(options.pixelRatio ?? 1)
    this.renderer.setSize(width, height, false)
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    if (options.toneMapping !== undefined) {
      this.renderer.toneMapping = options.toneMapping
    }
    this.renderer.toneMappingExposure = options.exposure ?? 1
    this.domElement = this.renderer.domElement
    this.domElement.classList.add('block', 'h-full', 'w-full', 'touch-none')
    container.appendChild(this.domElement)

    this.pmrem = new THREE.PMREMGenerator(this.renderer)
    this.pmrem.compileEquirectangularShader()
  }

  render(): void {
    this.renderer.render(this.scene, this.camera)
  }

  resize(): void {
    const parent = this.domElement.parentElement
    if (!parent) return
    const w = Math.max(parent.clientWidth, 1)
    const h = Math.max(parent.clientHeight, 1)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(w, h, false)
  }

  dispose(): void {
    this.pmrem.dispose()
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
    this.renderer.dispose()
    this.domElement.remove()
  }
}
