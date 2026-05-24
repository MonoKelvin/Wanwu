import * as THREE from 'three'
import type { RenderEngineOptions } from '../types/engine'

/** 渲染器通用默认参数 */
export const RENDERER_DEFAULTS = {
  toneMapping: THREE.CineonToneMapping,
  toneMappingExposure: 1,
  bloomIntensity: 1,
  bloomLuminanceSmoothing: 1.6,
  bloomLuminanceThreshold: 0,
  cameraFov: 50,
  cameraBase: { x: 0, y: 0.8, z: -11 } as const,
  orbitTarget: { x: 0, y: 0.8, z: 0 } as const
} as const

export function resolveRenderOptions(options: RenderEngineOptions = {}) {
  return {
    quality: options.quality ?? ('high' as const),
    backend: options.backend ?? ('webgl' as const),
    exposure: options.exposure ?? RENDERER_DEFAULTS.toneMappingExposure,
    bloomIntensity: options.bloomIntensity ?? RENDERER_DEFAULTS.bloomIntensity,
    bloomLuminanceSmoothing:
      options.bloomLuminanceSmoothing ?? RENDERER_DEFAULTS.bloomLuminanceSmoothing,
    bloomLuminanceThreshold:
      options.bloomLuminanceThreshold ?? RENDERER_DEFAULTS.bloomLuminanceThreshold,
    toneMapping: options.toneMapping ?? RENDERER_DEFAULTS.toneMapping,
    enableSSR: options.enableSSR,
    enableSSAO: options.enableSSAO,
    ssrIntensity: options.ssrIntensity,
    enableToneMapping: options.enableToneMapping,
    cinematic: options.cinematic,
    enableSMAA: options.enableSMAA,
    enableCinematicGrade: options.enableCinematicGrade,
    enableTemporalAA: options.enableTemporalAA
  }
}
