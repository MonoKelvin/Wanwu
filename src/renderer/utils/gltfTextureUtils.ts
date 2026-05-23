import * as THREE from 'three'

/** 修正 GLTF 贴图（对标 su7-replica World.handleAssets） */
export function fixGltfMaterialTextures(root: THREE.Object3D): void {
  root.traverse((obj) => {
    if (!(obj as THREE.Mesh).isMesh) return
    const mesh = obj as THREE.Mesh
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    for (const mat of materials) {
      if (!mat) continue
      applyTextureColorSpace(mat)
    }
  })
}

function fixTexture(tex: THREE.Texture, color: boolean): void {
  tex.flipY = false
  tex.colorSpace = color ? THREE.SRGBColorSpace : THREE.LinearSRGBColorSpace
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
