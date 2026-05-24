import { ScreenSpaceReflectionEffect } from './effects/ScreenSpaceReflectionEffect'
import { TemporalBlendEffect } from './effects/TemporalBlendEffect'
import { CINEMATIC_POST } from '../config/cinematicPreset'
import {
  BloomEffect,
  BlendFunction,
  BrightnessContrastEffect,
  ChromaticAberrationEffect,
  CopyPass,
  DepthOfFieldEffect,
  EffectComposer,
  EffectPass,
  NormalPass,
  RenderPass,
  SMAAEffect,
  SSAOEffect,
  ToneMappingEffect,
  ToneMappingMode,
  VignetteEffect
} from 'postprocessing'
import {
  Matrix4,
  Vector2,
  WebGLRenderTarget,
  type Camera,
  type PerspectiveCamera,
  type Scene,
  type WebGLRenderer
} from 'three'
import type { RenderQuality } from '../types/engine'
import type { PostStackBundle, PostStackOptions } from '../types/pipeline'
import { wantsExtendedPost } from '../core/QualityProfile'

/** 与旧版 createPostComposer 一致的 MSAA 档位 */
function multisamplingForQuality(quality: RenderQuality): number {
  if (quality === 'high') return 8
  if (quality === 'medium') return 2
  return 0
}

function drawingBufferSize(renderer: WebGLRenderer): { width: number; height: number } {
  const v = renderer.getDrawingBufferSize(new Vector2())
  return {
    width: Math.max(1, Math.floor(v.width)),
    height: Math.max(1, Math.floor(v.height))
  }
}

/**
 * 稳定 Bloom 后期 — 对齐 git HEAD createPostComposer（RenderPass + BloomEffect）。
 */
function createBloomComposer(
  renderer: WebGLRenderer,
  scene: Scene,
  camera: Camera,
  quality: RenderQuality,
  options: PostStackOptions
): { composer: EffectComposer; bloom: BloomEffect } {
  const multisampling = multisamplingForQuality(quality)
  const composer = new EffectComposer(renderer, { multisampling })
  composer.addPass(new RenderPass(scene, camera))

  const bloom = new BloomEffect({
    blendFunction: BlendFunction.ADD,
    intensity: options.bloomIntensity ?? 1,
    luminanceThreshold: options.bloomLuminanceThreshold ?? 0,
    luminanceSmoothing: options.bloomLuminanceSmoothing ?? 1.6,
    mipmapBlur: true
  })
  composer.addPass(new EffectPass(camera, bloom))

  const { width, height } = drawingBufferSize(renderer)
  composer.setSize(width, height)
  return { composer, bloom }
}

/**
 * 影视级后期栈 — 默认 Bloom-only（与旧版一致）；扩展 pass 仅在显式开启时加载。
 */
export class PostStack {
  readonly composer: EffectComposer
  readonly bloom: BloomEffect | null
  readonly depthOfField: DepthOfFieldEffect | null
  readonly toneMapping: ToneMappingEffect | null
  readonly ssao: SSAOEffect | null
  readonly ssr: ScreenSpaceReflectionEffect | null
  readonly normalPass: NormalPass | null
  readonly smaa: SMAAEffect | null
  readonly temporal: TemporalBlendEffect | null

  private readonly renderer: WebGLRenderer
  private readonly historyTarget: WebGLRenderTarget | null
  private readonly historyCopyPass: CopyPass | null
  private readonly prevViewMatrix = new Matrix4()
  private readonly cinematic = CINEMATIC_POST
  private disposed = false
  private historyReady = false

  constructor(
    renderer: WebGLRenderer,
    scene: Scene,
    camera: Camera,
    quality: RenderQuality,
    options: PostStackOptions = {}
  ) {
    this.renderer = renderer

    if (!wantsExtendedPost(options)) {
      const bundle = createBloomComposer(renderer, scene, camera, quality, options)
      this.composer = bundle.composer
      this.bloom = bundle.bloom
      this.depthOfField = null
      this.toneMapping = null
      this.ssao = null
      this.ssr = null
      this.normalPass = null
      this.smaa = null
      this.temporal = null
      this.historyTarget = null
      this.historyCopyPass = null
      return
    }

    try {
      this.buildExtendedStack(renderer, scene, camera, quality, options)
    } catch (err) {
      console.warn('[PostStack] 扩展后期初始化失败，降级 Bloom-only', err)
      const bundle = createBloomComposer(renderer, scene, camera, quality, options)
      this.composer = bundle.composer
      this.bloom = bundle.bloom
      this.depthOfField = null
      this.toneMapping = null
      this.ssao = null
      this.ssr = null
      this.normalPass = null
      this.smaa = null
      this.temporal = null
      this.historyTarget = null
      this.historyCopyPass = null
    }
  }

