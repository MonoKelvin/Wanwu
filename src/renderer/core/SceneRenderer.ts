import gsap from 'gsap'
import type { BloomEffect } from 'postprocessing'
import { EffectComposer } from 'postprocessing'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js'
import { DynamicEnvMixer } from '../env/DynamicEnvMixer'
import { createPostComposer, setBloomSmoothing } from '../post/createPostComposer'
import { createAeroWindLines, scrollAeroWindLines } from '../effects/aeroWindLines'
import type { PlanarMeshReflector } from '../reflection/PlanarMeshReflector'
import { updateReflecFloorUniforms } from '../shaders/reflecFloorPatch'
import type { LoadProgressEvent, SceneQuality, SceneRendererOptions } from '../types'
import { setVehicleEnvMapIntensity } from '@modules/cloud-abode/vehicles/services/materialBinder'
import { fixGltfMaterialTextures } from '../utils/gltfTextureUtils'
import type { ShowroomSceneHandles } from '../types'
import type { ShowroomViewMode } from '@modules/cloud-abode/vehicles/types/showroom'
import { SHOWROOM_LIGHTING } from '@modules/cloud-abode/config/showroomLighting'

const DRACO_DECODER = 'https://www.gstatic.com/draco/versioned/decoders/1.5.6/'
const SHOWROOM_FOV = 33.4
const RUSH_FOV = 36
const AERO_CLIP = new THREE.Plane(new THREE.Vector3(1, 0, 0.12), 0.05)

export class SceneRenderer {
  readonly domElement: HTMLCanvasElement
  private readonly renderer: THREE.WebGLRenderer
  private readonly scene: THREE.Scene
  private readonly camera: THREE.PerspectiveCamera
  private readonly controls: OrbitControls
  private readonly pmrem: THREE.PMREMGenerator
  private readonly gltfLoader: GLTFLoader
  private readonly gltfDecodersReady: Promise<void>
  private readonly rgbLoader: RGBELoader
  private readonly clock = new THREE.Clock()
  private readonly rootGroup = new THREE.Group()
  private animationId = 0
  private disposed = false
  private resizeObserver: ResizeObserver | null = null
  private onProgress: ((e: LoadProgressEvent) => void) | null = null
  private nightEnvironment: THREE.Texture | null = null
  private dynamicEnv: DynamicEnvMixer | null = null
  private enterTimeline: gsap.core.Timeline | null = null
  private composer: EffectComposer | null = null
  private bloomEffect: BloomEffect | null = null
  private rushActive = false
  /** rush 1s 后切到预烘焙夜间 PMREM，此前仍用 DynamicEnv RT */
  private rushNightEnvApplied = false
  private speedLines: THREE.Group | null = null
  private rushTimeline: gsap.core.Timeline | null = null
  private shakeTween: gsap.core.Tween | null = null
  private cameraBase = new THREE.Vector3(0, 0.8, -11)
  private showroom: ShowroomSceneHandles | null = null
  private vehicleRoot: THREE.Object3D | null = null
  private floorScrollSpeed = 0
  private interactLocked = false
  private viewMode: ShowroomViewMode = 'customize'
  private aeroActive = false
  private aeroMaterials: THREE.Material[] = []
  private bloomRestIntensity = 1
  private bloomRestSmoothing = 1.6
  private floorReflector: PlanarMeshReflector | null = null
  private wheelSpinNodes: THREE.Object3D[] = []
  private windLines: THREE.LineSegments | null = null

  constructor(container: HTMLElement, options: SceneRendererOptions = {}) {
    const quality = options.quality ?? 'high'
    const dpr = this.pixelRatioForQuality(quality)

    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x000000)
    this.scene.add(this.rootGroup)

    const width = Math.max(container.clientWidth, 1)
    const height = Math.max(container.clientHeight, 1)

    this.camera = new THREE.PerspectiveCamera(SHOWROOM_FOV, width / height, 0.1, 200)
    this.camera.position.copy(this.cameraBase)

