import * as THREE from 'three'
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js'
import { bakePmremFromScene } from '../env/bakePmrem'
import { DynamicEnvMixer, hdrToPmremEnv } from '../env/DynamicEnvMixer'
import { SceneEnvironmentCapture } from '../env/SceneEnvironmentCapture'
import type { IRenderContext } from '../types/context'

/** HDR / PMREM / 动态环境混合 / 场景捕获 */
export class EnvironmentManager {
  private nightPmrem: THREE.Texture | null = null
  private dayPmrem: THREE.Texture | null = null
  private dynamicEnv: DynamicEnvMixer | null = null
  private environmentOverride: THREE.Texture | null = null
  private readonly sceneEnvCapture: SceneEnvironmentCapture | null
  private readonly rgbLoader = new RGBELoader()

  constructor(private readonly ctx: IRenderContext) {
    this.sceneEnvCapture = ctx.pmrem
      ? new SceneEnvironmentCapture(ctx.effectsWebGL, ctx.pmrem)
      : null
  }

  get dynamicEnvironment(): DynamicEnvMixer | null {
    return this.dynamicEnv
  }

  get nightEnvironment(): THREE.Texture | null {
    return this.nightPmrem
  }

  get capturedEnvironment(): THREE.Texture | null {
    return this.sceneEnvCapture?.texture ?? null
  }

  setIntensity(intensity: number): void {
    this.ctx.scene.environmentIntensity = intensity
  }

  /** 双 HDR → PMREM → 实时混合 */
  async initDynamicEnvironment(dayUrl: string, nightUrl: string): Promise<void> {
    const pmrem = this.requirePmrem()
    const [dayHdr, nightHdr] = await Promise.all([
      this.loadHdr(dayUrl),
      this.loadHdr(nightUrl)
    ])

    this.disposeDynamic()
    this.nightPmrem = hdrToPmremEnv(pmrem, nightHdr)
    this.dayPmrem = hdrToPmremEnv(pmrem, dayHdr)
    this.dynamicEnv = new DynamicEnvMixer(
      this.ctx.effectsWebGL,
      this.nightPmrem,
      this.dayPmrem
    )
    this.dynamicEnv.setWeight(0)
    this.dynamicEnv.setIntensity(0)
    this.environmentOverride = null
    this.apply()
  }

  /** 从 probe 场景烘焙 PMREM 环境贴图 */
  bakeEnvironmentFromScene(
    scene: THREE.Scene,
    options?: Parameters<typeof bakePmremFromScene>[2]
  ): THREE.Texture {
    return bakePmremFromScene(this.requirePmrem(), scene, options)
  }

  setOverride(texture: THREE.Texture | null): void {
    this.environmentOverride = texture
    this.apply()
  }

  clearOverride(): void {
    this.environmentOverride = null
    this.apply()
  }

  clearEnvironment(): void {
    this.clearDynamic()
    this.ctx.scene.environment = null
  }

  /** 捕获当前场景为 PMREM */
  captureScene(ignoreRoots: THREE.Object3D[] = []): THREE.Texture {
    if (!this.sceneEnvCapture) throw new Error('[EnvironmentManager] 场景捕获不可用')
    return this.sceneEnvCapture.capture(this.ctx.scene, ignoreRoots)
  }

  update(): void {
    if (this.environmentOverride) {
      this.ctx.scene.environment = this.environmentOverride
      return
    }
    if (this.dynamicEnv) {
      this.ctx.scene.environment = this.dynamicEnv.update(this.ctx.effectsWebGL)
    }
  }

  async preloadNightPmrem(url: string): Promise<void> {
    const pmrem = this.requirePmrem()
    this.nightPmrem?.dispose()
    this.nightPmrem = null
    const hdr = await this.loadHdr(url)
    this.nightPmrem = hdrToPmremEnv(pmrem, hdr)
  }

  async loadHdrToPmrem(url: string): Promise<THREE.Texture> {
    const pmrem = this.requirePmrem()
    const hdr = await this.loadHdr(url)
    const env = pmrem.fromEquirectangular(hdr).texture
    hdr.dispose()
    env.mapping = THREE.CubeUVReflectionMapping
    return env
  }

  dispose(): void {
    this.disposeDynamic()
    this.sceneEnvCapture?.dispose()
    this.environmentOverride = null
  }

  private requirePmrem(): THREE.PMREMGenerator {
    if (!this.ctx.pmrem) throw new Error('[EnvironmentManager] PMREM 不可用')
    return this.ctx.pmrem
  }

  private apply(): void {
    if (this.environmentOverride) {
      this.ctx.scene.environment = this.environmentOverride
      return
    }
    if (this.dynamicEnv) {
      this.ctx.scene.environment = this.dynamicEnv.update(this.ctx.effectsWebGL)
    }
  }

  private clearDynamic(): void {
    this.environmentOverride = null
    this.dynamicEnv?.dispose()
    this.dynamicEnv = null
    this.nightPmrem?.dispose()
    this.nightPmrem = null
    this.dayPmrem?.dispose()
    this.dayPmrem = null
  }

  private disposeDynamic(): void {
    this.dynamicEnv?.dispose()
    this.dynamicEnv = null
  }

  private loadHdr(url: string): Promise<THREE.DataTexture> {
    return new Promise((resolve, reject) => {
      this.rgbLoader.load(url, resolve, undefined, reject)
    })
  }
}
