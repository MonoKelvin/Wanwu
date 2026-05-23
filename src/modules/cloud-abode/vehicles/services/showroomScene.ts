import * as THREE from 'three'
import { PlanarMeshReflector } from '@renderer/reflection/PlanarMeshReflector'
import {
  bindFloorReflector,
  patchReflecFloorMaterial
} from '@renderer/shaders/reflecFloorPatch'
import type { ShowroomSceneHandles } from '@renderer/types'
import type { SceneRenderer } from '@renderer/core/SceneRenderer' // type-only，避免循环依赖

export type { ShowroomSceneHandles }

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

/** 从 sm_startroom 提取 ReflecFloor / light.001 */
export function extractShowroomHandles(root: THREE.Object3D): ShowroomSceneHandles | null {
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

/** 展厅地板 ReflecFloor 着色器补丁（在 applyShowroomMaterials 之后调用） */
export function enableReflecFloorShader(handles: ShowroomSceneHandles): void {
  patchReflecFloorMaterial(handles.floorMaterial, {
    time: 0,
    speed: 0,
    reflectIntensity: 0,
    floorColor: new THREE.Color(0x000000)
  })

  handles.lightMaterial.emissive = new THREE.Color(0xffffff)
  handles.lightMaterial.emissiveIntensity = 0
  handles.lightMaterial.toneMapped = false
  handles.lightMaterial.transparent = true
  handles.lightMaterial.opacity = 0
  handles.lightMaterial.alphaTest = 0.1
  handles.lightMaterial.depthWrite = false
}

/** 绑定展厅地板平面反射（需在 SceneRenderer 与车型加载完成后调用） */
export function attachShowroomFloorReflector(
  sceneRenderer: SceneRenderer,
  handles: ShowroomSceneHandles
): PlanarMeshReflector {
  const reflector = new PlanarMeshReflector({
    renderer: sceneRenderer.webglRenderer,
    scene: sceneRenderer.threeScene,
    camera: sceneRenderer.threeCamera,
    floorMesh: handles.floorMesh,
    resolution: 1024,
    ignoreObjects: [handles.lightMesh]
  })
  bindFloorReflector(handles.floorMaterial, reflector)
  sceneRenderer.setFloorReflector(reflector)
  return reflector
}
