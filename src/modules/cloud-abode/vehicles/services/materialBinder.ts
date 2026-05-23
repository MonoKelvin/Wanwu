import * as THREE from 'three'
import { SHOWROOM_LIGHTING } from '@modules/cloud-abode/config/showroomLighting'
import type { VehicleCustomization } from '../types/item'

let bodyMaterialRef: THREE.MeshStandardMaterial | null = null

function isPaintMesh(mesh: THREE.Mesh, customization: VehicleCustomization): boolean {
  const meshName = mesh.name.toLowerCase()
  const names = customization.paintMeshes.map((n) => n.toLowerCase())
  return names.some((n) => meshName.includes(n) || n.includes(meshName))
}

function isStandardMaterial(
  mat: THREE.Material
): mat is THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial {
  return (
    mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshPhysicalMaterial
  )
}

function configureBodyAo(texture: THREE.Texture): THREE.Texture {
  texture.flipY = false
  texture.colorSpace = THREE.LinearSRGBColorSpace
  texture.channel = 1
  texture.minFilter = THREE.NearestFilter
  texture.magFilter = THREE.NearestFilter
  return texture
}

/** 按材质名分配环境反射强度：车身亮、其余零件压暗，突出产品 */
function envIntensityForPart(matName: string, meshName: string): number {
  const n = matName.toLowerCase()
  const m = meshName.toLowerCase()
  if (m === 'body' || n.includes('body')) return SHOWROOM_LIGHTING.bodyEnvIntensity
  if (n.includes('wheel') || m.includes('wheel')) return SHOWROOM_LIGHTING.wheelEnvIntensity
  if (n.includes('glass') || n.includes('light') || m.includes('glass') || m.includes('deng'))
    return SHOWROOM_LIGHTING.glassEnvIntensity
  if (n.includes('iron') || n.includes('logo') || n.includes('chrome') || n.includes('chepai'))
    return SHOWROOM_LIGHTING.chromeEnvIntensity
  return SHOWROOM_LIGHTING.defaultEnvIntensity
}

/**
 * 车型材质（对标 su7-replica Car.handleModel + 分级 env 反射）
 */
export async function setupVehicleMaterials(
  root: THREE.Object3D,
  customization: VehicleCustomization,
  bodyColor: string,
  bodyAoUrl?: string
): Promise<void> {
  bodyMaterialRef = null
  let aoMap: THREE.Texture | null = null
  if (bodyAoUrl) {
    aoMap = configureBodyAo(await new THREE.TextureLoader().loadAsync(bodyAoUrl))
  }

  const color = new THREE.Color(bodyColor)

  root.traverse((obj) => {
    if (!(obj as THREE.Mesh).isMesh) return
    const mesh = obj as THREE.Mesh
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]

    for (const mat of materials) {
      if (!mat || !isStandardMaterial(mat)) continue

      if (aoMap) {
        mat.aoMap = aoMap
        mat.aoMapIntensity = 1
      }

      if (isPaintMesh(mesh, customization)) {
        mat.color.copy(color)
        if (!bodyMaterialRef && mesh.name.toLowerCase() === 'body') {
          bodyMaterialRef = mat
        }
      }

      mat.envMapIntensity = envIntensityForPart(mat.name ?? '', mesh.name)
      mat.needsUpdate = true
    }
  })

  if (!bodyMaterialRef) {
    root.traverse((obj) => {
      if (bodyMaterialRef || !(obj as THREE.Mesh).isMesh) return
      const mesh = obj as THREE.Mesh
      if (!isPaintMesh(mesh, customization)) return
      const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material
      if (mat && isStandardMaterial(mat)) bodyMaterialRef = mat
    })
  }
}

export function setVehicleEnvMapIntensity(root: THREE.Object3D, intensity: number): void {
  if (bodyMaterialRef) {
    bodyMaterialRef.envMapIntensity = intensity
    bodyMaterialRef.needsUpdate = true
    return
  }
  root.traverse((obj) => {
    if (!(obj as THREE.Mesh).isMesh) return
    const mesh = obj as THREE.Mesh
    if (mesh.name.toLowerCase() !== 'body') return
    const mat = mesh.material
    if (mat && isStandardMaterial(mat as THREE.Material)) {
      ;(mat as THREE.MeshStandardMaterial).envMapIntensity = intensity
      mat.needsUpdate = true
    }
  })
}

export function applyBodyColor(
  root: THREE.Object3D,
  customization: VehicleCustomization,
  hex: string
): void {
  const color = new THREE.Color(hex)
  root.traverse((obj) => {
    if (!(obj as THREE.Mesh).isMesh) return
    const mesh = obj as THREE.Mesh
    if (!isPaintMesh(mesh, customization)) return
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    for (const mat of materials) {
      if (!mat || !isStandardMaterial(mat)) continue
      mat.color.copy(color)
      mat.needsUpdate = true
    }
  })
}

export const setupVehiclePaint = setupVehicleMaterials
