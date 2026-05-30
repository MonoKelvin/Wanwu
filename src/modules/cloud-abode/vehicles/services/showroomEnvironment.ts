import type * as THREE from 'three'
import type { RenderEngine } from '@renderer/core/RenderEngine'
import { buildPaintStudioProbeScene } from '../env/paintStudioEnvironment'

let cachedPaintStudioPmrem: THREE.Texture | null = null

export type ShowroomEnvironmentSource = 'hdr' | 'paint-studio'

export interface InitShowroomEnvironmentOptions {
  /** 工作室 PMREM 回退时的 scene.environmentIntensity */
  fallbackIntensity?: number
  /** 强制使用工作室 PMREM（跳过 HDR） */
  forcePaintStudio?: boolean
}

/** 无 HDR 时初始化云斋车漆工作室 PMREM 并设为 scene.environment */
export function initShowroomPaintStudioEnvironment(
  engine: RenderEngine,
  intensity = 1
): THREE.Texture {
  cachedPaintStudioPmrem?.dispose()
  cachedPaintStudioPmrem = engine.environment.bakeEnvironmentFromScene(
    buildPaintStudioProbeScene(),
    { far: 0.04, renderTarget: 48, size: 256 }
  )
  engine.environment.clearOverride()
  engine.environment.clearEnvironment()
  engine.environment.setOverride(cachedPaintStudioPmrem)
  engine.environment.setIntensity(intensity)
  return cachedPaintStudioPmrem
}

/**
 * 加载 day/night HDR 动态环境；失败时自动回退工作室 PMREM。
 */
export async function initShowroomDynamicEnvironment(
  engine: RenderEngine,
  dayUrl: string,
  nightUrl: string,
  options: InitShowroomEnvironmentOptions = {}
): Promise<ShowroomEnvironmentSource> {
  if (options.forcePaintStudio) {
    initShowroomPaintStudioEnvironment(engine, options.fallbackIntensity ?? 1)
    return 'paint-studio'
  }

  try {
    await engine.environment.initDynamicEnvironment(dayUrl, nightUrl)
    return 'hdr'
  } catch (err) {
    console.warn('[showroomEnvironment] HDR 环境加载失败，回退工作室 PMREM', err)
    initShowroomPaintStudioEnvironment(engine, options.fallbackIntensity ?? 1)
    return 'paint-studio'
  }
}

export function disposeShowroomPaintStudioEnvironment(): void {
  cachedPaintStudioPmrem?.dispose()
  cachedPaintStudioPmrem = null
}
