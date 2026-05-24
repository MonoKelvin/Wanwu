export { RenderEngine } from './core/RenderEngine'
export { SceneRenderer } from './core/SceneRenderer'
export { RenderContext } from './core/RenderContext'
export { WebGPURenderContext } from './core/WebGPURenderContext'
export { createRenderContext } from './core/createRenderContext'
export { RenderLoop } from './core/RenderLoop'
export { RenderPipeline } from './pipeline/RenderPipeline'
export { PostStack, createPostComposer, setBloomSmoothing } from './pipeline/PostStack'
export { EnvironmentManager } from './lighting/EnvironmentManager'
export { ReflectionSystem } from './reflection/ReflectionSystem'
export { PlanarMeshReflector } from './reflection/PlanarMeshReflector'
export { AssetLoader } from './assets/AssetLoader'
export { AnimationSystem } from './animation/AnimationSystem'
export { CinematicCameraController } from './camera/CinematicCameraController'
export {
  createPhysicalMaterial,
  createGlassMaterial,
  traverseMaterials
} from './materials/ShaderLibrary'
export {
  probeRenderBackend,
  tryCreateWebGPURenderer,
  type BackendProbeResult
} from './core/RenderBackendProbe'
export { ScreenSpaceReflectionEffect } from './pipeline/effects/ScreenSpaceReflectionEffect'
export { ParticleSystem } from './effects/ParticleSystem'
export { PathTracingController } from './path/PathTracingController'
export { configureSmoothOrbitControls } from './controls/configureOrbitControls'
export { default as SceneCanvas } from './components/SceneCanvas.vue'
export { DynamicEnvMixer, hdrToPmremEnv } from './env/DynamicEnvMixer'
export { WebGPUPostStack } from './pipeline/WebGPUPostStack'
export { bakePmremFromScene } from './env/bakePmrem'
export type { RenderCapabilities } from './types/context'
export { CINEMATIC_POST } from './config/cinematicPreset'
export type { CinematicPostPreset } from './config/cinematicPreset'
export { TemporalBlendEffect } from './pipeline/effects/TemporalBlendEffect'
export { RENDERER_DEFAULTS, resolveRenderOptions } from './config/rendererDefaults'
export { setObjectClipping } from './utils/materialClipping'
export { fixGltfMaterialTextures } from './utils/gltfTextureUtils'
export { gsap } from './animation/gsap'
export type * from './types/index'
