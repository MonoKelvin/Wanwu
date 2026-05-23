import * as THREE from 'three'
import type { VehicleCustomization } from '../types/item'

export function applyBodyColor(root: THREE.Object3D, customization: VehicleCustomization, hex: string): void {
  const color = new THREE.Color(hex)
  const names = new Set(customization.paintMeshes.map((n) => n.toLowerCase()))

  root.traverse((obj) => {
    if (!(obj as THREE.Mesh).isMesh) return
    const mesh = obj as THREE.Mesh
    const meshName = mesh.name.toLowerCase()
    const match = [...names].some((n) => meshName.includes(n) || n.includes(meshName))
    if (!match) return

    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    for (const mat of materials) {
      if (!mat) continue
      if (mat instanceof THREE.MeshPhysicalMaterial || mat instanceof THREE.MeshStandardMaterial) {
        mat.color.copy(color)
        mat.needsUpdate = true
      }
    }
  })
}
