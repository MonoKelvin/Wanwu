import {
  MANIFEST_ENTRY_PATH,
  WANWU_DOCUMENT_PACKAGE_FORMAT,
  WANWU_DOCUMENT_PACKAGE_VERSION
} from './constants'
import type {
  PackageEntryManifest,
  PackageVerifyIssue,
  PackageVerifyResult,
  WanwuDocumentManifest
} from './types'

export function isWanwuDocumentManifest(raw: unknown): raw is WanwuDocumentManifest {
  if (!raw || typeof raw !== 'object') return false
  const m = raw as WanwuDocumentManifest
  return (
    m.format === WANWU_DOCUMENT_PACKAGE_FORMAT &&
    m.formatVersion === WANWU_DOCUMENT_PACKAGE_VERSION &&
    typeof m.docId === 'string' &&
    typeof m.title === 'string' &&
    Array.isArray(m.entries)
  )
}

export function normalizeEntryPath(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\/+/, '')
}

export function createEmptyManifest(input: {
  docType: WanwuDocumentManifest['docType']
  docId: string
  title: string
  createdAt?: string
}): WanwuDocumentManifest {
  const now = input.createdAt ?? new Date().toISOString()
  return {
    format: WANWU_DOCUMENT_PACKAGE_FORMAT,
    formatVersion: WANWU_DOCUMENT_PACKAGE_VERSION,
    docType: input.docType,
    docId: input.docId,
    title: input.title,
    createdAt: now,
    modifiedAt: now,
    encryption: { enabled: false, algorithm: 'none' },
    entries: []
  }
}

export function buildEntryManifest(input: {
  path: string
  mediaType: string
  size: number
  sha256: string
  encoding?: PackageEntryManifest['encoding']
  encrypted?: boolean
}): PackageEntryManifest {
  return {
    path: normalizeEntryPath(input.path),
    mediaType: input.mediaType,
    size: input.size,
    sha256: input.sha256,
    encoding: input.encoding,
    encrypted: input.encrypted
  }
}

export function upsertManifestEntry(
  manifest: WanwuDocumentManifest,
  entry: PackageEntryManifest
): WanwuDocumentManifest {
  const path = normalizeEntryPath(entry.path)
  const entries = manifest.entries.filter((e) => e.path !== path)
  entries.push({ ...entry, path })
  entries.sort((a, b) => a.path.localeCompare(b.path))
  return {
    ...manifest,
    modifiedAt: new Date().toISOString(),
    entries
  }
}

export function removeManifestEntry(manifest: WanwuDocumentManifest, path: string): WanwuDocumentManifest {
  const normalized = normalizeEntryPath(path)
  return {
    ...manifest,
    modifiedAt: new Date().toISOString(),
    entries: manifest.entries.filter((e) => e.path !== normalized)
  }
}

export function verifyManifestAgainstEntries(
  manifest: WanwuDocumentManifest,
  entries: ReadonlyMap<string, { size: number; sha256: string }>
): PackageVerifyResult {
  const issues: PackageVerifyIssue[] = []
  const seen = new Set<string>()

  for (const item of manifest.entries) {
    const path = normalizeEntryPath(item.path)
    if (path === MANIFEST_ENTRY_PATH) continue
    seen.add(path)
    const actual = entries.get(path)
    if (!actual) {
      issues.push({ path, code: 'missing', message: '清单中的条目在包内不存在' })
      continue
    }
    if (actual.size !== item.size) {
      issues.push({
        path,
        code: 'size_mismatch',
        message: `大小不一致：期望 ${item.size}，实际 ${actual.size}`
      })
    }
    if (actual.sha256 !== item.sha256) {
      issues.push({
        path,
        code: 'hash_mismatch',
        message: 'SHA-256 校验失败'
      })
    }
  }

  for (const path of entries.keys()) {
    if (path === MANIFEST_ENTRY_PATH || seen.has(path)) continue
    issues.push({ path, code: 'manifest_orphan', message: '包内存在未登记条目' })
  }

  return { ok: issues.length === 0, issues }
}

export function parseManifestJson(text: string): WanwuDocumentManifest {
  const raw = JSON.parse(text) as unknown
  if (!isWanwuDocumentManifest(raw)) {
    throw new Error('无效的 Wanwu 文档包 manifest')
  }
  return raw
}

export function serializeManifest(manifest: WanwuDocumentManifest): string {
  return `${JSON.stringify(manifest, null, 2)}\n`
}
