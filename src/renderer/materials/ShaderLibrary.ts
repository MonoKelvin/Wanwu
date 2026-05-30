import * as THREE from 'three'

export interface PhysicalMaterialOptions {
  color?: THREE.ColorRepresentation
  metalness?: number
  roughness?: number
  clearcoat?: number
  clearcoatRoughness?: number
  envMapIntensity?: number
  transparent?: boolean
  transmission?: number
  ior?: number
  thickness?: number
}

/** 标准 PBR 物理材质工厂 */
export function createPhysicalMaterial(
  options: PhysicalMaterialOptions = {}
): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: options.color ?? 0xffffff,
    metalness: options.metalness ?? 0,
    roughness: options.roughness ?? 0.5,
    clearcoat: options.clearcoat ?? 0,
    clearcoatRoughness: options.clearcoatRoughness ?? 0.03,
    envMapIntensity: options.envMapIntensity ?? 1,
    transparent: options.transparent ?? false,
    transmission: options.transmission ?? 0,
    ior: options.ior ?? 1.5,
    thickness: options.thickness ?? 0
  })
}

/** 玻璃材质预设 */
export function createGlassMaterial(
  options: { transmission?: number; roughness?: number; ior?: number } = {}
): THREE.MeshPhysicalMaterial {
  return createPhysicalMaterial({
    color: 0xffffff,
    metalness: 0,
    roughness: options.roughness ?? 0.05,
    transmission: options.transmission ?? 1,
    transparent: true,
    ior: options.ior ?? 1.5,
    thickness: 0.5
  })
}

/** 遍历 Object3D 替换或更新指定名称的材质 */
export function traverseMaterials(
  root: THREE.Object3D,
  predicate: (mesh: THREE.Mesh, material: THREE.Material) => boolean,
  visitor: (material: THREE.Material) => void
): void {
  root.traverse((obj) => {
    if (!(obj as THREE.Mesh).isMesh) return
    const mesh = obj as THREE.Mesh
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    for (const mat of mats) {
      if (predicate(mesh, mat)) visitor(mat)
    }
  })
}

function vec2From(
  source: THREE.Vector2 | { x?: number; y?: number } | null | undefined,
  fallbackX = 1,
  fallbackY = 1
): THREE.Vector2 {
  if (source && typeof (source as THREE.Vector2).clone === 'function') {
    return (source as THREE.Vector2).clone()
  }
  return new THREE.Vector2(source?.x ?? fallbackX, source?.y ?? fallbackY)
}

function colorFrom(
  source: THREE.Color | THREE.ColorRepresentation | null | undefined,
  fallback: THREE.ColorRepresentation
): THREE.Color {
  if (source instanceof THREE.Color) return source.clone()
  return new THREE.Color(source ?? fallback)
}

function eulerFrom(source: THREE.Euler | null | undefined): THREE.Euler {
  if (source && typeof source.clone === 'function') return source.clone()
  return new THREE.Euler(0, 0, 0)
}

/** 修复 GLTF 上已存在的 Physical 材质缺失 Vector2/Color 字段 */
function patchPhysicalMaterial(material: THREE.MeshPhysicalMaterial): THREE.MeshPhysicalMaterial {
  material.normalScale = vec2From(material.normalScale)
  material.clearcoatNormalScale = vec2From(material.clearcoatNormalScale)
  material.envMapRotation = eulerFrom(material.envMapRotation)
  material.emissive = colorFrom(material.emissive, 0x000000)
  material.color = colorFrom(material.color, 0xffffff)
  material.sheenColor = colorFrom(material.sheenColor, 0x000000)
  material.attenuationColor = colorFrom(material.attenuationColor, 0xffffff)
  material.specularColor = colorFrom(material.specularColor, 0xffffff)
  if (!material.iridescenceThicknessRange) {
    material.iridescenceThicknessRange = [100, 400]
  }
  return material
}

/** 从 Standard 克隆为 Physical — 不使用 Material.copy()，避免 GLTF 缺字段崩溃 */
function cloneStandardAsPhysical(
  src: THREE.MeshStandardMaterial
): THREE.MeshPhysicalMaterial {
  const physical = new THREE.MeshPhysicalMaterial({
    name: src.name,
    fog: src.fog,
    blending: src.blending,
    side: src.side,
    vertexColors: src.vertexColors,
    opacity: src.opacity,
    transparent: src.transparent,
    alphaHash: src.alphaHash,
    alphaToCoverage: src.alphaToCoverage,
    depthWrite: src.depthWrite,
    depthTest: src.depthTest,
    depthFunc: src.depthFunc,
    color: colorFrom(src.color, 0xffffff),
    emissive: colorFrom(src.emissive, 0x000000),
    emissiveIntensity: src.emissiveIntensity,
    emissiveMap: src.emissiveMap,
    roughness: src.roughness,
    metalness: src.metalness,
    map: src.map,
    lightMap: src.lightMap,
    lightMapIntensity: src.lightMapIntensity,
    aoMap: src.aoMap,
    aoMapIntensity: src.aoMapIntensity,
    bumpMap: src.bumpMap,
    bumpScale: src.bumpScale,
    normalMap: src.normalMap,
    normalMapType: src.normalMapType,
    normalScale: vec2From(src.normalScale, 1, 1),
    displacementMap: src.displacementMap,
    displacementScale: src.displacementScale,
    displacementBias: src.displacementBias,
    roughnessMap: src.roughnessMap,
    metalnessMap: src.metalnessMap,
    alphaMap: src.alphaMap,
    envMap: src.envMap,
    envMapIntensity: src.envMapIntensity,
    envMapRotation: eulerFrom(src.envMapRotation),
    wireframe: src.wireframe,
    wireframeLinewidth: src.wireframeLinewidth,
    flatShading: src.flatShading,
    toneMapped: src.toneMapped,
    polygonOffset: src.polygonOffset,
    polygonOffsetFactor: src.polygonOffsetFactor,
    polygonOffsetUnits: src.polygonOffsetUnits
  })

  physical.userData = { ...src.userData }
  if (src.onBeforeCompile) physical.onBeforeCompile = src.onBeforeCompile
  if (src.customProgramCacheKey) {
    physical.customProgramCacheKey = src.customProgramCacheKey
  }

  return physical
}

/** 将 MeshStandardMaterial 升级为 MeshPhysicalMaterial（保留贴图与参数） */
export function upgradeStandardToPhysical(
  material: THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial
): THREE.MeshPhysicalMaterial {
  if (material instanceof THREE.MeshPhysicalMaterial) {
    return patchPhysicalMaterial(material)
  }
  return cloneStandardAsPhysical(material)
}

/** 在 mesh 上替换指定材质槽为 Physical 材质 */
export function replaceMeshMaterial(
  mesh: THREE.Mesh,
  index: number,
  next: THREE.Material
): void {
  if (Array.isArray(mesh.material)) {
    mesh.material[index] = next
  } else {
    mesh.material = next
  }
}
