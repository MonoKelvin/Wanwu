import * as THREE from 'three'
import {
  createCarPaintMaterial
} from '@modules/cloud-abode/vehicles/materials/carPaint'
import { SHOWROOM_LIGHTING } from '@modules/cloud-abode/vehicles/config/showroomLighting'
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
  SHELL_BODY: 'body.001',
  SHELL_TRIM: 'body_smoothblack'
} as const

/** 玻璃/灯条保持单面；其余车身外壳强制双面，避免车尾法线朝内被剔除 */
function shouldForceDoubleSide(matName: string, meshName: string): boolean {
  const n = (matName ?? '').toLowerCase()
  const m = meshName.toLowerCase()
  if (matName === MAT.GLASS || matName === MAT.LIGHT) return false
  if (n.includes('glass') || n.includes('window') || m.includes('glass')) return false
  if (n.includes('light') || m.includes('lightglass')) return false
  if (matName === MAT.PAINT) return true
  if (n.includes('body') || m.includes('body')) return true
  if (m.includes('houshijin') || m.includes('shache') || m.includes('yugua')) return true
  return false
}

export function applyVehicleExteriorSides(root: THREE.Object3D): void {
  root.traverse((obj) => {
    if (!(obj as THREE.Mesh).isMesh) return
    const mesh = obj as THREE.Mesh
    if (!mesh.visible) return
    for (const raw of meshMaterials(mesh)) {
      if (!raw) continue
      if (shouldForceDoubleSide(raw.name ?? '', mesh.name)) {
        raw.side = THREE.DoubleSide
        raw.needsUpdate = true
      }
    }
  })
}

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

function ensurePhysicalMaterial(
  mesh: THREE.Mesh,
  index: number,
  mat: THREE.MeshStandardMaterial
): THREE.MeshPhysicalMaterial {
  const physical = upgradeStandardToPhysical(mat)
  if (physical !== mat) replaceMeshMaterial(mesh, index, physical)
  return physical
}

function buildCarPaintMaterial(
  bodyColor: string,
  aoMap: THREE.Texture | null
): THREE.MeshPhysicalMaterial {
  const paint = createCarPaintMaterial({
    color: bodyColor,
    metalness: 0,
    roughness: 0.08,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    envMapIntensity: SHOWROOM_LIGHTING.bodyEnvMapIntensity
  })
  paint.name = MAT.PAINT
  paint.side = THREE.DoubleSide
  paint.envMap = null
  if (aoMap) {
    paint.aoMap = aoMap
    paint.aoMapIntensity = SHOWROOM_LIGHTING.bodyAoIntensity
  }
  return paint
}

function replacePaintOnMesh(
  mesh: THREE.Mesh,
  bodyColor: string,
  aoMap: THREE.Texture | null
): THREE.MeshPhysicalMaterial | null {
  let primary: THREE.MeshPhysicalMaterial | null = null
  const materials = meshMaterials(mesh)
  for (let i = 0; i < materials.length; i++) {
    if (materials[i]?.name !== MAT.PAINT) continue
    const paint = buildCarPaintMaterial(bodyColor, aoMap)
    replaceMeshMaterial(mesh, i, paint)
    primary = paint
  }
  return primary
}

/**
 * 解析主车漆材质 — 优先可见外壳 body.001，其次 body
 */
export function resolveBodyPaintMaterial(root: THREE.Object3D): THREE.MeshPhysicalMaterial | null {
  if (bodyPaintMaterial) return bodyPaintMaterial

  for (const nodeName of [NODE.SHELL_BODY, NODE.INNER_BODY]) {
    const node = root.getObjectByName(nodeName)
    if (!node || !(node as THREE.Mesh).isMesh || !node.visible) continue
    const mesh = node as THREE.Mesh
    const materials = meshMaterials(mesh)
    for (let i = 0; i < materials.length; i++) {
      const mat = asPbrMaterial(materials[i])
      if (mat?.name === MAT.PAINT) {
        return ensurePhysicalMaterial(mesh, i, mat)
      }
    }
  }

  let found: THREE.MeshPhysicalMaterial | null = null
  root.traverse((obj) => {
    if (found || !(obj as THREE.Mesh).isMesh) return
    const mesh = obj as THREE.Mesh
    if (!mesh.visible) return
    const materials = meshMaterials(mesh)
    for (let i = 0; i < materials.length; i++) {
      const mat = asPbrMaterial(materials[i])
      if (mat?.name === MAT.PAINT) {
        found = ensurePhysicalMaterial(mesh, i, mat)
        return
      }
    }
  })
  return found
}

