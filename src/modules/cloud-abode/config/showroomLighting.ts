/**
 * 展厅灯光调参（对标 gamemcu / su7：暗场 + 车身高光 + 地面局部反射）
 */
export const SHOWROOM_LIGHTING = {
  /** DynamicEnv 混合强度上限（低于 su7 的 1，避免全场泛亮） */
  envIntensity: 0.52,
  /** 车身反射强度 */
  bodyEnvIntensity: 0.9,
  /** 轮毂 / 轮胎 */
  wheelEnvIntensity: 0.36,
  /** 镀铬 / 徽标 */
  chromeEnvIntensity: 0.44,
  /** 玻璃 / 灯罩 */
  glassEnvIntensity: 0.5,
  /** 其它零件默认 */
  defaultEnvIntensity: 0.38,
  /** 地板平面反射（su7 为 25，略降防止高光溢出） */
  floorReflectIntensity: 22,
  /** 顶光片 emissive */
  keyLightEmissive: 0.92,
  bloomIntensity: 0.42,
  toneMappingExposure: 0.9,
  /** 地板着色器底色倍率（su7 col *= 3） */
  floorTintMul: 3
} as const
