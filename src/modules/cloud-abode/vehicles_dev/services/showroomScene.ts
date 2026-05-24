import * as THREE from 'three'
import { PlanarMeshReflector } from '@renderer/reflection/PlanarMeshReflector'
import {
  bindFloorReflector,
  patchReflecFloorMaterial
} from '@modules/cloud-abode/vehicles_dev/shaders/reflecFloorPatch'
import { SHOWROOM_LIGHTING } from '@modules/cloud-abode/vehicles_dev/config/showroomLighting'
import type { ReflectionFloorHandles } from '@modules/cloud-abode/vehicles_dev/types/showroomScene'
import type { RenderEngine } from '@renderer/core/RenderEngine'
import { upgradeStandardToPhysical } from '@renderer/materials/ShaderLibrary'
import { collectVehicleReflectorIgnores } from './vehicleShowroom'

function isFloorMesh(mesh: THREE.Mesh): boolean {
  const name = mesh.name.toLowerCase()
  if (name.includes('reflecfloor') || name === 'floor') return true
  const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
  return mats.some((m) => m?.name?.toLowerCase() === 'floor')
}

function isLightMesh(mesh: THREE.Mesh): boolean {
  const name = mesh.name.toLowerCase()
  if (name.includes('light')) return true
  const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
  return mats.some((m) => m?.name?.toLowerCase() === 'light')
}

export function resolveLightPanelRoot(handles: ReflectionFloorHandles): THREE.Object3D {
  let node: THREE.Object3D = handles.lightMesh
  while (node.parent) {
    const n = node.parent.name.toLowerCase()
    if (n.includes('light') && node.parent.type !== 'Scene') {
      node = node.parent
    } else {
      break
    }
  }
  return node
}

function ensureUv2(mesh: THREE.Mesh): void {
  const geo = mesh.geometry
  if (!geo.attributes.uv || geo.attributes.uv2) return
  geo.setAttribute('uv2', geo.attributes.uv)
}

function ensureFloorPhysicalMaterial(mesh: THREE.Mesh): THREE.MeshPhysicalMaterial | null {
  const raw = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material
  if (!raw) return null
  if (raw instanceof THREE.MeshPhysicalMaterial) return raw
  if (!(raw instanceof THREE.MeshStandardMaterial)) return null
  const physical = upgradeStandardToPhysical(raw)
  if (physical !== raw) {
    if (Array.isArray(mesh.material)) mesh.material[0] = physical
    else mesh.material = physical
  }
  return physical
}

export function extractShowroomHandles(root: THREE.Object3D): ReflectionFloorHandles | null {
  let floorMesh: THREE.Mesh | null = null
  let lightMesh: THREE.Mesh | null = null

  root.traverse((obj) => {
    if (!(obj as THREE.Mesh).isMesh) return
    const mesh = obj as THREE.Mesh
    if (!floorMesh && isFloorMesh(mesh)) floorMesh = mesh
    if (!lightMesh && isLightMesh(mesh)) lightMesh = mesh
  })

  if (!floorMesh || !lightMesh) {
    console.warn('[showroomScene] 未找到 floor/light mesh')
    return null
  }

  ensureUv2(floorMesh)

  const floorMat = ensureFloorPhysicalMaterial(floorMesh)
  if (floorMat && !floorMat.lightMap) {
    console.warn('[showroomScene] 地板 Physical 材质缺少 lightMap，请先 applyShowroomMaterials')
  }
  const lightRaw = Array.isArray(lightMesh.material) ? lightMesh.material[0] : lightMesh.material
  if (!floorMat || !(lightRaw instanceof THREE.MeshStandardMaterial)) {
    console.warn('[showroomScene] floor/light 材质类型不匹配', {
      floor: floorMat?.constructor.name,
      light: lightRaw?.constructor.name
    })
    return null
  }

  return {
    floorMesh,
    lightMesh,
    floorMaterial: floorMat,
    lightMaterial: lightRaw
  }
}

export function prepareShowroomScene(root: THREE.Object3D): void {
  root.traverse((obj) => {
    if (!(obj as THREE.Mesh).isMesh) return
    const mesh = obj as THREE.Mesh
    const n = mesh.name.toLowerCase()
    if (isFloorMesh(mesh)) {
      mesh.receiveShadow = true
      return
    }
    if (isLightMesh(mesh)) {
      mesh.castShadow = false
      mesh.receiveShadow = false
      return
    }
    if (n.startsWith('plane.') || n === 'floor') {
      mesh.visible = false
    }
  })
}

