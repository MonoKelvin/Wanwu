export type { RenderQuality, RenderBackend, RenderEngineOptions, LoadProgressEvent, IRenderSubsystem } from './engine'
export type { IRenderContext, RenderContextBundle } from './context'
export type { PostEffectId, PostStackBundle, PostStackOptions } from './pipeline'

/** @deprecated 使用 RenderQuality */
export type SceneQuality = import('./engine').RenderQuality

/** @deprecated 使用 RenderEngineOptions */
export type SceneRendererOptions = import('./engine').RenderEngineOptions
