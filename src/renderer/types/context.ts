import type * as THREE from 'three'
import type { WebGPURenderer } from 'three/webgpu'
import type { RenderBackend } from './engine'

/** 渲染后端能力矩阵 */
export interface RenderCapabilities {
  /** PMREM 环境烘焙 */
  pmrem: boolean
  /** postprocessing 库全栈（WebGL） */
  postProcessing: boolean
  /** WebGPU TSL Bloom 后期 */
  tslPostProcessing: boolean
  /** three-gpu-pathtracer */
  pathTracing: boolean
  /** PlanarMeshReflector（需 WebGL） */
  planarReflection: boolean
}

/** 渲染上下文统一接口 — WebGL / WebGPU 双后端 */
export interface IRenderContext {
  readonly backend: RenderBackend
  readonly capabilities: RenderCapabilities
  /** @deprecated 使用 capabilities.postProcessing */
  readonly supportsPostProcessing: boolean
  /** 主 Canvas 渲染器（WebGL 或 WebGPU 包装） */
  readonly renderer: THREE.WebGLRenderer
  /** 用于 PMREM / 路径追踪 / 环境混合的 WebGL 渲染器 */
  readonly effectsWebGL: THREE.WebGLRenderer
  readonly webgpuRenderer: WebGPURenderer | null
  readonly scene: THREE.Scene
  readonly camera: THREE.PerspectiveCamera
  readonly root: THREE.Group
  readonly pmrem: THREE.PMREMGenerator | null
  readonly domElement: HTMLCanvasElement
  render(): void
  resize(): void
  dispose(): void
}

/** @deprecated 使用 IRenderContext */
export interface RenderContextBundle {
  renderer: THREE.WebGLRenderer
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  root: THREE.Group
  pmrem: THREE.PMREMGenerator | null
}
