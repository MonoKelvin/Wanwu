export type SceneQuality = 'high' | 'medium' | 'low'

export interface SceneRendererOptions {
  quality?: SceneQuality
  exposure?: number
}

export interface LoadProgressEvent {
  loaded: number
  total: number
  ratio: number
}
