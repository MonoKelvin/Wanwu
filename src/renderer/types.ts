import type * as THREE from 'three'

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

export interface ShowroomSceneHandles {
  floorMesh: THREE.Mesh
  lightMesh: THREE.Mesh
  floorMaterial: THREE.MeshPhysicalMaterial
  lightMaterial: THREE.MeshStandardMaterial
}
