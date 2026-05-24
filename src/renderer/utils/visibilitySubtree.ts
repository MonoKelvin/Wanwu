import * as THREE from 'three'

/** traverse 不包含根节点自身，反射/捕获隐藏须覆盖整棵子树 */
export function forEachSubtreeObject(root: THREE.Object3D, fn: (obj: THREE.Object3D) => void): void {
  fn(root)
  root.traverse(fn)
}

/** 临时隐藏子树，返回需 restore 的节点 */
export function hideSubtree(root: THREE.Object3D): THREE.Object3D[] {
  const hidden: THREE.Object3D[] = []
  forEachSubtreeObject(root, (obj) => {
    if (obj.visible) {
      hidden.push(obj)
      obj.visible = false
    }
  })
  return hidden
}

export function restoreVisibility(objects: THREE.Object3D[]): void {
  for (const obj of objects) obj.visible = true
}