/** GLTF 地板 ReflecFloor 默认偏移 ~11.8m，对齐至车辆/轨道中心 */
export function centerShowroomOnCar(
  root: THREE.Object3D,
  target = new THREE.Vector3(0, 0, 0)
): void {
  const floor =
    root.getObjectByName('ReflecFloor') ??
    root.getObjectByName('ReflecFloor'.toLowerCase())
  if (!floor) return

  root.updateWorldMatrix(true, true)
  const box = new THREE.Box3().setFromObject(floor)
  const center = box.getCenter(new THREE.Vector3())
  root.position.x += target.x - center.x
  root.position.z += target.z - center.z
  root.updateWorldMatrix(true, true)
}

export interface LightPanelStateOptions {
  fadeOpacity?: boolean
}

export function setFloorVisible(handles: ReflectionFloorHandles, visible: boolean): void {
  handles.floorMesh.visible = visible
}

export function setLightPanelOpacity(handles: ReflectionFloorHandles, opacity: number): void {
  const o = THREE.MathUtils.clamp(opacity, 0, 1)
  handles.lightMaterial.opacity = o
  handles.lightMaterial.alphaTest = o > 0.92 ? 0.1 : 0
  handles.lightMaterial.needsUpdate = true
}

export function setLightPanelState(
  handles: ReflectionFloorHandles,
  amount: number,
  options: LightPanelStateOptions = {}
): void {
  const a = THREE.MathUtils.clamp(amount, 0, 1)
  const fadeOpacity = options.fadeOpacity ?? false
  const lightRoot = resolveLightPanelRoot(handles)

  lightRoot.visible = true
  handles.lightMesh.visible = true
  handles.lightMaterial.visible = true

  if (a <= 0.001) {
    handles.lightMaterial.emissive.set(0x000000)
    handles.lightMaterial.emissiveIntensity = 0
    if (fadeOpacity) {
      handles.lightMaterial.opacity = 0
      handles.lightMaterial.alphaTest = 0
    } else {
      handles.lightMaterial.opacity = 1
      handles.lightMaterial.alphaTest = 0.1
    }
  } else {
    handles.lightMaterial.emissive.set(0xffffff)
    handles.lightMaterial.emissiveIntensity = a * SHOWROOM_LIGHTING.keyLightEmissive

    if (fadeOpacity) {
      handles.lightMaterial.opacity = a
      handles.lightMaterial.alphaTest = a > 0.92 ? 0.1 : 0
    } else {
      handles.lightMaterial.opacity = 1
      handles.lightMaterial.alphaTest = 0.1
    }
  }

  handles.lightMaterial.needsUpdate = true
}

export function collectReflectorIgnoreTargets(
  handles: ReflectionFloorHandles,
  vehicleRoot?: THREE.Object3D | null
): THREE.Object3D[] {
  const lightRoot = resolveLightPanelRoot(handles)
  const list: THREE.Object3D[] = [lightRoot, handles.lightMesh, handles.floorMesh]
  if (vehicleRoot) list.push(...collectVehicleReflectorIgnores(vehicleRoot))
  return list
}

export function enableReflecFloorShader(
  handles: ReflectionFloorHandles,
  floorTintMul?: number
): void {
  if (!handles.floorMaterial.lightMap) {
    console.warn('[showroomScene] 地板 lightMap 未绑定，聚光/阴影可能不可见')
  }

  handles.floorMesh.receiveShadow = true

  patchReflecFloorMaterial(handles.floorMaterial, {
    time: 0,
    speed: 0,
    reflectIntensity: 0,
    floorColor: new THREE.Color(0x000000),
    floorTintMul
  })

  handles.lightMaterial.toneMapped = false
  handles.lightMaterial.transparent = true
  handles.lightMaterial.depthWrite = false
  setLightPanelState(handles, 0)
}

export function attachShowroomFloorReflector(
  engine: RenderEngine,
  handles: ReflectionFloorHandles,
  vehicleRoot?: THREE.Object3D | null
): PlanarMeshReflector {
  const reflector = new PlanarMeshReflector({
    renderer: engine.webglRenderer,
    scene: engine.threeScene,
    camera: engine.threeCamera,
    floorMesh: handles.floorMesh,
    resolution: SHOWROOM_LIGHTING.reflectorResolution,
    ignoreObjects: collectReflectorIgnoreTargets(handles, vehicleRoot)
  })
  bindFloorReflector(handles.floorMaterial, reflector)
  engine.reflection.addReflector(reflector)
  return reflector
}
