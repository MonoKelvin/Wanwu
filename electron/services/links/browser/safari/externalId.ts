import type { SafariBookmarkNode } from './plistBookmarks'

export function buildSafariExternalId(node: SafariBookmarkNode, legacyPath: string): string {
  if (node.type === 'url' && node.url) {
    return `safari:legacy:${legacyPath}:${node.url}`
  }
  return `safari:folder:${legacyPath}`
}

export function safariLookupKeys(externalId: string, fallbackUrl?: string): string[] {
  const keys = new Set<string>()
  if (!externalId.startsWith('safari:')) {
    return fallbackUrl?.trim() ? [fallbackUrl.trim()] : []
  }
  const rest = externalId.slice(7)
  if (rest.startsWith('legacy:')) {
    const legacy = rest.slice(7)
    const lastColon = legacy.lastIndexOf(':')
    if (lastColon >= 0) keys.add(legacy.slice(lastColon + 1))
  }
  if (fallbackUrl?.trim()) keys.add(fallbackUrl.trim())
  return Array.from(keys)
}

export function parseSafariExternalPath(externalId: string): string | null {
  if (!externalId.startsWith('safari:')) return null
  const rest = externalId.slice(7)
  if (rest.startsWith('legacy:')) {
    const legacy = rest.slice(7)
    const lastColon = legacy.lastIndexOf(':')
    if (lastColon <= 0) return null
    return legacy.slice(0, lastColon)
  }
  return null
}
