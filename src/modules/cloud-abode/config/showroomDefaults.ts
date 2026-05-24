import { RENDERER_DEFAULTS } from '@renderer/config/rendererDefaults'

/** 云斋展厅场景默认参数（相机、地板等） */
export const SHOWROOM_SCENE_DEFAULTS = {
  ...RENDERER_DEFAULTS,
  cameraBase: { x: 0, y: 0.8, z: -7 } as const,
  reflectionFloorTintMul: 3
} as const
