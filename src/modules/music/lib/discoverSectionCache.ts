import type { DiscoverSectionKey } from '@shared/types/music'

const CACHE_PREFIX = 'wanwu.music.discover.section.'
const DEFAULT_TTL_MS = 10 * 60 * 1000

type CachedSection<T> = {
  data: T
  savedAt: number
}

export function readDiscoverSectionCache<T>(key: DiscoverSectionKey, ttlMs = DEFAULT_TTL_MS): T | null {
  try {
    const raw = sessionStorage.getItem(`${CACHE_PREFIX}${key}`)
    if (!raw) return null
    const parsed = JSON.parse(raw) as CachedSection<T>
    if (!parsed?.savedAt || Date.now() - parsed.savedAt > ttlMs) {
      sessionStorage.removeItem(`${CACHE_PREFIX}${key}`)
      return null
    }
    return parsed.data
  } catch {
    return null
  }
}

export function writeDiscoverSectionCache<T>(key: DiscoverSectionKey, data: T): void {
  try {
    const payload: CachedSection<T> = { data, savedAt: Date.now() }
    sessionStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(payload))
  } catch {
    /* ignore quota */
  }
}

export function clearDiscoverSectionCache(key?: DiscoverSectionKey): void {
  try {
    if (key) {
      sessionStorage.removeItem(`${CACHE_PREFIX}${key}`)
      return
    }
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const k = sessionStorage.key(i)
      if (k?.startsWith(CACHE_PREFIX)) sessionStorage.removeItem(k)
    }
  } catch {
    /* ignore */
  }
}
