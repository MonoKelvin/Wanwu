import * as THREE from 'three'

/**
 * 离屏 WebGL 后端 — 供 WebGPU 主渲染器烘焙 PMREM / 运行需 WebGL 的环境混合 pass。
 * 单例，避免重复创建 WebGL 上下文。
 */
export class OffscreenGlBackend {
  private static instance: OffscreenGlBackend | null = null

  readonly renderer: THREE.WebGLRenderer
  readonly pmrem: THREE.PMREMGenerator

  private constructor() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: false,
      powerPreference: 'high-performance'
    })
    this.renderer.setSize(1, 1, false)
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.pmrem = new THREE.PMREMGenerator(this.renderer)
    this.pmrem.compileEquirectangularShader()
  }

  static get(): OffscreenGlBackend {
    if (!this.instance) this.instance = new OffscreenGlBackend()
    return this.instance
  }

  static disposeGlobal(): void {
    this.instance?.dispose()
    this.instance = null
  }

  dispose(): void {
    this.pmrem.dispose()
    this.renderer.dispose()
  }
}
