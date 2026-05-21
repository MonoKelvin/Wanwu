/** 按域名限制并发，避免百科限流同时允许多条目并行 */

const HOST_LIMITS = {
  baike: 5,
  wiki: 10,
  wikidata: 6,
  moegirl: 4,
  web: 3,
  default: 8
}

/**
 * @param {string} bucket
 */
export function createRateLimiter(bucket = 'default') {
  const limit = HOST_LIMITS[bucket] ?? HOST_LIMITS.default
  let active = 0
  /** @type {Array<() => void>} */
  const queue = []

  const pump = () => {
    while (active < limit && queue.length) {
      active++
      const next = queue.shift()
      next?.()
    }
  }

  /**
   * @template T
   * @param {() => Promise<T>} fn
   * @returns {Promise<T>}
   */
  return (fn) =>
    new Promise((resolve, reject) => {
      const run = () => {
        fn()
          .then(resolve, reject)
          .finally(() => {
            active--
            pump()
          })
      }
      queue.push(run)
      pump()
    })
}

const limiters = {
  baike: createRateLimiter('baike'),
  wiki: createRateLimiter('wiki'),
  wikidata: createRateLimiter('wikidata'),
  moegirl: createRateLimiter('moegirl'),
  web: createRateLimiter('web'),
  default: createRateLimiter('default')
}

/**
 * @template T
 * @param {'baike'|'wiki'|'wikidata'|'moegirl'|'web'|'default'} bucket
 * @param {() => Promise<T>} fn
 */
export function withRateLimit(bucket, fn) {
  return limiters[bucket](fn)
}
