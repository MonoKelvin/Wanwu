/** 单次 enrich 运行内的请求去重缓存 */

/**
 * @returns {{ get: <T>(key: string, factory: () => Promise<T>) => Promise<T>, clear: () => void }}
 */
export function createFetchCache() {
  /** @type {Map<string, Promise<unknown>>} */
  const map = new Map()
  return {
    get(key, factory) {
      if (!map.has(key)) map.set(key, factory())
      return /** @type {Promise<T>} */ (map.get(key))
    },
    clear() {
      map.clear()
    }
  }
}
