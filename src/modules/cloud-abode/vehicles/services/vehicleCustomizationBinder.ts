import * as THREE from 'three'
import type { VehicleCustomization, WheelOption, LiveryOption } from '../types/item'

const DEFAULT_WHEEL_MATCH = ['wheel', 'm_wheel']

function matchesName(name: string, patterns: string[]): boolean {
  const lower = name.toLowerCase()
  return patterns.some((p) => lower.includes(p.toLowerCase()))
}

function isWheelTarget(mesh: THREE.Mesh, option: WheelOption): boolean {
  const patterns = option.match ?? DEFAULT_WHEEL_MATCH
  const meshName = mesh.name.toLowerCase()
  if (!meshName.includes('wheel')) return false
  if (meshName.includes('body')) return false
  return matchesName(mesh.name, patterns)
}

function isAccentMesh(mesh: THREE.Mesh, patterns: string[]): boolean {
  return matchesName(mesh.name, patterns)
}

/**
 * 收集行驶旋转节点（对标 su7 Car：仅旋转 Wheel 组下的子 mesh，避免父+子双重旋转导致偏轴）
 */
export function collectWheelSpinNodes(root: THREE.Object3D): THREE.Object3D[] {
  const nodes: THREE.Object3D[] = []
  root.traverse((obj) => {
    if (obj.name !== 'Wheel') return
    for (const child of obj.children) {
      nodes.push(child)
    }
  })
  return nodes
}

export function applyWheelOption(root: THREE.Object3D, option: WheelOption): void {
  const color = option.rimColor ? new THREE.Color(option.rimColor) : null

  root.traverse((obj) => {
    if (!(obj as THREE.Mesh).isMesh) return
    const mesh = obj as THREE.Mesh
    if (!isWheelTarget(mesh, option)) return

    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    for (const mat of materials) {
      if (!mat) continue
      if (
        mat instanceof THREE.MeshPhysicalMaterial ||
        mat instanceof THREE.MeshStandardMaterial
      ) {
        if (color) mat.color.copy(color)
        if (option.metalness !== undefined) mat.metalness = option.metalness
        if (option.roughness !== undefined) mat.roughness = option.roughness
        mat.needsUpdate = true
      }
    }
  })
}

export function applyLiveryOption(
  root: THREE.Object3D,
  option: LiveryOption
): void {
  if (!option.accentMeshes?.length || !option.accentColor) return
  const accent = new THREE.Color(option.accentColor)

  root.traverse((obj) => {
    if (!(obj as THREE.Mesh).isMesh) return
    const mesh = obj as THREE.Mesh
    if (!isAccentMesh(mesh, option.accentMeshes!)) return

    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    for (const mat of materials) {
      if (!mat) continue
      if (
        mat instanceof THREE.MeshPhysicalMaterial ||
        mat instanceof THREE.MeshStandardMaterial
      ) {
        mat.color.copy(accent)
        mat.needsUpdate = true
      }
    }
  })
}

export function applyCustomization(
  root: THREE.Object3D,
  customization: VehicleCustomization,
  wheelId: string,
  liveryId: string
): void {
  const wheel = customization.wheels.find((w) => w.id === wheelId) ?? customization.wheels[0]
  const livery =
    customization.liveries.find((l) => l.id === liveryId) ?? customization.liveries[0]
  if (wheel) applyWheelOption(root, wheel)
  if (livery) applyLiveryOption(root, livery)
}
