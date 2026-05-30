/// <reference types="vite/client" />

declare module '*.svg' {
  const src: string
  export default src
}

declare module '*.svg?raw' {
  const src: string
  export default src
}

declare module '*.png' {
  const src: string
  export default src
}

declare module '*.glsl' {
  const src: string
  export default src
}

declare module '*.frag' {
  const src: string
  export default src
}

declare module '*.vert' {
  const src: string
  export default src
}

declare module 'three-gpu-pathtracer' {
  import type { WebGLRenderer, Scene, Camera } from 'three'

  export class WebGLPathTracer {
    samples: number
    bounces: number
    tiles: { set(x: number, y: number): void }
    constructor(renderer: WebGLRenderer)
    renderSample(): void
    updateCamera(): void
    setBVHWorker(worker: unknown): void
    setSceneAsync(
      scene: Scene,
      camera: Camera,
      options?: { onProgress?: (v: number) => void }
    ): Promise<void>
    reset(): void
    dispose(): void
  }
}

declare module 'three-mesh-bvh/worker' {
  export class ParallelMeshBVHWorker {
    constructor()
  }
}

import type { WanwuApi } from '@shared/types/api'

declare global {
  interface Window {
    wanwu: WanwuApi
  }
}

export {}
