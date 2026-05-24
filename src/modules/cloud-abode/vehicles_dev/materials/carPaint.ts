import * as THREE from 'three'
import { createPhysicalMaterial } from '@renderer/materials/ShaderLibrary'

export interface CarPaintOptions {
  color: THREE.ColorRepresentation
  metalness?: number
  roughness?: number
  clearcoat?: number
  clearcoatRoughness?: number
  envMapIntensity?: number
}

/** 车漆 BRDF 预设 — 高 clearcoat + 低 roughness，依赖 scene.environment IBL */
export function createCarPaintMaterial(options: CarPaintOptions): THREE.MeshPhysicalMaterial {
  return createPhysicalMaterial({
    color: options.color,
    metalness: options.metalness ?? 0,
    roughness: options.roughness ?? 0.02,
    clearcoat: options.clearcoat ?? 1,
    clearcoatRoughness: options.clearcoatRoughness ?? 0.03,
    envMapIntensity: options.envMapIntensity ?? 1
  })
}

/** 更新已有材质为车漆参数（保留贴图） */
export function applyCarPaintParams(
  material: THREE.MeshPhysicalMaterial,
  options: Partial<CarPaintOptions>
): void {
  if (options.color !== undefined) material.color.set(options.color)
  if (options.metalness !== undefined) material.metalness = options.metalness
  if (options.roughness !== undefined) material.roughness = options.roughness
  if (options.clearcoat !== undefined) material.clearcoat = options.clearcoat
  if (options.clearcoatRoughness !== undefined) {
    material.clearcoatRoughness = options.clearcoatRoughness
  }
  if (options.envMapIntensity !== undefined) {
    material.envMapIntensity = options.envMapIntensity
  }
  material.needsUpdate = true
}
