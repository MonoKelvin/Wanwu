import type { PlanarMeshReflector } from '../reflection/PlanarMeshReflector'

/**
 * 反射子系统 — 管理平面反射、SSR 等反射 pass 的每帧更新。
 */
export class ReflectionSystem {
  private reflectors: PlanarMeshReflector[] = []

  addReflector(reflector: PlanarMeshReflector): void {
    if (!this.reflectors.includes(reflector)) {
      this.reflectors.push(reflector)
    }
  }

  removeReflector(reflector: PlanarMeshReflector): void {
    const i = this.reflectors.indexOf(reflector)
    if (i >= 0) this.reflectors.splice(i, 1)
  }

  update(): void {
    for (const r of this.reflectors) {
      try {
        r.update()
      } catch (err) {
        console.error('[ReflectionSystem] 反射器更新失败', err)
      }
    }
  }

  dispose(): void {
    for (const r of this.reflectors) r.dispose()
    this.reflectors.length = 0
  }
}
