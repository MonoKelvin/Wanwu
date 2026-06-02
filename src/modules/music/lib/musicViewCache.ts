const TTL_MS = 5 * 60 * 1000

type Entry = {
  data: unknown
  savedAt: number
}

const cache = new Map<string, Entry>()

export function readMusicViewCache<T>(key: string, ttlMs = TTL_MS): T | null {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() - entry.savedAt > ttlMs) {
    cache.delete(key)
    return null
  }
  return entry.data as T
}

export function writeMusicViewCache<T>(key: string, data: T): void {
  cache.set(key, { data, savedAt: Date.now() })
  if (cache.size <= 48) return
  const oldest = [...cache.entries()].sort((a, b) => a[1].savedAt - b[1].savedAt)
  while (cache.size > 48) {
    const drop = oldest.shift()
    if (drop) cache.delete(drop[0])
  }
}

export function clearMusicViewCache(prefix?: string): void {
  if (!prefix) {
    cache.clear()
    return
  }
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key)
  }
}
