import * as THREE from 'three'
import { applyCarPaintParams } from '@modules/cloud-abode/vehicles/materials/carPaint'
import { SHOWROOM_LIGHTING } from '@modules/cloud-abode/config/showroomLighting'
import {
  replaceMeshMaterial,
  upgradeStandardToPhysical
} from '@renderer/materials/ShaderLibrary'

/** GLTF 材质名（sm_car） */
const MAT = {
  PAINT: 'Car_body',
  LIGHT: 'Car_ight',
  GLASS: 'Car_window'
} as const

const NODE = {
  INNER_BODY: 'body',
  SHELL_BODY: 'body.001'
} as const

/** 最近一次解析到的 Car_body（供 envMapIntensity 动画） */
let bodyPaintMaterial: THREE.MeshPhysicalMaterial | null = null

function meshMaterials(mesh: THREE.Mesh): THREE.Material[] {
  return Array.isArray(mesh.material) ? mesh.material : [mesh.material]
}

function asPbrMaterial(mat: THREE.Material): THREE.MeshStandardMaterial | null {
  if (
    mat instanceof THREE.MeshStandardMaterial ||
    mat instanceof THREE.MeshPhysicalMaterial
  ) {
    return mat
  }
  return null
}

function ensureUv2(mesh: THREE.Mesh): void {
  const geo = mesh.geometry
  if (!geo.attributes.uv || geo.attributes.uv2) return
  geo.setAttribute('uv2', geo.attributes.uv)
}

function configureBodyAo(texture: THREE.Texture): THREE.Texture {
  texture.flipY = false
  texture.colorSpace = THREE.LinearSRGBColorSpace
  texture.channel = 1
  texture.minFilter = THREE.NearestFilter
  texture.magFilter = THREE.NearestFilter
  return texture
}

function meshMatchesPaintTarget(mesh: THREE.Mesh, paintMeshes?: string[]): boolean {
  if (!paintMeshes?.length) return true
  const name = mesh.name.toLowerCase()
  return paintMeshes.some((pattern) => {
    const p = pattern.toLowerCase()
    return name === p || name.startsWith(`${p}.`)
  })
}

function ensurePhysicalMaterial(
  mesh: THREE.Mesh,
  index: number,
  mat: THREE.MeshStandardMaterial
): THREE.MeshPhysicalMaterial {
  const physical = upgradeStandardToPhysical(mat)
  if (physical !== mat) replaceMeshMaterial(mesh, index, physical)
  return physical
}

/** 遍历所有 Car_body 材质实例（GLTF 可能对不同网格克隆材质） */
function forEachPaintMaterial(
  root: THREE.Object3D,
  fn: (mat: THREE.MeshPhysicalMaterial, mesh: THREE.Mesh) => void,
  paintMeshes?: string[]
): void {
  const seen = new Set<string>()
  root.traverse((obj) => {
    if (!(obj as THREE.Mesh).isMesh) return
    const mesh = obj as THREE.Mesh
    if (!meshMatchesPaintTarget(mesh, paintMeshes)) return

    const materials = meshMaterials(mesh)
    for (let i = 0; i < materials.length; i++) {
      const raw = materials[i]
      const mat = asPbrMaterial(raw)
      if (!mat || mat.name !== MAT.PAINT) continue
      if (seen.has(mat.uuid)) continue
      seen.add(mat.uuid)
      fn(ensurePhysicalMaterial(mesh, i, mat), mesh)
    }
  })
}

/**
 * 解析主车漆材质（优先 body 主网格 — 完整封闭壳体）
 */
export function resolveBodyPaintMaterial(root: THREE.Object3D): THREE.MeshPhysicalMaterial | null {
  if (bodyPaintMaterial) return bodyPaintMaterial

  const inner = root.getObjectByName(NODE.INNER_BODY)
  if (inner && (inner as THREE.Mesh).isMesh) {
    const mesh = inner as THREE.Mesh
    const materials = meshMaterials(mesh)
    for (let i = 0; i < materials.length; i++) {
      const mat = asPbrMaterial(materials[i])
      if (mat?.name === MAT.PAINT) {
        return ensurePhysicalMaterial(mesh, i, mat)
      }
    }
  }

  const shell = root.getObjectByName(NODE.SHELL_BODY)
  if (shell && (shell as THREE.Mesh).isMesh) {
    const mesh = shell as THREE.Mesh
    const materials = meshMaterials(mesh)
    for (let i = 0; i < materials.length; i++) {
      const mat = asPbrMaterial(materials[i])
      if (mat?.name === MAT.PAINT) {
        return ensurePhysicalMaterial(mesh, i, mat)
      }
    }
  }

  let found: THREE.MeshPhysicalMaterial | null = null
  forEachPaintMaterial(root, (mat) => {
    if (!found) found = mat
  })
  return found
}

/** 隐藏 body.001 反射壳，显示 body 主网格（避免车尾缺面） */
export function prepareVehicleShell(root: THREE.Object3D): void {
  const inner = root.getObjectByName(NODE.INNER_BODY)
  const shell = root.getObjectByName(NODE.SHELL_BODY)
  if (inner) inner.visible = true
  if (shell) shell.visible = false
}

