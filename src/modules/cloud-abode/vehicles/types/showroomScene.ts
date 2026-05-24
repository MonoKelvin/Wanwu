import type * as THREE from 'three'

/** 平面反射地板 + 顶光片（云斋展厅 GLTF 场景句柄） */
export interface ReflectionFloorHandles {
  floorMesh: THREE.Mesh
  lightMesh: THREE.Mesh
  floorMaterial: THREE.MeshPhysicalMaterial
  lightMaterial: THREE.MeshStandardMaterial
}
