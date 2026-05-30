import * as THREE from 'three'
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { fixGltfMaterialTextures } from '../utils/gltfTextureUtils'
import type { LoadProgressEvent } from '../types/engine'

const DRACO_DECODER = 'https://www.gstatic.com/draco/versioned/decoders/1.5.6/'

/**
 * 资产加载管线 — GLTF/Draco/Meshopt，不含业务材质绑定。
 */
export class AssetLoader {
  private readonly gltfLoader: GLTFLoader
  private readonly decodersReady: Promise<void>
  private onProgress: ((e: LoadProgressEvent) => void) | null = null
  private disposed = false

  constructor() {
    this.gltfLoader = new GLTFLoader()
    this.gltfLoader.setMeshoptDecoder(MeshoptDecoder)

    this.decodersReady = Promise.all([
      MeshoptDecoder.ready,
      import('three/addons/loaders/DRACOLoader.js').then(({ DRACOLoader }) => {
        if (this.disposed) return
        const draco = new DRACOLoader()
        draco.setDecoderPath(DRACO_DECODER)
        this.gltfLoader.setDRACOLoader(draco)
      })
    ]).then(() => undefined)
  }

  setProgressHandler(handler: ((e: LoadProgressEvent) => void) | null): void {
    this.onProgress = handler
  }

  async loadGltf(url: string, parent: THREE.Object3D): Promise<THREE.Group> {
    await this.decodersReady
    const fileName = url.substring(url.lastIndexOf('/') + 1)
    const base = url.substring(0, url.lastIndexOf('/') + 1)
    this.gltfLoader.setPath(base)

    return new Promise((resolve, reject) => {
      this.gltfLoader.load(
        fileName,
        (gltf) => {
          const root = gltf.scene
          fixGltfMaterialTextures(root)
          root.traverse((obj) => {
            if ((obj as THREE.Mesh).isMesh) {
              const mesh = obj as THREE.Mesh
              mesh.castShadow = true
              mesh.receiveShadow = false
            }
          })
          parent.add(root)
          resolve(root)
        },
        (xhr) => {
          if (!this.onProgress || !xhr.total) return
          this.onProgress({
            loaded: xhr.loaded,
            total: xhr.total,
            ratio: xhr.loaded / xhr.total
          })
        },
        reject
      )
    })
  }

  dispose(): void {
    this.disposed = true
  }
}
