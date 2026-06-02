/** 短 TTL 内存缓存，合并并发相同 key 的请求 */
export class TtlRequestCache {
  private store = new Map<string, { exp: number; p: Promise<unknown> }>()

  constructor(private readonly ttlMs: number) {}

  run<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const now = Date.now()
    const hit = this.store.get(key)
    if (hit && hit.exp > now) return hit.p as Promise<T>

    const p = fn().catch((err) => {
      this.store.delete(key)
      throw err
    })
    this.store.set(key, { exp: now + this.ttlMs, p })
    return p as Promise<T>
  }

  clear(): void {
    this.store.clear()
  }
}
