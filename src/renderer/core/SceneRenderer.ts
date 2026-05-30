import type { BloomEffect } from 'postprocessing'
import * as THREE from 'three'
import { RENDERER_DEFAULTS, resolveRenderOptions } from '../config/rendererDefaults'
import { RenderEngine } from './RenderEngine'
import { DynamicEnvMixer } from '../env/DynamicEnvMixer'
import { gsap } from '../animation/gsap'
import type { LoadProgressEvent, SceneRendererOptions } from '../types'

/**
 * @deprecated 使用 RenderEngine。SceneCanvas 的薄兼容层。
 */
export class SceneRenderer {
  readonly engine: RenderEngine
  private readonly resolved: ReturnType<typeof resolveRenderOptions>
  private cameraBase = new THREE.Vector3(
    RENDERER_DEFAULTS.cameraBase.x,
    RENDERER_DEFAULTS.cameraBase.y,
    RENDERER_DEFAULTS.cameraBase.z
  )
  private bloomRestIntensity: number
  private bloomRestSmoothing: number

  constructor(container: HTMLElement, options: SceneRendererOptions = {}, engine?: RenderEngine) {
    this.resolved = resolveRenderOptions(options)
    this.bloomRestIntensity = this.resolved.bloomIntensity
    this.bloomRestSmoothing = this.resolved.bloomLuminanceSmoothing

    this.engine =
      engine ??
      new RenderEngine(container, {
        quality: this.resolved.quality,
        exposure: this.resolved.exposure,
        toneMapping: this.resolved.toneMapping,
        bloomIntensity: this.resolved.bloomIntensity,
        bloomLuminanceSmoothing: this.resolved.bloomLuminanceSmoothing,
        bloomLuminanceThreshold: this.resolved.bloomLuminanceThreshold,
        cameraFov: RENDERER_DEFAULTS.cameraFov,
        enableSSR: this.resolved.enableSSR,
        enableSSAO: this.resolved.enableSSAO,
        ssrIntensity: this.resolved.ssrIntensity,
        enableToneMapping: this.resolved.enableToneMapping,
        cinematic: this.resolved.cinematic,
        enableSMAA: this.resolved.enableSMAA,
        enableCinematicGrade: this.resolved.enableCinematicGrade,
        enableTemporalAA: this.resolved.enableTemporalAA
      })
  }

  static async create(
    container: HTMLElement,
    options: SceneRendererOptions = {}
  ): Promise<SceneRenderer> {
    const resolved = resolveRenderOptions(options)
    const engine = await RenderEngine.create(container, {
      quality: resolved.quality,
      exposure: resolved.exposure,
      toneMapping: resolved.toneMapping,
      bloomIntensity: resolved.bloomIntensity,
      bloomLuminanceSmoothing: resolved.bloomLuminanceSmoothing,
      bloomLuminanceThreshold: resolved.bloomLuminanceThreshold,
      cameraFov: RENDERER_DEFAULTS.cameraFov,
      backend: resolved.backend,
      enableSSR: resolved.enableSSR,
      enableSSAO: resolved.enableSSAO,
      ssrIntensity: resolved.ssrIntensity,
      enableToneMapping: resolved.enableToneMapping,
      cinematic: resolved.cinematic,
      enableSMAA: resolved.enableSMAA,
      enableCinematicGrade: resolved.enableCinematicGrade,
      enableTemporalAA: resolved.enableTemporalAA
    })
    return new SceneRenderer(container, options, engine)
  }

  get domElement(): HTMLCanvasElement {
    return this.engine.domElement
  }

  get controls() {
    return this.engine.controls
  }

  get webglRenderer(): THREE.WebGLRenderer {
    return this.engine.webglRenderer
  }

  get threeScene(): THREE.Scene {
    return this.engine.threeScene
  }

  get threeCamera(): THREE.PerspectiveCamera {
    return this.engine.threeCamera
  }

  get isInteractLocked(): boolean {
    return this.engine.isInteractLocked
  }