    this.renderer = new THREE.WebGLRenderer({
      antialias: quality !== 'low',
      alpha: false,
      powerPreference: 'high-performance'
    })
    this.renderer.setPixelRatio(dpr)
    this.renderer.setSize(width, height, false)
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.CineonToneMapping
    this.renderer.toneMappingExposure =
      options.exposure ?? SHOWROOM_LIGHTING.toneMappingExposure
    this.domElement = this.renderer.domElement
    this.domElement.classList.add('block', 'h-full', 'w-full', 'touch-none')
    container.appendChild(this.domElement)

    this.controls = new OrbitControls(this.camera, this.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.06
    this.controls.minDistance = 3
    this.controls.maxDistance = 12
    this.controls.target.set(0, 0.8, 0)
    this.controls.update()

    this.pmrem = new THREE.PMREMGenerator(this.renderer)
    this.pmrem.compileEquirectangularShader()

    this.gltfLoader = new GLTFLoader()
    this.gltfLoader.setMeshoptDecoder(MeshoptDecoder)
    this.rgbLoader = new RGBELoader()

    if (quality !== 'low') {
      const { composer, bloom } = createPostComposer(
        this.renderer,
        this.scene,
        this.camera,
        quality
      )
      this.composer = composer
      this.bloomEffect = bloom
      this.bloomRestIntensity = bloom.intensity
      this.bloomRestSmoothing = bloom.luminanceMaterial.smoothing
    }

    this.gltfDecodersReady = Promise.all([
      MeshoptDecoder.ready,
      import('three/addons/loaders/DRACOLoader.js').then(({ DRACOLoader }) => {
        if (this.disposed) return
        const draco = new DRACOLoader()
        draco.setDecoderPath(DRACO_DECODER)
        this.gltfLoader.setDRACOLoader(draco)
      })
    ]).then(() => undefined)

    void this.gltfDecodersReady.catch((err) => {
      console.error('[SceneRenderer] GLTF 解码器初始化失败', err)
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

  get webglRenderer(): THREE.WebGLRenderer {
    return this.renderer
  }

  get threeScene(): THREE.Scene {
    return this.scene
  }

  get threeCamera(): THREE.PerspectiveCamera {
    return this.camera
  }

  registerShowroom(handles: ShowroomSceneHandles): void {
    this.showroom = handles
  }

  setFloorReflector(reflector: PlanarMeshReflector | null): void {
    this.floorReflector?.dispose()
    this.floorReflector = reflector
  }

  setVehicleRoot(root: THREE.Object3D): void {
    this.vehicleRoot = root
  }

  setWheelSpinNodes(nodes: THREE.Object3D[]): void {
    this.wheelSpinNodes = nodes
  }

  /** 双 HDR + DynamicEnv（M2） */
  async initDynamicEnvironment(dayUrl: string, nightUrl: string): Promise<void> {
    const [dayHdr, nightHdr] = await Promise.all([
      this.loadHdr(dayUrl),
      this.loadHdr(nightUrl)
    ])

    this.dynamicEnv?.dispose()
    this.nightEnvironment?.dispose()

    // su7: envmap1=night, envmap2=day；weight 0→1 为夜→昼
    this.dynamicEnv = new DynamicEnvMixer(this.renderer, nightHdr, dayHdr)
    this.dynamicEnv.setWeight(0)
    this.dynamicEnv.setIntensity(0)
    this.applyEnvironmentFromMixer()

    this.nightEnvironment = this.pmrem.fromEquirectangular(nightHdr).texture
    this.nightEnvironment.mapping = THREE.CubeUVReflectionMapping
  }

  /** 展厅入场 Timeline（对标 su7-replica World.enter） */
  playShowroomEnter(duration = 4): void {
    this.enterTimeline?.kill()
    this.interactLocked = true
    this.controls.enabled = false

    const black = new THREE.Color(0x000000)
    const white = new THREE.Color(0xffffff)
    const lightColor = new THREE.Color()
    const params = {
      lightAlpha: 0,
      lightIntensity: 0,
      reflectIntensity: 0,
      envIntensity: 0,
      envWeight: 0
    }
    if (this.showroom) {
      this.showroom.lightMaterial.emissive.copy(black)
      this.showroom.lightMaterial.emissiveIntensity = 0
      updateReflecFloorUniforms(this.showroom.floorMaterial, {
        reflectIntensity: 0,
        floorColor: black,
        speed: 0
      })
    }

    const tl = gsap.timeline({
      onComplete: () => {
        this.interactLocked = false
        this.controls.enabled = true
      }
    })
    this.enterTimeline = tl

    this.camera.position.set(0, 0.8, -11)
    this.controls.target.set(0, 0.8, 0)

    tl.to(this.camera.position, {
      x: 0,
      y: 0.8,
      z: -7,
      duration,
      ease: 'power2.inOut'
    })

    tl.to(
      params,
      {
        lightAlpha: 1,
        lightIntensity: 1,
        reflectIntensity: SHOWROOM_LIGHTING.floorReflectIntensity,
        duration,
        delay: 1,
        ease: 'power2.inOut',
        onUpdate: () => {
          if (!this.showroom) return
          lightColor.copy(black).lerp(white, params.lightAlpha)
          this.showroom.lightMaterial.emissive.copy(white)
          this.showroom.lightMaterial.emissiveIntensity =
            params.lightIntensity * SHOWROOM_LIGHTING.keyLightEmissive
          this.showroom.lightMaterial.opacity = params.lightAlpha
          updateReflecFloorUniforms(this.showroom.floorMaterial, {
            reflectIntensity: params.reflectIntensity,
            floorColor: lightColor
          })
        }
      },
      0
    )

    tl.to(
      params,
      {
        envIntensity: SHOWROOM_LIGHTING.envIntensity,
        duration,
        delay: 0.5,
        ease: 'power2.inOut',
        onUpdate: () => {
          this.dynamicEnv?.setIntensity(params.envIntensity)
        }
      },
      0
    )

    tl.to(
      params,
      {
        envWeight: 1,
        duration,
        delay: 0.5,
        ease: 'power2.inOut',
        onUpdate: () => {
          this.dynamicEnv?.setWeight(params.envWeight)
        }
      },
      `-=${duration - 1.5}`
    )

  }

  /** @deprecated 使用 initDynamicEnvironment */
  async setEnvironmentHdr(url: string): Promise<void> {
    const env = await this.hdrToPmrem(url)
    this.scene.environment = env
    this.scene.background = env
  }

  async preloadEnvironmentHdr(url: string): Promise<void> {
    if (this.nightEnvironment) {
      this.nightEnvironment.dispose()
      this.nightEnvironment = null
    }
    this.nightEnvironment = await this.hdrToPmrem(url)
  }

  get isRushActive(): boolean {
    return this.rushActive
  }

  get currentViewMode(): ShowroomViewMode {
    return this.viewMode
  }

  get isInteractLocked(): boolean {
    return this.interactLocked
  }

  /** M5：StateTable 切换展示模式 */
  async applyViewMode(mode: ShowroomViewMode, speedLinesUrl: string): Promise<void> {
    if (this.interactLocked && mode !== this.viewMode) return

    if (mode !== 'aero') this.setAeroMode(false)
    if (mode !== 'drive' && this.rushActive) this.stopRushMode()
    if (mode === 'drive' && this.rushActive) {
      this.viewMode = mode
      return
    }

    switch (mode) {
      case 'customize':
        this.resetShowroomCamera()
        break
      case 'drive':
        await this.startRushMode(speedLinesUrl)
        break
      case 'aero':
        this.resetShowroomCamera()
        this.setAeroMode(true)
        break
      case 'radar':
        this.resetShowroomCamera()
        this.moveCameraTo(1.6, 0.95, 3.8, 0, 0.72, 0)
        if (this.bloomEffect) this.bloomEffect.intensity = 0.55
        break
      case 'size':
        this.resetShowroomCamera()
        this.moveCameraTo(4.2, 1.35, 5.8, 0, 0.65, 0)
        if (this.bloomEffect) this.bloomEffect.intensity = 0.45
        break
    }

    this.viewMode = mode
  }

  private setAeroMode(enabled: boolean): void {
    if (enabled === this.aeroActive) return
    this.aeroActive = enabled
    this.renderer.localClippingEnabled = enabled

    if (!enabled) {
      for (const mat of this.aeroMaterials) {
        mat.clippingPlanes = null
        mat.side = THREE.FrontSide
        mat.needsUpdate = true
      }
      this.aeroMaterials = []
      if (this.windLines) this.windLines.visible = false
      if (this.bloomEffect) this.bloomEffect.intensity = this.bloomRestIntensity
      return
    }

    if (!this.windLines) {
      this.windLines = createAeroWindLines()
      this.scene.add(this.windLines)
    }
    this.windLines.visible = true

    if (!this.vehicleRoot) return
    this.aeroMaterials = []
    this.vehicleRoot.traverse((obj) => {
      if (!(obj as THREE.Mesh).isMesh) return
      const mesh = obj as THREE.Mesh
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      for (const mat of materials) {
        if (!mat) continue
        this.aeroMaterials.push(mat)
        mat.clippingPlanes = [AERO_CLIP]
        mat.clipShadows = true
        mat.side = THREE.DoubleSide
        mat.needsUpdate = true
      }
    })
    if (this.bloomEffect) {
      this.bloomRestIntensity = this.bloomEffect.intensity
      this.bloomEffect.intensity = 0.95
    }
  }

  private resetShowroomCamera(): void {
    gsap.to(this.camera.position, {
      x: this.cameraBase.x,
      y: this.cameraBase.y,
      z: this.cameraBase.z,
      duration: 1.1,
      ease: 'power2.inOut'
    })
    const fov = { value: this.camera.fov }
    gsap.to(fov, {
      value: SHOWROOM_FOV,
      duration: 1,
      ease: 'power2.out',
      onUpdate: () => {
        this.camera.fov = fov.value
        this.camera.updateProjectionMatrix()
      }
    })
    if (this.bloomEffect && !this.rushActive && !this.aeroActive) {
      const b = { intensity: this.bloomEffect.intensity }
      gsap.to(b, {
        intensity: 0.35,
        duration: 0.6,
        onUpdate: () => {
          if (this.bloomEffect) this.bloomEffect.intensity = b.intensity
        }
      })
    }
  }

  private moveCameraTo(
    x: number,
    y: number,
    z: number,
    tx: number,
    ty: number,
    tz: number
  ): void {
    gsap.to(this.camera.position, { x, y, z, duration: 1.2, ease: 'power2.inOut' })
    gsap.to(this.controls.target, {
      x: tx,
      y: ty,
      z: tz,
      duration: 1.2,
      ease: 'power2.inOut',
      onUpdate: () => this.controls.update()
    })
  }

  /** M4：点击画布 rush（对标 World.rush） */
  async toggleRushMode(speedLinesUrl: string): Promise<void> {
    if (this.interactLocked) return
    if (this.rushActive) {
      this.stopRushMode()
      return
    }
    await this.startRushMode(speedLinesUrl)
  }

  private async startRushMode(speedLinesUrl: string): Promise<void> {
    if (!this.nightEnvironment) return
    this.setAeroMode(false)
    this.rushActive = true
    this.rushNightEnvApplied = false
    this.viewMode = 'drive'
    this.interactLocked = true
    this.controls.enabled = false
    this.rushTimeline?.kill()

    if (!this.speedLines) {
      this.speedLines = await this.loadGltf(speedLinesUrl)
      this.setSpeedLinesOpacity(0)
    }
    this.setSpeedLinesOpacity(0)
    this.speedLines.visible = true

    const params = {
      speed: 0,
      floorLerp: 0,
      lightOpacity: 1,
      envIntensity: 1,
      speedUpOpacity: 0,
      cameraFov: SHOWROOM_FOV,
      carBodyEnvIntensity: 1.25,
      cameraShakeIntensity: 0,
      bloomLuminanceSmoothing: this.bloomRestSmoothing,
      bloomIntensity: this.bloomRestIntensity
    }
    const white = new THREE.Color(0xffffff)
    const gray = new THREE.Color(0x444444)
    const floorColor = new THREE.Color(0xffffff)

    const tl = gsap.timeline({
      onComplete: () => {
        this.interactLocked = false
        this.controls.enabled = true
      }
    })
    this.rushTimeline = tl

    tl.to(params, {
      speed: 4,
      duration: 2,
      ease: 'power2.out',
      onUpdate: () => {
        this.floorScrollSpeed = params.speed
      }
    }).to(params, {
      speed: 10,
      duration: 4,
      ease: 'power2.out',
      onUpdate: () => {
        this.floorScrollSpeed = params.speed
      }
    })

    if (this.showroom) {
      tl.to(params, {
        lightOpacity: 0,
        duration: 1,
        ease: 'power2.out',
        onUpdate: () => {
          this.showroom!.lightMaterial.opacity = params.lightOpacity
        }
      })
      tl.to(params, {
        floorLerp: 1,
        duration: 4,
        ease: 'none',
        onUpdate: () => {
          floorColor.copy(white).lerp(gray, params.floorLerp)
          updateReflecFloorUniforms(this.showroom!.floorMaterial, {
            floorColor,
            reflectIntensity: SHOWROOM_LIGHTING.floorReflectIntensity * (1 - params.floorLerp)
          })
        }
      }, 0)
    }

    tl.to(params, {
      envIntensity: 0.01,
      duration: 1,
      ease: 'power2.out',
      onUpdate: () => {
        this.dynamicEnv?.setIntensity(params.envIntensity)
      }
    })

    tl.to(params, {
      speedUpOpacity: 1,
      cameraFov: RUSH_FOV,
      duration: 2,
      ease: 'power2.out',
      onUpdate: () => {
        this.setSpeedLinesOpacity(params.speedUpOpacity)
        this.camera.fov = params.cameraFov
        this.camera.updateProjectionMatrix()
      }
    }, 0)

    tl.call(
      () => {
        this.rushNightEnvApplied = true
        if (this.nightEnvironment) {
          this.scene.environment = this.nightEnvironment
        }
      },
      undefined,
      1
    )

    tl.to(params, {
      carBodyEnvIntensity: 10,
      cameraShakeIntensity: 1,
      bloomLuminanceSmoothing: 0.4,
      bloomIntensity: 2,
      duration: 4,
      ease: 'power2.out',
      onUpdate: () => {
        if (this.vehicleRoot) {
          setVehicleEnvMapIntensity(this.vehicleRoot, params.carBodyEnvIntensity)
        }
        if (this.bloomEffect) {
          this.bloomEffect.intensity = params.bloomIntensity
          setBloomSmoothing(this.bloomEffect, params.bloomLuminanceSmoothing)
        }
      }
    }, 1)

    this.startCameraShake()
  }

  private stopRushMode(): void {
    this.rushActive = false
    this.rushNightEnvApplied = false
    if (this.viewMode === 'drive') this.viewMode = 'customize'
    this.interactLocked = true
    this.shakeTween?.kill()
    this.shakeTween = null
    this.rushTimeline?.kill()
    this.rushTimeline = null
    this.floorScrollSpeed = 0

    if (this.speedLines) {
      this.setSpeedLinesOpacity(0)
      this.speedLines.visible = false
    }

    const white = new THREE.Color(0xffffff)
    if (this.showroom) {
      this.showroom.lightMaterial.opacity = 1
      this.showroom.lightMaterial.emissive.copy(white)
      this.showroom.lightMaterial.emissiveIntensity = SHOWROOM_LIGHTING.keyLightEmissive
      updateReflecFloorUniforms(this.showroom.floorMaterial, {
        floorColor: white,
        reflectIntensity: SHOWROOM_LIGHTING.floorReflectIntensity,
        speed: 0
      })
    }

    if (this.dynamicEnv) {
      this.dynamicEnv.setIntensity(SHOWROOM_LIGHTING.envIntensity)
      this.dynamicEnv.setWeight(1)
    }

    if (this.vehicleRoot) {
      setVehicleEnvMapIntensity(this.vehicleRoot, SHOWROOM_LIGHTING.bodyEnvIntensity)
    }

    const bloomParams = {
      bloomIntensity: this.bloomEffect?.intensity ?? this.bloomRestIntensity,
      bloomLuminanceSmoothing: this.bloomEffect?.luminanceMaterial.smoothing ?? this.bloomRestSmoothing
    }
    gsap.to(bloomParams, {
      bloomIntensity: this.bloomRestIntensity,
      bloomLuminanceSmoothing: this.bloomRestSmoothing,
      duration: 0.8,
      onUpdate: () => {
        if (!this.bloomEffect) return
        this.bloomEffect.intensity = bloomParams.bloomIntensity
        setBloomSmoothing(this.bloomEffect, bloomParams.bloomLuminanceSmoothing)
      }
    })

    const fov = { value: this.camera.fov }
    gsap.to(fov, {
      value: SHOWROOM_FOV,
      duration: 0.9,
      ease: 'power2.out',
      onUpdate: () => {
        this.camera.fov = fov.value
        this.camera.updateProjectionMatrix()
      },
      onComplete: () => {
        this.interactLocked = false
        this.controls.enabled = true
      }
    })

    gsap.to(this.camera.position, {
      x: this.cameraBase.x,
      y: this.cameraBase.y,
      z: this.cameraBase.z,
      duration: 0.9,
      ease: 'power2.out'
    })
  }

  private setSpeedLinesOpacity(opacity: number): void {
    if (!this.speedLines) return
    this.speedLines.traverse((obj) => {
      if (!(obj as THREE.Mesh).isMesh) return
      const mesh = obj as THREE.Mesh
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      for (const mat of mats) {
        if (!mat) continue
        mat.transparent = true
        mat.opacity = opacity
        mat.depthWrite = opacity > 0.01
        mat.needsUpdate = true
      }
    })
  }

  private startCameraShake(): void {
    this.shakeTween?.kill()
    const state = { t: 0 }
    this.shakeTween = gsap.to(state, {
      t: 1,
      duration: 8,
      repeat: -1,
      ease: 'none',
      onUpdate: () => {
        if (!this.rushActive) return
        const s = state.t * Math.PI * 24
        this.camera.position.x = this.cameraBase.x + Math.sin(s) * 0.018
        this.camera.position.y = this.cameraBase.y + Math.cos(s * 1.3) * 0.01
      }
    })
  }

  private applyEnvironmentFromMixer(): void {
    if (!this.dynamicEnv || this.rushNightEnvApplied) return
    this.scene.environment = this.dynamicEnv.update(this.renderer)
  }

  async loadGltf(url: string, parent: THREE.Object3D = this.rootGroup): Promise<THREE.Group> {
    await this.gltfDecodersReady
    const fileName = url.substring(url.lastIndexOf('/') + 1)
    const base = url.substring(0, url.lastIndexOf('/') + 1)
    this.gltfLoader.setPath(base)
    return new Promise((resolve, reject) => {
      this.gltfLoader.load(
        fileName,
        (gltf) => {
          const root = gltf.scene
          fixGltfMaterialTextures(root)
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
    this.composer?.setSize(w, h)
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    cancelAnimationFrame(this.animationId)
    this.resizeObserver?.disconnect()
    this.resizeObserver = null
    this.enterTimeline?.kill()
    this.enterTimeline = null
    this.rushTimeline?.kill()
    this.rushTimeline = null
    this.shakeTween?.kill()
    this.shakeTween = null
    this.composer?.dispose()
    this.composer = null
    this.bloomEffect = null
    this.setAeroMode(false)
    this.floorReflector?.dispose()
    this.floorReflector = null
    this.dynamicEnv?.dispose()
    this.dynamicEnv = null
    this.nightEnvironment?.dispose()
    this.nightEnvironment = null
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

  private async hdrToPmrem(url: string): Promise<THREE.Texture> {
    const hdr = await this.loadHdr(url)
    const env = this.pmrem.fromEquirectangular(hdr).texture
    hdr.dispose()
    return env
  }

  private animate = (): void => {
    if (this.disposed) return
    this.animationId = requestAnimationFrame(this.animate)
    const elapsed = this.clock.getElapsedTime()
    if (this.showroom?.floorMaterial) {
      updateReflecFloorUniforms(this.showroom.floorMaterial, {
        time: elapsed,
        speed: this.floorScrollSpeed
      })
    }
    this.floorReflector?.update()

    const dt = this.clock.getDelta()
    const spin = this.floorScrollSpeed > 0 ? this.floorScrollSpeed : this.rushActive ? 4 : 0
    if (spin > 0) {
      for (const node of this.wheelSpinNodes) {
        node.rotateZ(-spin * 0.03)
      }
    }
    if (this.windLines?.visible) {
      scrollAeroWindLines(this.windLines, 6, dt)
    }

    if (this.dynamicEnv && !this.rushNightEnvApplied) {
      this.scene.environment = this.dynamicEnv.update(this.renderer)
    }
    this.controls.update()
    if (this.composer) this.composer.render()
    else this.renderer.render(this.scene, this.camera)
  }
}
