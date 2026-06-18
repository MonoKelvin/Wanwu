import { createRequire } from 'node:module'

/** 加载 npm 依赖 kugoumusicapi（GitHub tarball，见 package.json） */
export function loadKugouApiModule(): Record<string, unknown> | null {
  try {
    const require = createRequire(import.meta.url)
    return require('kugoumusicapi/main.js') as Record<string, unknown>
  } catch {
    return null
  }
}