  private buildExtendedStack(
    renderer: WebGLRenderer,
    scene: Scene,
    camera: Camera,
    quality: RenderQuality,
    options: PostStackOptions
  ): void {
    const multisampling = multisamplingForQuality(quality)
    this.composer = new EffectComposer(renderer, { multisampling })
    this.composer.addPass(new RenderPass(scene, camera))

    const isHigh = quality === 'high'
    const isMedium = quality === 'medium'
    const cinematic = options.cinematic ?? isHigh
    const useNormalPass =
      (options.enableSSR || options.enableSSAO) && (isHigh || isMedium)

    this.normalPass = useNormalPass
      ? new NormalPass(scene, camera, {
          resolutionScale:
            options.normalPassResolutionScale ??
            (cinematic ? this.cinematic.normalPassResolutionScale : 0.5)
        })
      : null
    if (this.normalPass) {
      this.composer.addPass(this.normalPass)
    }

    this.ssr =
      options.enableSSR && isHigh
        ? new ScreenSpaceReflectionEffect({
            intensity: options.ssrIntensity ?? 0.35,
            maxDistance: options.ssrMaxDistance ?? this.cinematic.ssrMaxDistance,
            thickness: options.ssrThickness ?? this.cinematic.ssrThickness,
            steps: options.ssrSteps ?? this.cinematic.ssrSteps,
            normalBuffer: this.normalPass?.texture ?? null
          })
        : null
    if (this.ssr) {
      this.composer.addPass(new EffectPass(camera, this.ssr))
    }

    this.depthOfField = options.enableDoF
      ? new DepthOfFieldEffect(camera as PerspectiveCamera, {
          focusDistance: options.dofFocusDistance ?? 7,
          focusRange: options.dofFocusRange ?? 2.5,
          bokehScale: options.dofBokehScale ?? 1.2,
          resolutionScale: isHigh ? 0.5 : 0.35
        })
      : null
    if (this.depthOfField) {
      this.composer.addPass(new EffectPass(camera, this.depthOfField))
    }

    this.ssao =
      options.enableSSAO && (isHigh || isMedium)
        ? new SSAOEffect(camera, this.normalPass?.texture ?? null, {
            blendFunction: BlendFunction.MULTIPLY,
            samples: options.ssaoSamples ?? (cinematic ? this.cinematic.ssaoSamples : 16),
            rings: options.ssaoRings ?? (cinematic ? this.cinematic.ssaoRings : 5),
            luminanceInfluence: 0.65,
            radius: options.ssaoRadius ?? (cinematic ? this.cinematic.ssaoRadius : 0.12),
            intensity: options.ssaoIntensity ?? (cinematic ? this.cinematic.ssaoIntensity : 1.1),
            bias: 0.025,
            fade: 0.012,
            resolutionScale: cinematic ? 0.65 : 0.5
          })
        : null
    if (this.ssao) {
      this.composer.addPass(new EffectPass(camera, this.ssao))
    }

    this.bloom = new BloomEffect({
      blendFunction: BlendFunction.ADD,
      intensity: options.bloomIntensity ?? 1,
      luminanceThreshold: options.bloomLuminanceThreshold ?? 0,
      luminanceSmoothing: options.bloomLuminanceSmoothing ?? 1.6,
      mipmapBlur: true
    })
    this.composer.addPass(new EffectPass(camera, this.bloom))

    this.toneMapping =
      options.enableToneMapping !== false && cinematic
        ? new ToneMappingEffect({
            mode: ToneMappingMode.ACES_FILMIC,
            whitePoint: options.toneMappingWhitePoint ?? this.cinematic.toneMappingWhitePoint,
            middleGrey: options.toneMappingMiddleGrey ?? this.cinematic.toneMappingMiddleGrey
          })
        : null
    if (this.toneMapping) {
      this.composer.addPass(new EffectPass(camera, this.toneMapping))
    }

    this.temporal =
      options.enableTemporalAA && cinematic && isHigh
        ? new TemporalBlendEffect(options.temporalFeedback ?? 0.88)
        : null
    if (this.temporal) {
      this.composer.addPass(new EffectPass(camera, this.temporal))
    }

    const gradeEnabled = options.enableCinematicGrade ?? cinematic
    if (gradeEnabled && isHigh) {
      this.composer.addPass(
        new EffectPass(
          camera,
          new VignetteEffect({
            offset: options.vignetteOffset ?? this.cinematic.vignetteOffset,
            darkness: options.vignetteDarkness ?? this.cinematic.vignetteDarkness
          }),
          new BrightnessContrastEffect({
            brightness: options.gradeBrightness ?? this.cinematic.brightness,
            contrast: options.gradeContrast ?? this.cinematic.contrast
          })
        )
      )
      const aberration = options.chromaticAberration ?? this.cinematic.chromaticAberration
      this.composer.addPass(
        new EffectPass(
          camera,
          new ChromaticAberrationEffect({
            offset: new Vector2(aberration, aberration)
          })
        )
      )
    }

    this.smaa = (options.enableSMAA ?? cinematic) && isHigh ? new SMAAEffect() : null
    if (this.smaa) {
      this.composer.addPass(new EffectPass(camera, this.smaa))
    }

    if (this.temporal) {
      const { width, height } = drawingBufferSize(renderer)
      this.historyTarget = new WebGLRenderTarget(width, height, { depthBuffer: false })
      this.historyTarget.texture.name = 'PostStack.History'
      this.historyCopyPass = new CopyPass(this.historyTarget, true)
    } else {
      this.historyTarget = null
      this.historyCopyPass = null
    }

    const { width, height } = drawingBufferSize(renderer)
    this.composer.setSize(width, height)
  }

