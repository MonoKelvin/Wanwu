import * as THREE from 'three'
import { hideSubtree, restoreVisibility } from '../utils/visibilitySubtree'

/**
 * 场景环境捕获 — 将当前场景烘焙为 PMREM
 * rush 时切换为捕获 PMREM，避免 night HDR 暖色顶光残留。
 */
export class SceneEnvironmentCapture {
  private renderTarget: THREE.WebGLRenderTarget | null = null

  constructor(
    private readonly renderer: THREE.WebGLRenderer,
    private readonly pmrem: THREE.PMREMGenerator
  ) {}

  capture(scene: THREE.Scene, ignoreRoots: THREE.Object3D[] = []): THREE.Texture {
    const hidden: THREE.Object3D[] = []
    for (const root of ignoreRoots) {
      hidden.push(...hideSubtree(root))
    }

    this.dispose()
    this.renderTarget = this.pmrem.fromScene(scene, 0, 0.1, 120, { size: 512 })
    const texture = this.renderTarget.texture
    texture.mapping = THREE.CubeUVReflectionMapping

    restoreVisibility(hidden)
    return texture
  }

  get texture(): THREE.Texture | null {
    return this.renderTarget?.texture ?? null
  }

  dispose(): void {
    if (!this.renderTarget) return
    this.renderTarget.texture.dispose()
    this.renderTarget.dispose()
    this.renderTarget = null
  }
}
