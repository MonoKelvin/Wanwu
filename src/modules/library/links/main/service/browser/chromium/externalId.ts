/** Chromium 书签 external_id：{sourceId}:guid:{guid} 或 legacy 路径格式 */

export function buildChromiumExternalId(
  sourceId: string,
  node: { guid?: string; url?: string },
  legacyPath: string
): string {
  if (node.guid?.trim()) return `${sourceId}:guid:${node.guid.trim()}`
  return `${sourceId}:legacy:${legacyPath}:${node.url ?? ''}`
}

export function chromiumLookupKeys(
  sourceId: string,
  externalId: string,
  fallbackUrl?: string
): string[] {
  const prefix = `${sourceId}:`
  const keys = new Set<string>()
  if (!externalId.startsWith(prefix)) {
    return fallbackUrl?.trim() ? [fallbackUrl.trim()] : []
  }

  const rest = externalId.slice(prefix.length)
  if (rest.startsWith('guid:')) {
    keys.add(rest.slice(5))
  } else if (rest.startsWith('legacy:')) {
    const legacy = rest.slice(7)
    const lastColon = legacy.lastIndexOf(':')
    if (lastColon >= 0) {
      keys.add(legacy.slice(lastColon + 1))
      keys.add(legacy)
    }
  } else {
    const lastColon = rest.lastIndexOf(':')
    if (lastColon >= 0) keys.add(rest.slice(lastColon + 1))
    keys.add(rest)
  }

  if (fallbackUrl?.trim()) keys.add(fallbackUrl.trim())
  return Array.from(keys)
}

export function parseChromiumExternalPath(sourceId: string, externalId: string): string | null {
  const prefix = `${sourceId}:`
  if (!externalId.startsWith(prefix)) return null
  const rest = externalId.slice(prefix.length)
  if (rest.startsWith('guid:')) return null
  if (rest.startsWith('legacy:')) {
    const legacy = rest.slice(7)
    const lastColon = legacy.lastIndexOf(':')
    if (lastColon <= 0) return null
    return legacy.slice(0, lastColon)
  }
  const lastColon = rest.lastIndexOf(':')
  if (lastColon <= 0) return null
  return rest.slice(0, lastColon)
}

export function legacyChromiumExternalId(
  sourceId: string,
  externalPath: string,
  node: { guid?: string; url?: string }
): string {
  const key = node.guid?.trim() || node.url || ''
  return `${sourceId}:${externalPath}:${key}`
}
