import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js'
import type { LoadProgressEvent, SceneQuality, SceneRendererOptions } from '../types'

const DRACO_DECODER = 'https://www.gstatic.com/draco/versioned/decoders/1.5.6/'

export class SceneRenderer {
  readonly domElement: HTMLCanvasElement
  private readonly renderer: THREE.WebGLRenderer
  private readonly scene: THREE.Scene
  private readonly camera: THREE.PerspectiveCamera
  private readonly controls: OrbitControls
  private readonly pmrem: THREE.PMREMGenerator
  private readonly gltfLoader: GLTFLoader
  private readonly rgbLoader: RGBELoader
  private readonly clock = new THREE.Clock()
  private readonly rootGroup = new THREE.Group()
  private animationId = 0
  private disposed = false
  private resizeObserver: ResizeObserver | null = null
  private onProgress: ((e: LoadProgressEvent) => void) | null = null

  constructor(container: HTMLElement, options: SceneRendererOptions = {}) {
    const quality = options.quality ?? 'high'
    const dpr = this.pixelRatioForQuality(quality)

    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x0a0a0c)
    this.scene.add(this.rootGroup)

    const width = Math.max(container.clientWidth, 1)
    const height = Math.max(container.clientHeight, 1)

    this.camera = new THREE.PerspectiveCamera(33.4, width / height, 0.1, 200)
    this.camera.position.set(0, 0.85, 5.2)

    this.renderer = new THREE.WebGLRenderer({
      antialias: quality !== 'low',
      alpha: false,
      powerPreference: 'high-performance'
    })
    this.renderer.setPixelRatio(dpr)
    this.renderer.setSize(width, height, false)
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = options.exposure ?? 1
    this.domElement = this.renderer.domElement
    this.domElement.classList.add('block', 'h-full', 'w-full', 'touch-none')
    container.appendChild(this.domElement)

    this.controls = new OrbitControls(this.camera, this.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.06
    this.controls.minDistance = 3
    this.controls.maxDistance = 12
    this.controls.target.set(0, 0.75, 0)
    this.controls.update()

    this.pmrem = new THREE.PMREMGenerator(this.renderer)
    this.pmrem.compileEquirectangularShader()

    this.gltfLoader = new GLTFLoader()
    this.rgbLoader = new RGBELoader()

    void import('three/addons/loaders/DRACOLoader.js').then(({ DRACOLoader }) => {
      if (this.disposed) return
      const draco = new DRACOLoader()
      draco.setDecoderPath(DRACO_DECODER)
      this.gltfLoader.setDRACOLoader(draco)
    })

    this.resizeObserver = new ResizeObserver(() => this.resize())
    this.resizeObserver.observe(container)
    this.animate()
  }

  setProgressHandler(handler: ((e: LoadProgressEvent) => void) | null) {
    this.onProgress = handler
  }

  getSceneRoot(): THREE.Group {
    return this.rootGroup
  }

  async setEnvironmentHdr(url: string): Promise<void> {
    const hdr = await this.loadHdr(url)
    const env = this.pmrem.fromEquirectangular(hdr).texture
    hdr.dispose()
    this.scene.environment = env
    this.scene.background = env
  }

  async loadGltf(url: string, parent: THREE.Object3D = this.rootGroup): Promise<THREE.Group> {
    const fileName = url.substring(url.lastIndexOf('/') + 1)
    const base = url.substring(0, url.lastIndexOf('/') + 1)
    this.gltfLoader.setPath(base)
    return new Promise((resolve, reject) => {
      this.gltfLoader.load(
        fileName,
        (gltf) => {
          const root = gltf.scene
          root.traverse((obj) => {
            if ((obj as THREE.Mesh).isMesh) {
              const mesh = obj as THREE.Mesh
              mesh.castShadow = false
              mesh.receiveShadow = false
            }
          })
          parent.add(root)
          resolve(root)
        },
        (xhr) => {
          if (!this.onProgress || !xhr.total) return
          this.onProgress({
            loaded: xhr.loaded,
            total: xhr.total,
            ratio: xhr.loaded / xhr.total
          })
        },
        reject
      )
    })
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
    if (this.disposed) return
    this.disposed = true
    cancelAnimationFrame(this.animationId)
    this.resizeObserver?.disconnect()
    this.resizeObserver = null
    this.controls.dispose()
    this.pmrem.dispose()
    this.rootGroup.traverse((obj) => {
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

  private pixelRatioForQuality(quality: SceneQuality): number {
    const base = window.devicePixelRatio || 1
    if (quality === 'high') return Math.min(base, 2)
    if (quality === 'medium') return Math.min(base, 1.5)
    return 1
  }

  private loadHdr(url: string): Promise<THREE.DataTexture> {
    return new Promise((resolve, reject) => {
      this.rgbLoader.load(url, resolve, undefined, reject)
    })
  }

  private animate = (): void => {
    if (this.disposed) return
    this.animationId = requestAnimationFrame(this.animate)
    this.controls.update()
    this.renderer.render(this.scene, this.camera)
  }
}
