import type { FirefoxBookmarkNode } from './placesTree'

export function buildFirefoxExternalId(node: FirefoxBookmarkNode, legacyPath: string): string {
  if (node.guid?.trim()) return `firefox:guid:${node.guid.trim()}`
  if (node.url) return `firefox:legacy:${legacyPath}:${node.url}`
  return `firefox:bookmark:${node.bookmarkId}`
}

export function firefoxLookupKeys(externalId: string, fallbackUrl?: string): string[] {
  const keys = new Set<string>()
  if (!externalId.startsWith('firefox:')) {
    return fallbackUrl?.trim() ? [fallbackUrl.trim()] : []
  }

  const rest = externalId.slice(8)
  if (rest.startsWith('guid:')) {
    keys.add(rest.slice(5))
  } else if (rest.startsWith('legacy:')) {
    const legacy = rest.slice(7)
    const lastColon = legacy.lastIndexOf(':')
    if (lastColon >= 0) keys.add(legacy.slice(lastColon + 1))
  } else if (rest.startsWith('bookmark:')) {
    keys.add(rest.slice(9))
  }

  if (fallbackUrl?.trim()) keys.add(fallbackUrl.trim())
  return Array.from(keys)
}

export function parseFirefoxExternalPath(externalId: string): string | null {
  if (!externalId.startsWith('firefox:')) return null
  const rest = externalId.slice(8)
  if (rest.startsWith('guid:') || rest.startsWith('bookmark:')) return null
  if (rest.startsWith('legacy:')) {
    const legacy = rest.slice(7)
    const lastColon = legacy.lastIndexOf(':')
    if (lastColon <= 0) return null
    return legacy.slice(0, lastColon)
  }
  return null
}