/** 车漆 — 保留 GLTF 贴图，适度 clearcoat，依赖 scene.environment IBL */
function configureCarPaintMaterial(mat: THREE.MeshPhysicalMaterial): void {
  const baseRoughness = mat.roughnessMap ? mat.roughness : 0.12
  applyCarPaintParams(mat, {
    metalness: 0,
    roughness: Math.max(baseRoughness, 0.08),
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    envMapIntensity: SHOWROOM_LIGHTING.bodyEnvMapIntensity
  })
  mat.envMap = null
}

function applyBodyAo(mat: THREE.MeshStandardMaterial, aoMap: THREE.Texture | null): void {
  if (!aoMap) return
  mat.aoMap = aoMap
  mat.aoMapIntensity = SHOWROOM_LIGHTING.bodyAoIntensity
}

/** 按材质名分配环境反射强度：车身亮、其余零件压暗 */
function envIntensityForPart(matName: string, meshName: string): number {
  const n = matName.toLowerCase()
  const m = meshName.toLowerCase()
  if (m === 'body' || m === 'body.001' || n.includes('body')) {
    return SHOWROOM_LIGHTING.bodyEnvMapIntensity
  }
  if (n.includes('wheel') || m.includes('wheel')) return SHOWROOM_LIGHTING.wheelEnvIntensity
  if (n.includes('glass') || n.includes('light') || m.includes('glass') || m.includes('deng')) {
    return SHOWROOM_LIGHTING.glassEnvIntensity
  }
  if (n.includes('iron') || n.includes('logo') || n.includes('chrome') || n.includes('chepai')) {
    return SHOWROOM_LIGHTING.chromeEnvIntensity
  }
  return SHOWROOM_LIGHTING.defaultEnvIntensity
}

/** 车窗 — transmission 玻璃（three.js webgl_materials_car 同款思路） */
function configureGlassMaterial(mat: THREE.MeshPhysicalMaterial): void {
  mat.metalness = 0
  mat.roughness = 0.05
  mat.transmission = 1
  mat.transparent = true
  mat.ior = 1.5
  mat.thickness = 0.4
  mat.envMapIntensity = SHOWROOM_LIGHTING.glassEnvIntensity
  mat.envMap = null
}

function applyEmissive(mat: THREE.MeshStandardMaterial, mesh: THREE.Mesh): void {
  mat.toneMapped = false
  mat.emissiveIntensity = Math.max(mat.emissiveIntensity, 1)
  mat.side = THREE.DoubleSide
  mesh.renderOrder = 5
}

export interface PrepareVehicleShowroomOptions {
  bodyColor: string
  bodyAoUrl?: string
  /** item.json customization.paintMeshes */
  paintMeshes?: string[]
}

export async function prepareVehicleForShowroom(
  root: THREE.Object3D,
  options: PrepareVehicleShowroomOptions
): Promise<void> {
  bodyPaintMaterial = null
  prepareVehicleShell(root)

  let aoMap: THREE.Texture | null = null
  if (options.bodyAoUrl) {
    aoMap = configureBodyAo(
      await new THREE.TextureLoader().loadAsync(options.bodyAoUrl)
    )
  }

  root.traverse((obj) => {
    if (!(obj as THREE.Mesh).isMesh) return
    const mesh = obj as THREE.Mesh
    ensureUv2(mesh)

    const materials = meshMaterials(mesh)
    for (let i = 0; i < materials.length; i++) {
      const raw = materials[i]
      const mat = asPbrMaterial(raw)
      if (!mat) continue

      applyBodyAo(mat, aoMap)

      if (mat.name === MAT.PAINT) {
        const physical = ensurePhysicalMaterial(mesh, i, mat)
        configureCarPaintMaterial(physical)
      } else if (mat.name === MAT.GLASS) {
        configureGlassMaterial(ensurePhysicalMaterial(mesh, i, mat))
      } else {
        mat.envMapIntensity = envIntensityForPart(mat.name ?? '', mesh.name)
      }

      if (mat.name === MAT.LIGHT) applyEmissive(mat, mesh)
      mat.envMap = null
      mat.needsUpdate = true
    }
  })

  applyBodyColor(root, options.bodyColor, options.paintMeshes)
}

/** 更新全部 Car_body 底色（su7 bodyMat.color，兼容多材质实例） */
export function applyBodyColor(
  root: THREE.Object3D,
  hex: string,
  paintMeshes?: string[]
): void {
  const color = new THREE.Color()
  try {
    color.setStyle(hex)
  } catch {
    return
  }

  let primary: THREE.MeshPhysicalMaterial | null = null
  forEachPaintMaterial(
    root,
    (mat) => {
      mat.color.copy(color)
      mat.needsUpdate = true
      if (!primary) primary = mat
    },
    paintMeshes
  )

  bodyPaintMaterial = primary ?? resolveBodyPaintMaterial(root)
}

/** su7 Car.setBodyEnvmapIntensity */
export function setBodyEnvMapIntensity(intensity: number): void {
  const mat = bodyPaintMaterial
  if (!mat) return
  mat.envMapIntensity = intensity
  mat.needsUpdate = true
}

export function collectVehicleReflectorIgnores(root: THREE.Object3D): THREE.Object3D[] {
  const list: THREE.Object3D[] = []
  const shell = root.getObjectByName(NODE.SHELL_BODY)
  const inner = root.getObjectByName(NODE.INNER_BODY)
  if (shell) list.push(shell)
  if (inner) list.push(inner)
  return list
}
