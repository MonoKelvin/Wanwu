/**
 * 影视级实时渲染后期预设 — 对齐 webgi / threepipe 后期链思路
 * @see https://webgi.dev/
 */
export const CINEMATIC_POST = {
  /** SMAA 抗锯齿（最终 pass） */
  enableSMAA: true,
  /** 暗角 + 对比度 + 色差 */
  enableCinematicGrade: true,
  vignetteOffset: 0.38,
  vignetteDarkness: 0.42,
  brightness: 0.015,
  contrast: 0.06,
  chromaticAberration: 0.0015,
  /** SSAO 精度 */
  ssaoSamples: 24,
  ssaoRings: 6,
  ssaoRadius: 0.14,
  ssaoIntensity: 1.25,
  /** SSR 步进 */
  ssrSteps: 48,
  ssrMaxDistance: 18,
  ssrThickness: 0.12,
  /** NormalPass 分辨率（相对屏幕） */
  normalPassResolutionScale: 0.75,
  /** ACES 白点 / 中灰 */
  toneMappingWhitePoint: 4.2,
  toneMappingMiddleGrey: 0.55
} as const

export type CinematicPostPreset = typeof CINEMATIC_POST
