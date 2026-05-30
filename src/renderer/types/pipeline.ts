import type { BloomEffect, DepthOfFieldEffect, SSAOEffect, SMAAEffect, ToneMappingEffect } from 'postprocessing'
import type { EffectComposer } from 'postprocessing'
import type { TemporalBlendEffect } from '../pipeline/effects/TemporalBlendEffect'

/** 后期特效标识 */
export type PostEffectId =
  | 'bloom'
  | 'depthOfField'
  | 'ssao'
  | 'ssr'
  | 'smaa'
  | 'temporalAA'
  | 'motionBlur'
  | 'colorGrading'
  | 'toneMapping'

export interface PostStackBundle {
  composer: EffectComposer
  bloom: BloomEffect | null
  depthOfField: DepthOfFieldEffect | null
  toneMapping: ToneMappingEffect | null
  ssao: SSAOEffect | null
  ssr: { setIntensity(value: number): void } | null
  smaa: SMAAEffect | null
  temporal: TemporalBlendEffect | null
}

export interface PostStackOptions {
  bloomIntensity?: number
  bloomLuminanceSmoothing?: number
  bloomLuminanceThreshold?: number
  enableDoF?: boolean
  dofFocusDistance?: number
  dofFocusRange?: number
  dofBokehScale?: number
  enableToneMapping?: boolean
  enableSSAO?: boolean
  /** 屏幕空间反射（high 质量推荐） */
  enableSSR?: boolean
  ssrIntensity?: number
  ssrMaxDistance?: number
  ssrThickness?: number
  ssrSteps?: number
  /** 影视级预设 — 启用 SMAA / Grade / 增强 SSAO/SSR */
  cinematic?: boolean
  enableSMAA?: boolean
  enableCinematicGrade?: boolean
  enableTemporalAA?: boolean
  temporalFeedback?: number
  normalPassResolutionScale?: number
  ssaoSamples?: number
  ssaoRings?: number
  ssaoRadius?: number
  ssaoIntensity?: number
  vignetteOffset?: number
  vignetteDarkness?: number
  gradeBrightness?: number
  gradeContrast?: number
  chromaticAberration?: number
  toneMappingWhitePoint?: number
  toneMappingMiddleGrey?: number
}