  static create(
    renderer: WebGLRenderer,
    scene: Scene,
    camera: Camera,
    quality: RenderQuality,
    options?: PostStackOptions
  ): PostStackBundle {
    const stack = new PostStack(renderer, scene, camera, quality, options)
    return {
      composer: stack.composer,
      bloom: stack.bloom,
      depthOfField: stack.depthOfField,
      toneMapping: stack.toneMapping,
      ssao: stack.ssao,
      ssr: stack.ssr,
      smaa: stack.smaa,
      temporal: stack.temporal
    }
  }

  updateCamera(camera: PerspectiveCamera): void {
    if (!this.temporal) return
    const moved = !this.prevViewMatrix.equals(camera.matrixWorldInverse)
    this.temporal.setFeedback(moved || !this.historyReady ? 0 : 0.88)
    this.prevViewMatrix.copy(camera.matrixWorldInverse)
    this.temporal.setHistory(this.historyReady ? (this.historyTarget?.texture ?? null) : null)
  }

  setSize(width: number, height: number): void {
    this.composer.setSize(width, height)
    this.historyTarget?.setSize(width, height)
    this.historyReady = false
  }

  render(): void {
    if (this.disposed) return
    this.composer.render()
    this.syncHistory()
  }

  private syncHistory(): void {
    if (!this.temporal || !this.historyCopyPass || !this.historyTarget) return
    const source = this.composer.outputBuffer ?? this.composer.inputBuffer
    if (!source?.texture) return
    this.historyCopyPass.render(
      this.renderer,
      source,
      null as unknown as WebGLRenderTarget,
      0,
      false
    )
    this.historyReady = true
  }

  setBloomIntensity(intensity: number): void {
    if (this.bloom) this.bloom.intensity = intensity
  }

  setBloomSmoothing(smoothing: number): void {
    if (this.bloom) this.bloom.luminanceMaterial.smoothing = smoothing
  }

  setBloomThreshold(threshold: number): void {
    if (this.bloom) this.bloom.luminanceMaterial.threshold = threshold
  }

  setDoFFocus(distance: number, range?: number): void {
    if (!this.depthOfField) return
    this.depthOfField.cocMaterial.focusDistance = distance
    if (range !== undefined) this.depthOfField.cocMaterial.focusRange = range
  }

  setSSRIntensity(intensity: number): void {
    this.ssr?.setIntensity(intensity)
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    this.historyCopyPass?.dispose()
    this.historyTarget?.dispose()
    this.composer.dispose()
  }
}

/** @deprecated 使用 PostStack.create */
export function createPostComposer(
  renderer: WebGLRenderer,
  scene: Scene,
  camera: Camera,
  quality: RenderQuality = 'high',
  bloomIntensity = 1,
  bloomSmoothing = 1.6,
  bloomThreshold = 0
): PostStackBundle {
  return PostStack.create(renderer, scene, camera, quality, {
    bloomIntensity,
    bloomLuminanceSmoothing: bloomSmoothing,
    bloomLuminanceThreshold: bloomThreshold
  })
}

export function setBloomSmoothing(bloom: BloomEffect, value: number): void {
  bloom.luminanceMaterial.smoothing = value
}
