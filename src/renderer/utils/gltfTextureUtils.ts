import * as THREE from 'three'

/** 修正 GLTF 贴图色彩空间、flipY 与 PBR 默认参数 */
export function fixGltfMaterialTextures(root: THREE.Object3D): void {
  root.traverse((obj) => {
    if (!(obj as THREE.Mesh).isMesh) return
    const mesh = obj as THREE.Mesh
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    for (const mat of materials) {
      if (!mat) continue
      applyTextureColorSpace(mat)
      applyPbrDefaults(mat)
    }
  })
}

function fixTexture(tex: THREE.Texture, color: boolean): void {
  tex.flipY = false
  tex.colorSpace = color ? THREE.SRGBColorSpace : THREE.LinearSRGBColorSpace
  tex.anisotropy = Math.min(tex.anisotropy || 1, 8)
}

function applyTextureColorSpace(mat: THREE.Material): void {
  const std = mat as THREE.MeshStandardMaterial
  if (!('map' in std)) return

  if (std.map) fixTexture(std.map, true)
  if (std.emissiveMap) fixTexture(std.emissiveMap, true)

  const dataMaps = [
    std.normalMap,
    std.roughnessMap,
    std.metalnessMap,
    std.aoMap,
    std.alphaMap,
    std.lightMap
  ].filter(Boolean) as THREE.Texture[]

  for (const tex of dataMaps) {
    fixTexture(tex, tex === std.lightMap)
  }
}

function applyPbrDefaults(mat: THREE.Material): void {
  if (
    !(mat instanceof THREE.MeshStandardMaterial) &&
    !(mat instanceof THREE.MeshPhysicalMaterial)
  ) {
    return
  }

  mat.envMap = null
  if (mat.envMapIntensity <= 0) {
    mat.envMapIntensity = 1
  }

  if (mat instanceof THREE.MeshPhysicalMaterial) {
    if (mat.clearcoat > 0 && mat.clearcoatRoughness === undefined) {
      mat.clearcoatRoughness = 0.03
    }
    if (mat.transmission > 0) {
      mat.transparent = true
      mat.depthWrite = false
      mat.side = THREE.DoubleSide
    }
  }

  mat.needsUpdate = true
}
