import * as THREE from 'three'

export interface ShowroomTextureUrls {
  floorNormal: string
  floorRoughness: string
  showroomAo: string
  showroomLight: string
}

function configureMap(
  texture: THREE.Texture,
  options: { color?: boolean; channel?: number; repeat?: boolean } = {}
): THREE.Texture {
  texture.flipY = false
  texture.colorSpace = options.color ? THREE.SRGBColorSpace : THREE.LinearSRGBColorSpace
  if (options.channel !== undefined) texture.channel = options.channel
  if (options.repeat) {
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
  }
  return texture
}

function isFloorMesh(mesh: THREE.Mesh): boolean {
  const name = mesh.name.toLowerCase()
  if (name.includes('reflecfloor') || name === 'floor') return true
  const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
  return mats.some((m) => m?.name?.toLowerCase() === 'floor')
}

function patchFloorMaterial(
  mat: THREE.Material,
  maps: {
    normal: THREE.Texture
    roughness: THREE.Texture
    ao: THREE.Texture
    light: THREE.Texture
  }
): void {
  if (
    !(mat instanceof THREE.MeshPhysicalMaterial) &&
    !(mat instanceof THREE.MeshStandardMaterial)
  ) {
    return
  }

  mat.aoMap = maps.ao
  mat.aoMapIntensity = 1
  mat.lightMap = maps.light
  mat.lightMapIntensity = 1
  // 最终亮度由 ReflecFloor 着色器按 lightMap 遮罩控制
  mat.normalMap = maps.normal
  mat.normalScale = new THREE.Vector2(1, -1)
  mat.roughnessMap = maps.roughness
  mat.envMapIntensity = 0

  if (mat.aoMap) mat.aoMap.channel = 1
  if (mat.lightMap) mat.lightMap.channel = 1

  mat.needsUpdate = true
}

/**
 * 展厅贴图（对标 su7 StartRoom：在 GLTF 原有 floorMat 上挂贴图，不重建材质）
 */
export async function applyShowroomMaterials(
  showroomRoot: THREE.Object3D,
  urls: ShowroomTextureUrls
): Promise<void> {
  const loader = new THREE.TextureLoader()
  const [floorNormal, floorRoughness, showroomAo, showroomLight] = await Promise.all([
    loader.loadAsync(urls.floorNormal).then((t) => configureMap(t, { repeat: true })),
    loader.loadAsync(urls.floorRoughness).then((t) => configureMap(t, { repeat: true })),
    loader.loadAsync(urls.showroomAo).then((t) => configureMap(t, { channel: 1 })),
    loader.loadAsync(urls.showroomLight).then((t) => configureMap(t, { color: true, channel: 1 }))
  ])

  const floorMaps = {
    normal: floorNormal,
    roughness: floorRoughness,
    ao: showroomAo,
    light: showroomLight
  }

  showroomRoot.traverse((obj) => {
    if (!(obj as THREE.Mesh).isMesh) return
    const mesh = obj as THREE.Mesh
    if (!isFloorMesh(mesh)) return

    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    for (const mat of materials) {
      if (mat) patchFloorMaterial(mat, floorMaps)
    }
  })
}
