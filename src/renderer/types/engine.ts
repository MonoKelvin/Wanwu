import type * as THREE from 'three'

/** 渲染质量档位 — 控制 DPR、MSAA、后期特效精度 */
export type RenderQuality = 'high' | 'medium' | 'low'

/** WebGL 为主路径；WebGPU 为可选后端（需浏览器/Electron 支持） */
export type RenderBackend = 'webgl' | 'webgpu'

export interface RenderEngineOptions {
  quality?: RenderQuality
  backend?: RenderBackend
  exposure?: number
  toneMapping?: THREE.ToneMapping
  /** 是否启用后期处理栈 */
  postProcessing?: boolean
  bloomIntensity?: number
  bloomLuminanceSmoothing?: number
  bloomLuminanceThreshold?: number
  enableDoF?: boolean
  enableSSAO?: boolean
  enableSSR?: boolean
  ssrIntensity?: number
  enableToneMapping?: boolean
  /** 影视级后期 — SMAA / Grade / TAA / 增强 SSAO */
  cinematic?: boolean
  enableSMAA?: boolean
  enableCinematicGrade?: boolean
  enableTemporalAA?: boolean
  dofFocusDistance?: number
  dofFocusRange?: number
  /** 启用 GPU 路径追踪（WebGL 后端，场景加载后生效） */
  enablePathTracing?: boolean
  pathTracingMaxSamples?: number
  pathTracingBounces?: number
  /** 相机初始 FOV */
  cameraFov?: number
  cameraNear?: number
  cameraFar?: number
}

export interface LoadProgressEvent {
  loaded: number
  total: number
  ratio: number
}

/** 渲染子系统生命周期钩子 */
export interface IRenderSubsystem {
  init?(ctx: import('./context').IRenderContext): void
  update?(dt: number, elapsed: number): void
  dispose?(): void
}
