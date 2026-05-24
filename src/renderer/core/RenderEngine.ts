import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { configureSmoothOrbitControls, type SmoothOrbitHandle } from '../controls/configureOrbitControls'
import { RENDERER_DEFAULTS, resolveRenderOptions } from '../config/rendererDefaults'
import { RenderContext } from './RenderContext'
import { createRenderContext } from './createRenderContext'
import { RenderLoop } from './RenderLoop'
import { resolveQualitySettings } from './QualityProfile'
import { PostStack } from '../pipeline/PostStack'
import { WebGPUPostStack } from '../pipeline/WebGPUPostStack'
import { RenderPipeline } from '../pipeline/RenderPipeline'
import { EnvironmentManager } from '../lighting/EnvironmentManager'
import { ReflectionSystem } from '../reflection/ReflectionSystem'
import { AnimationSystem } from '../animation/AnimationSystem'
import { AssetLoader } from '../assets/AssetLoader'
import { PathTracingController } from '../path/PathTracingController'
import type { IRenderContext } from '../types/context'
import type { RenderBackend } from '../types/engine'
import { probeRenderBackend, type BackendProbeResult } from './RenderBackendProbe'
import type { RenderEngineOptions } from '../types/engine'

/**
 * 影视级 WebGL/WebGPU 渲染引擎 — 纯渲染职责，零业务逻辑。
 */
export class RenderEngine {
  readonly context: IRenderContext
  readonly loop: RenderLoop
  readonly environment: EnvironmentManager
  readonly reflection: ReflectionSystem
  readonly animation: AnimationSystem
  readonly assets: AssetLoader
  readonly pathTracing: PathTracingController
  readonly controls: OrbitControls
  readonly postStack: PostStack | null
  readonly webgpuPostStack: WebGPUPostStack | null

  private readonly pipeline: RenderPipeline
  private readonly resolved: ReturnType<typeof resolveRenderOptions>
  private backendStatus: BackendProbeResult | null = null
  private readonly orbitHandle: SmoothOrbitHandle | null
  private resizeObserver: ResizeObserver | null = null
  private disposed = false

  constructor(
    container: HTMLElement,
    options: RenderEngineOptions = {},
    context?: IRenderContext
  ) {
    this.resolved = resolveRenderOptions(options)
    const quality = this.resolved.quality
    const { pixelRatio, postProcessing } = resolveQualitySettings(quality)

    this.context =
      context ??
      new RenderContext(container, {
        cameraFov: options.cameraFov ?? RENDERER_DEFAULTS.cameraFov,
        cameraNear: options.cameraNear ?? 0.1,
        cameraFar: options.cameraFar ?? 200,
        antialias: quality !== 'low',
        pixelRatio,
        toneMapping: this.resolved.toneMapping,
        exposure: this.resolved.exposure
      })

    this.context.camera.position.set(
      RENDERER_DEFAULTS.cameraBase.x,
      RENDERER_DEFAULTS.cameraBase.y,
      RENDERER_DEFAULTS.cameraBase.z
    )

    this.controls = new OrbitControls(this.context.camera, this.context.domElement)
    this.orbitHandle = configureSmoothOrbitControls(this.controls, this.context.camera)
    this.controls.target.set(
      RENDERER_DEFAULTS.orbitTarget.x,
      RENDERER_DEFAULTS.orbitTarget.y,
      RENDERER_DEFAULTS.orbitTarget.z
    )
    this.controls.update()

    this.environment = new EnvironmentManager(this.context)
    this.reflection = new ReflectionSystem()
    this.animation = new AnimationSystem()
    this.assets = new AssetLoader()
    this.pathTracing = new PathTracingController(this.context, {
      maxSamples: options.pathTracingMaxSamples,
      bounces: options.pathTracingBounces
    })

    const enablePost =
      options.postProcessing ?? postProcessing

    this.postStack = null
    if (this.context.capabilities.postProcessing && enablePost && quality !== 'low') {
      try {
        this.postStack = new PostStack(
          this.context.effectsWebGL,
          this.context.scene,
          this.context.camera,
          quality,
          {
            bloomIntensity: this.resolved.bloomIntensity,
            bloomLuminanceSmoothing: this.resolved.bloomLuminanceSmoothing,
            bloomLuminanceThreshold: this.resolved.bloomLuminanceThreshold,
            enableDoF: options.enableDoF,
            enableSSAO: options.enableSSAO,
            enableSSR: options.enableSSR,
            ssrIntensity: options.ssrIntensity,
            enableToneMapping: options.enableToneMapping,
            cinematic: options.cinematic,
            enableSMAA: options.enableSMAA,
            enableCinematicGrade: options.enableCinematicGrade,
            enableTemporalAA: options.enableTemporalAA,
            dofFocusDistance: options.dofFocusDistance,
            dofFocusRange: options.dofFocusRange
          }
        )
      } catch (err) {
        console.error('[RenderEngine] PostStack 初始化失败，降级直出', err)
      }
    }

    if (this.postStack?.toneMapping) {
      this.context.effectsWebGL.toneMapping = THREE.NoToneMapping
    }

    this.webgpuPostStack = null
    if (
      this.context.backend === 'webgpu' &&
      this.context.capabilities.tslPostProcessing &&
      enablePost &&
      quality !== 'low' &&
      this.context.webgpuRenderer
    ) {
      void WebGPUPostStack.create(
        this.context.webgpuRenderer,
        this.context.scene,
        this.context.camera,
        quality,
        {
          bloomIntensity: this.resolved.bloomIntensity,
          bloomLuminanceSmoothing: this.resolved.bloomLuminanceSmoothing,
          bloomLuminanceThreshold: this.resolved.bloomLuminanceThreshold,
          enableDoF: options.enableDoF,
          dofFocusDistance: options.dofFocusDistance,
          dofBokehScale: options.dofBokehScale,
          enableToneMapping: options.enableToneMapping ?? true,
          exposure: this.resolved.exposure
        }
      ).then((stack) => {
        if (this.disposed) {
          stack.dispose()
          return
        }
        ;(this as { webgpuPostStack: WebGPUPostStack | null }).webgpuPostStack = stack
      })
    }

    this.pipeline = new RenderPipeline({
      context: this.context,
      postStack: this.postStack,
      getWebgpuPostStack: () => this.webgpuPostStack,
      environment: this.environment,
      reflection: this.reflection,
      animation: this.animation,
      pathTracing: this.pathTracing
    })

    this.loop = new RenderLoop()
    this.loop.onPreRender((dt) => {
      this.orbitHandle?.tickZoom(dt)
      this.controls.update()
      this.pathTracing.syncCamera()
    })
    this.loop.start((_dt) => {
      try {
        this.pipeline.render(_dt)
      } catch (err) {
        const detail =
          err instanceof Error
            ? `${err.message}\n${err.stack?.split('\n').slice(0, 8).join('\n') ?? ''}`
            : String(err)
        console.error('[RenderEngine] 渲染帧失败', detail)
      }
    })

    if (options.enablePathTracing && this.context.capabilities.pathTracing) {
      void this.setPathTracingEnabled(true)
    }

    if (!context) {
      this.resizeObserver = new ResizeObserver(() => this.resize())
      this.resizeObserver.observe(container)
    }

    void probeRenderBackend(this.resolved.backend).then((result) => {
      this.backendStatus = result
    })
  }

