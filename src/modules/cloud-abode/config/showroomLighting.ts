/**
 * 云斋展厅参数 — 对齐 gamemcu SU7 / su7-replica Experience + World
 * @see D:\Work\Code\git\su7-replica\src\Experience
 */
export const SHOWROOM_LIGHTING = {
  useHdrEnvironment: true,
  cameraFov: 33.4,
  cameraFovRush: 36,
  /** su7 Car：仅 bodyMat.envMapIntensity 动画（入场值压低，避免镜面感） */
  bodyEnvMapIntensity: 0.9,
  bodyEnvMapIntensityRush: 10,
  /** DynamicEnv 混合强度 — 低于 1 避免全场泛亮 */
  envIntensity: 0.52,
  envIntensityRush: 0.01,
  /** 非车身零件 IBL 强度分级 */
  wheelEnvIntensity: 0.36,
  chromeEnvIntensity: 0.44,
  glassEnvIntensity: 0.5,
  defaultEnvIntensity: 0.38,
  envWeight: 1,
  envFadeInDuration: 4,
  envFadeInDelay: 0.5,
  envWeightFadeOverlap: 2.5,
  bodyAoIntensity: 1,
  floorReflectIntensity: 18,
  floorReflectMix: 0.38,
  /** su7 roughnessLevel = roughness * (1.7 - 0.7*r) * 4 */
  floorReflectRoughnessMul: 4,
  floorLightMapIntensity: 1,
  /** lightMap pow 指数，>1 收紧聚光、压暗周围 */
  floorSpotContrast: 1.15,
  floorAoIntensity: 1,
  keyLightEmissive: 0.92,
  bloomIntensity: 0.42,
  bloomLuminanceSmoothing: 1.6,
  bloomLuminanceThreshold: 0,
  bloomIntensityRush: 2,
  bloomLuminanceSmoothingRush: 0.4,
  toneMappingExposure: 0.9,
  /** 屏幕空间反射 — 对齐 webgi SSReflectionPlugin（逐步启用） */
  enableSSR: false,
  ssrIntensity: 0.42,
  /** 屏幕空间环境光遮蔽 */
  enableSSAO: false,
  /** 影视级后期 — SMAA / Grade / TAA（逐步启用） */
  cinematic: false,
  enableSMAA: false,
  enableCinematicGrade: false,
  enableTemporalAA: false,
  floorTintMul: 3,
  lightFadeInDuration: 4,
  lightFadeInDelay: 1,
  /** rush：speed 0→4(2s)→10(4s)，Car.update rotateZ(-speed*0.03) */
  rushSpeedMid: 4,
  rushSpeedMax: 10,
  rushSpeedMidDuration: 2,
  rushSpeedMaxDuration: 4,
  wheelSpinPerSpeed: 1.875,
  rushSceneCaptureDelay: 1,
  rushEnvBoostDuration: 4,
  rushLightFadeDuration: 1,
  rushFloorLerpDuration: 4,
  rushEnvFadeDuration: 1,
  rushFovDuration: 2,
  rushExitSpeedDuration: 2,
  rushExitRestoreDuration: 4,
  cameraShakeRush: 1,
  reflectorResolution: 1024
} as const