  get dynamicEnvironment(): DynamicEnvMixer | null {
    return this.engine.environment.dynamicEnvironment
  }

  get bloom(): BloomEffect | null {
    return this.engine.postStack?.bloom ?? null
  }

  get bloomRest(): { intensity: number; smoothing: number } {
    return { intensity: this.bloomRestIntensity, smoothing: this.bloomRestSmoothing }
  }

  get nightPmremEnvironment(): THREE.Texture | null {
    return this.engine.environment.nightEnvironment
  }

  get sceneCapturedEnvironment(): THREE.Texture | null {
    return this.engine.environment.capturedEnvironment
  }

  setProgressHandler(handler: ((e: LoadProgressEvent) => void) | null): void {
    this.engine.setProgressHandler(handler)
  }

  getSceneRoot(): THREE.Group {
    return this.engine.getSceneRoot()
  }

  captureSceneEnvironment(ignoreRoots: THREE.Object3D[] = []): THREE.Texture {
    return this.engine.environment.captureScene(ignoreRoots)
  }

  setInteractLocked(locked: boolean): void {
    this.engine.setInteractLocked(locked)
  }

  syncOrbitControls(): void {
    this.engine.syncOrbitControls()
  }

  setCameraBase(x: number, y: number, z: number): void {
    this.cameraBase.set(x, y, z)
  }

  resetCameraPosition(duration?: number): void {
    if (duration === undefined) {
      this.engine.threeCamera.position.copy(this.cameraBase)
      return
    }
    gsap.to(this.engine.threeCamera.position, {
      x: this.cameraBase.x,
      y: this.cameraBase.y,
      z: this.cameraBase.z,
      duration,
      ease: 'power2.inOut'
    })
  }

  setCameraFov(fov: number): void {
    this.engine.setCameraFov(fov)
  }

  setBloomIntensity(intensity: number): void {
    this.engine.setBloomIntensity(intensity)
  }

  setBloomSmoothing(smoothing: number): void {
    this.engine.setBloomSmoothing(smoothing)
  }

  setBloomThreshold(threshold: number): void {
    this.engine.setBloomThreshold(threshold)
  }

  storeBloomRest(intensity?: number, smoothing?: number): void {
    if (intensity !== undefined) this.bloomRestIntensity = intensity
    if (smoothing !== undefined) this.bloomRestSmoothing = smoothing
  }

  setSceneEnvironmentIntensity(intensity: number): void {
    this.engine.environment.setIntensity(intensity)
  }

  clearEnvironment(): void {
    this.engine.environment.clearEnvironment()
  }

  /** 清除环境 override，恢复动态环境或空环境 */
  restoreDefaultEnvironment(): void {
    this.engine.environment.clearOverride()
    if (this.engine.environment.dynamicEnvironment) return
    this.engine.threeScene.environment = null
  }

  /** @deprecated 使用 restoreDefaultEnvironment */
  restoreShowroomEnvironment(): void {
    this.restoreDefaultEnvironment()
  }

  async initDynamicEnvironment(dayUrl: string, nightUrl: string): Promise<void> {
    await this.engine.environment.initDynamicEnvironment(dayUrl, nightUrl)
  }

  setEnvironmentOverride(texture: THREE.Texture | null): void {
    this.engine.environment.setOverride(texture)
  }

  async preloadNightPmrem(url: string): Promise<void> {
    await this.engine.environment.preloadNightPmrem(url)
  }

  async setEnvironmentHdr(url: string): Promise<void> {
    const env = await this.engine.environment.loadHdrToPmrem(url)
    this.engine.environment.setOverride(env)
  }

  async loadGltf(url: string, parent?: THREE.Object3D): Promise<THREE.Group> {
    return this.engine.assets.loadGltf(url, parent ?? this.engine.getSceneRoot())
  }

  resize(): void {
    this.engine.resize()
  }

  dispose(): void {
    this.engine.dispose()
  }
}