  /** 异步创建 — 支持 WebGPU / WebGL 双后端探测 */
  static async create(
    container: HTMLElement,
    options: RenderEngineOptions = {}
  ): Promise<RenderEngine> {
    const quality = options.quality ?? 'high'
    const { pixelRatio } = resolveQualitySettings(quality)
    const probe = await probeRenderBackend(options.backend ?? 'webgl')
    const ctx = await createRenderContext(container, {
      backend: probe.effective,
      cameraFov: options.cameraFov ?? RENDERER_DEFAULTS.cameraFov,
      cameraNear: options.cameraNear ?? 0.1,
      cameraFar: options.cameraFar ?? 200,
      antialias: quality !== 'low',
      pixelRatio,
      toneMapping: options.toneMapping,
      exposure: options.exposure
    })
    const engine = new RenderEngine(container, options, ctx)
    engine.backendStatus = probe
    if (!engine.resizeObserver) {
      engine.resizeObserver = new ResizeObserver(() => engine.resize())
      engine.resizeObserver.observe(container)
    }
    return engine
  }

  get effectiveBackend(): RenderBackend {
    return this.backendStatus?.effective ?? this.context.backend
  }

  get backendProbe(): BackendProbeResult | null {
    return this.backendStatus
  }

  setSSRIntensity(intensity: number): void {
    this.postStack?.setSSRIntensity(intensity)
  }

  get domElement(): HTMLCanvasElement {
    return this.context.domElement
  }

  getSceneRoot(): THREE.Group {
    return this.context.root
  }

  get webglRenderer(): THREE.WebGLRenderer {
    return this.context.effectsWebGL
  }

  get capabilities() {
    return this.context.capabilities
  }

  async enablePathTracing(): Promise<boolean> {
    return this.pathTracing.prepare(this.context.scene, this.context.camera)
  }

  async setPathTracingEnabled(enabled: boolean): Promise<void> {
    await this.pathTracing.setEnabled(enabled, this.context.scene, this.context.camera)
  }

  disablePathTracing(): void {
    void this.pathTracing.setEnabled(false)
  }

  get pathTracingSamples(): number {
    return this.pathTracing.sampleCount
  }

  get pathTracingError(): string | null {
    return this.pathTracing.loadErrorMessage
  }

  get threeScene(): THREE.Scene {
    return this.context.scene
  }

  get threeCamera(): THREE.PerspectiveCamera {
    return this.context.camera
  }

  get isInteractLocked(): boolean {
    return !this.controls.enabled
  }

  setDoFFocus(distance: number, range?: number): void {
    this.postStack?.setDoFFocus(distance, range)
    this.webgpuPostStack?.setDoFFocus(distance, range)
  }

  setProgressHandler(handler: Parameters<AssetLoader['setProgressHandler']>[0]): void {
    this.assets.setProgressHandler(handler)
  }

  setInteractLocked(locked: boolean): void {
    this.controls.enabled = !locked
  }

  syncOrbitControls(): void {
    this.controls.update()
  }

  setCameraFov(fov: number): void {
    this.context.camera.fov = fov
    this.context.camera.updateProjectionMatrix()
  }

  setBloomIntensity(intensity: number): void {
    this.postStack?.setBloomIntensity(intensity)
    this.webgpuPostStack?.setBloomIntensity(intensity)
  }

  setBloomSmoothing(smoothing: number): void {
    this.postStack?.setBloomSmoothing(smoothing)
    this.webgpuPostStack?.setBloomSmoothing(smoothing)
  }

  setBloomThreshold(threshold: number): void {
    this.postStack?.setBloomThreshold(threshold)
    this.webgpuPostStack?.setBloomThreshold(threshold)
  }

  resize(): void {
    this.pipeline.resize()
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    this.loop.dispose()
    this.resizeObserver?.disconnect()
    this.resizeObserver = null
    this.orbitHandle?.dispose()
    this.pathTracing.dispose()
    this.assets.dispose()
    this.pipeline.dispose()
  }
}
