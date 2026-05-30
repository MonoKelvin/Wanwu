import * as THREE from 'three'

export interface BakePmremOptions {
  near?: number
  far?: number
  renderTarget?: number
  size?: number
}

/** 从任意 probe 场景烘焙 PMREM 环境贴图（Three.js PMREMGenerator.fromScene） */
export function bakePmremFromScene(
  pmrem: THREE.PMREMGenerator,
  scene: THREE.Scene,
  options: BakePmremOptions = {}
): THREE.Texture {
  const { near = 0, far = 0.04, renderTarget = 48, size = 256 } = options

  const env = pmrem.fromScene(scene, near, far, renderTarget, { size }).texture
  env.mapping = THREE.CubeUVReflectionMapping
  return env
}
