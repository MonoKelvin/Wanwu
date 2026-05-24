import * as THREE from 'three'
import { hideSubtree, restoreVisibility } from '../utils/visibilitySubtree'
import { PackedMipMapGenerator } from './PackedMipMapGenerator'

export interface PlanarMeshReflectorOptions {
  renderer: THREE.WebGLRenderer
  scene: THREE.Scene
  camera: THREE.Camera
  floorMesh: THREE.Mesh
  resolution?: number
  ignoreObjects?: THREE.Object3D[]
}

/**
 * 平面 mesh 反射 — su7 风格 packed mipmap + 反射矩阵
 */
export class PlanarMeshReflector {
  readonly reflectMatrix = new THREE.Matrix4()
  readonly mipmapTexture: THREE.Texture
  readonly resolution: number

  private readonly renderer: THREE.WebGLRenderer
  private readonly scene: THREE.Scene
  private readonly camera: THREE.Camera
  private readonly floorMesh: THREE.Mesh
  private readonly reflectCamera = new THREE.PerspectiveCamera()
  private readonly reflectPlane = new THREE.Plane()
  private readonly mirrorTarget: THREE.WebGLRenderTarget
  private readonly packedTarget: THREE.WebGLRenderTarget
  private readonly mipmapper: PackedMipMapGenerator
  private readonly ignoreObjects: THREE.Object3D[]
  private readonly viewDir = new THREE.Vector3()
  private readonly planeNormal = new THREE.Vector3()

  /** @deprecated 使用 mipmapTexture */
  get texture(): THREE.Texture {
    return this.mipmapTexture
  }

  constructor(options: PlanarMeshReflectorOptions) {
    this.renderer = options.renderer
    this.scene = options.scene
    this.camera = options.camera
    this.floorMesh = options.floorMesh
    this.resolution = options.resolution ?? 1024
    this.ignoreObjects = [this.floorMesh, ...(options.ignoreObjects ?? [])]
    this.mipmapper = new PackedMipMapGenerator()

    this.mirrorTarget = new THREE.WebGLRenderTarget(this.resolution, this.resolution, {
      type: THREE.UnsignedByteType,
      colorSpace: THREE.LinearSRGBColorSpace,
      depthBuffer: true
    })
    this.mirrorTarget.texture.generateMipmaps = false

    const packedW = Math.floor(this.resolution * 1.5)
    this.packedTarget = new THREE.WebGLRenderTarget(packedW, this.resolution, {
      type: THREE.UnsignedByteType,
      colorSpace: THREE.LinearSRGBColorSpace,
      depthBuffer: false,
      generateMipmaps: false
    })

    this.mipmapTexture = this.packedTarget.texture
    this.mipmapTexture.minFilter = THREE.LinearFilter
    this.mipmapTexture.magFilter = THREE.LinearFilter
  }

  update(): void {
    if (!this.floorMesh?.matrixWorld) return

    this.reflectPlane.set(new THREE.Vector3(0, 1, 0), 0)
    this.reflectPlane.applyMatrix4(this.floorMesh.matrixWorld)

    const floorPos = new THREE.Vector3()
    this.floorMesh.getWorldPosition(floorPos)
    const camPos = new THREE.Vector3()
    this.camera.getWorldPosition(camPos)
    this.viewDir.subVectors(floorPos, camPos)
    this.planeNormal.copy(this.reflectPlane.normal)
    if (this.viewDir.dot(this.planeNormal) > 0) return

    const cam = this.camera as THREE.PerspectiveCamera
    this.reflectCamera.copy(cam)
    this.reflectCamera.projectionMatrix.copy(cam.projectionMatrix)

    const view = new THREE.Vector3()
    this.camera.getWorldPosition(view)

    const normal = this.reflectPlane.normal.clone()
    const target = new THREE.Vector3()
    this.reflectPlane.projectPoint(view, target)
    const mirrorPos = target.clone().sub(view).add(target)
    this.reflectCamera.position.copy(mirrorPos)

    const lookAt = new THREE.Vector3(0, 0, -1)
      .applyQuaternion(this.camera.getWorldQuaternion(new THREE.Quaternion()))
      .add(view)
    lookAt.sub(floorPos)
    lookAt.reflect(normal).negate()
    lookAt.add(floorPos)

    this.reflectCamera.up.set(0, 1, 0)
    this.reflectCamera.up.applyQuaternion(this.camera.getWorldQuaternion(new THREE.Quaternion()))
    this.reflectCamera.up.reflect(normal)
    this.reflectCamera.lookAt(lookAt)
    this.reflectCamera.updateMatrixWorld()

    const bias = new THREE.Matrix4().set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1)
    bias.multiply(this.reflectCamera.projectionMatrix)
    bias.multiply(this.reflectCamera.matrixWorldInverse)
    this.reflectMatrix.copy(bias)

    const clipPlane = this.reflectPlane.clone()
    clipPlane.applyMatrix4(this.reflectCamera.matrixWorldInverse)
    const clip = new THREE.Vector4(
      clipPlane.normal.x,
      clipPlane.normal.y,
      clipPlane.normal.z,
      clipPlane.constant
    )
    const proj = this.reflectCamera.projectionMatrix.clone()
    const q = new THREE.Vector4(
      (Math.sign(clip.x) + proj.elements[8]) / proj.elements[0],
      (Math.sign(clip.y) + proj.elements[9]) / proj.elements[5],
      -1,
      (1 + proj.elements[10]) / proj.elements[14]
    )
    clip.multiplyScalar(2 / clip.dot(q))
    proj.elements[2] = clip.x
    proj.elements[6] = clip.y
    proj.elements[10] = clip.z + 1
    proj.elements[14] = clip.w
    this.reflectCamera.projectionMatrix.copy(proj)

    const prevTarget = this.renderer.getRenderTarget()
    const prevAutoClear = this.renderer.autoClear
    const prevScissorTest = this.renderer.getScissorTest()
    const prevViewport = new THREE.Vector4()
    const prevScissor = new THREE.Vector4()
    this.renderer.getViewport(prevViewport)
    this.renderer.getScissor(prevScissor)

    this.renderer.setRenderTarget(this.mirrorTarget)
    this.renderer.autoClear = true
    this.renderer.clear()

    const hidden: THREE.Object3D[] = []
    for (const obj of this.ignoreObjects) {
      hidden.push(...hideSubtree(obj))
    }

    this.reflectCamera.layers.set(0)
    this.renderer.render(this.scene, this.reflectCamera)

    restoreVisibility(hidden)

    this.mipmapper.update(
      this.mirrorTarget.texture,
      this.packedTarget,
      this.renderer,
      this.resolution
    )

    this.renderer.setRenderTarget(prevTarget)
    this.renderer.autoClear = prevAutoClear
    this.renderer.setScissorTest(prevScissorTest)
    this.renderer.setViewport(prevViewport)
    this.renderer.setScissor(prevScissor)
  }

  dispose(): void {
    this.mirrorTarget.dispose()
    this.packedTarget.dispose()
    this.mipmapper.dispose()
  }
}
