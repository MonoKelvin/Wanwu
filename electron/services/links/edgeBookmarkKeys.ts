/** Edge 书签 external_id 编解码（优先 guid，兼容旧版 path:guid） */

export function buildEdgeExternalId(node: { guid?: string; url: string }, legacyPath: string): string {
  if (node.guid?.trim()) return `edge:guid:${node.guid.trim()}`
  return `edge:legacy:${legacyPath}:${node.url}`
}

/** 用于在 Bookmarks 树中定位节点：guid，或旧版后缀 / URL */
export function edgeLookupKeys(externalId: string, fallbackUrl?: string): string[] {
  const keys = new Set<string>()
  if (!externalId.startsWith('edge:')) return keys.size ? [...keys] : fallbackUrl ? [fallbackUrl] : []

  const rest = externalId.slice(5)
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
  return [...keys]
}