/**
 * 显示 body.001 外壳（居中、完整尺寸），隐藏 body 内壳。
 * 外漆 Car_body 设 DoubleSide，避免车尾法线朝内缺面。
 */
export function prepareVehicleShell(root: THREE.Object3D): void {
  const inner = root.getObjectByName(NODE.INNER_BODY)
  const shell = root.getObjectByName(NODE.SHELL_BODY)
  const trim = root.getObjectByName(NODE.SHELL_TRIM)
  if (inner) inner.visible = false
  if (shell) shell.visible = true
  if (trim) trim.visible = true
}

/** 车窗 — transmission 玻璃 */
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

/** 按材质名分配环境反射强度 */
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

export interface PrepareVehicleShowroomOptions {
  bodyColor: string
  bodyAoUrl?: string
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

  const shell = root.getObjectByName(NODE.SHELL_BODY)
  if (shell && (shell as THREE.Mesh).isMesh) {
    bodyPaintMaterial = replacePaintOnMesh(
      shell as THREE.Mesh,
      options.bodyColor,
      aoMap
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

      if (mat.name === MAT.PAINT) {
        if (mesh.name === NODE.SHELL_BODY) continue
        const paint = buildCarPaintMaterial(options.bodyColor, aoMap)
        replaceMeshMaterial(mesh, i, paint)
      } else if (mat.name === MAT.GLASS) {
        configureGlassMaterial(ensurePhysicalMaterial(mesh, i, mat))
      } else {
        mat.envMapIntensity = envIntensityForPart(mat.name ?? '', mesh.name)
      }

      if (mat.name === MAT.LIGHT) applyEmissive(mat, mesh)
      if (mat.name !== MAT.PAINT) {
        mat.envMap = null
      }
      mat.needsUpdate = true
    }
  })

  applyBodyColor(root, options.bodyColor)
  applyVehicleExteriorSides(root)
}

/** 更新全部 Car_body 底色 */
export function applyBodyColor(
  root: THREE.Object3D,
  hex: string,
  _paintMeshes?: string[]
): void {
  const color = new THREE.Color()
  try {
    color.setStyle(hex)
  } catch {
    return
  }

  let primary: THREE.MeshPhysicalMaterial | null = null
  let updated = 0

  root.traverse((obj) => {
    if (!(obj as THREE.Mesh).isMesh) return
    const mesh = obj as THREE.Mesh
    if (!mesh.visible) return

    const materials = meshMaterials(mesh)
    for (let i = 0; i < materials.length; i++) {
      const raw = materials[i]
      if (raw?.name !== MAT.PAINT) continue

      let mat = asPbrMaterial(raw)
      if (!mat) continue
      mat = ensurePhysicalMaterial(mesh, i, mat)
      mat.color.copy(color)
      mat.map = null
      mat.side = THREE.DoubleSide
      mat.needsUpdate = true
      updated++
      if (!primary) primary = mat
    }
  })

  if (updated === 0) {
    console.warn('[vehicleShowroom] applyBodyColor: 未找到可见 Car_body 材质', { hex })
  }

  bodyPaintMaterial = primary ?? resolveBodyPaintMaterial(root)
  applyVehicleExteriorSides(root)
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
  if (shell && !shell.visible) list.push(shell)
  if (inner && !inner.visible) list.push(inner)
  return list
}
