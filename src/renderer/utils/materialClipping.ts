import * as THREE from 'three'

/** 对物体下所有 Mesh 材质启用/关闭裁剪平面 */
export function setObjectClipping(
  root: THREE.Object3D,
  planes: THREE.Plane[] | null,
  options?: { doubleSide?: boolean }
): THREE.Material[] {
  const touched: THREE.Material[] = []
  root.traverse((obj) => {
    if (!(obj as THREE.Mesh).isMesh) return
    const mesh = obj as THREE.Mesh
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    for (const mat of materials) {
      if (!mat) continue
      touched.push(mat)
      mat.clippingPlanes = planes
      if (planes?.length) mat.clipShadows = true
      if (options?.doubleSide !== undefined) mat.side = options.doubleSide ? THREE.DoubleSide : THREE.FrontSide
      mat.needsUpdate = true
    }
  })
  return touched
}
