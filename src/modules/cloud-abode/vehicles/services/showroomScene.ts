import * as THREE from 'three'
import { PlanarMeshReflector } from '@renderer/reflection/PlanarMeshReflector'
import {
  bindFloorReflector,
  patchReflecFloorMaterial
} from '@renderer/shaders/reflecFloorPatch'
import { SHOWROOM_LIGHTING } from '@modules/cloud-abode/config/showroomLighting'
import type { ReflectionFloorHandles } from '@modules/cloud-abode/vehicles/types/showroomScene'
import type { RenderEngine } from '@renderer/core/RenderEngine'
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

export function extractShowroomHandles(root: THREE.Object3D): ReflectionFloorHandles | null {
  let floorMesh: THREE.Mesh | null = null
  let lightMesh: THREE.Mesh | null = null

  root.traverse((obj) => {
    if (!(obj as THREE.Mesh).isMesh) return
    const mesh = obj as THREE.Mesh
    if (!floorMesh && isFloorMesh(mesh)) floorMesh = mesh
    if (!lightMesh && isLightMesh(mesh)) lightMesh = mesh
  })

  if (!floorMesh || !lightMesh) return null

  const floorMat = Array.isArray(floorMesh.material) ? floorMesh.material[0] : floorMesh.material
  const lightMat = Array.isArray(lightMesh.material) ? lightMesh.material[0] : lightMesh.material

  if (!(floorMat instanceof THREE.MeshPhysicalMaterial)) return null
  if (!(lightMat instanceof THREE.MeshStandardMaterial)) return null

  return {
    floorMesh,
    lightMesh,
    floorMaterial: floorMat,
    lightMaterial: lightMat
  }
}

export function prepareShowroomScene(root: THREE.Object3D): void {
  root.traverse((obj) => {
    if (!(obj as THREE.Mesh).isMesh) return
    const mesh = obj as THREE.Mesh
    const n = mesh.name.toLowerCase()
    if (isFloorMesh(mesh) || isLightMesh(mesh)) return
    if (n.startsWith('plane.') || n === 'floor') {
      mesh.visible = false
    }
  })
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
