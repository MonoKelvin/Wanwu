import { createHash, randomUUID } from 'crypto'
import { existsSync, readdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'fs'
import { join } from 'path'

export interface ChromiumBookmarkNode {
  name: string
  type: 'url' | 'folder'
  url?: string
  children?: ChromiumBookmarkNode[]
  guid?: string
  id?: string
  date_added?: string
  date_modified?: string
}

export interface ChromiumBookmarksFile {
  checksum?: string
  version?: number
  roots?: {
    bookmark_bar?: ChromiumBookmarkNode
    other?: ChromiumBookmarkNode
    synced?: ChromiumBookmarkNode
  }
}

const ROOT_KEYS = ['bookmark_bar', 'other', 'synced'] as const

const SKIP_PROFILE_DIRS = new Set(['System Profile', 'Guest Profile', 'Crashpad', 'GrShaderCache'])

function profileSortKey(name: string): number {
  if (name === 'Default') return 0
  const m = /^Profile (\d+)$/.exec(name)
  if (m) return 1 + Number.parseInt(m[1]!, 10)
  return 10_000
}

/** 枚举 User Data 下含 Bookmarks 的配置目录（Default 优先） */
function listChromiumProfileBookmarkPaths(userDataDir: string): string[] {
  let names: string[] = []
  try {
    names = readdirSync(userDataDir, { withFileTypes: true })
      .filter((e) => e.isDirectory() && !SKIP_PROFILE_DIRS.has(e.name) && !e.name.startsWith('.'))
      .map((e) => e.name)
  } catch {
    return []
  }

  names.sort((a, b) => profileSortKey(a) - profileSortKey(b) || a.localeCompare(b))

  const paths: string[] = []
  for (const name of names) {
    const bookmarks = join(userDataDir, name, 'Bookmarks')
    if (existsSync(bookmarks)) paths.push(bookmarks)
  }
  return paths
}

export function resolveChromiumBookmarksPath(
  vendorDir: string,
  preferredProfile = 'Default'
): string | null {
  const local = process.env.LOCALAPPDATA
  if (!local) return null

  const userDataDir = join(local, vendorDir, 'User Data')
  if (preferredProfile) {
    const preferred = join(userDataDir, preferredProfile, 'Bookmarks')
    if (existsSync(preferred)) return preferred
  }

  const found = listChromiumProfileBookmarkPaths(userDataDir)
  return found[0] ?? null
}

export function readChromiumBookmarksFile(filePath: string | null): ChromiumBookmarksFile | null {
  if (!filePath) return null
  try {
    const raw = readFileSync(filePath, 'utf8')
    return JSON.parse(raw) as ChromiumBookmarksFile
  } catch {
    return null
  }
}

export function chromiumBookmarkBarRoot(filePath: string | null): ChromiumBookmarkNode | null {
  const file = readChromiumBookmarksFile(filePath)
  return file?.roots?.bookmark_bar ?? null
}

export function chromeTimeMicros(): string {
  const epoch = Date.UTC(1601, 0, 1)
  const micros = (BigInt(Date.now()) - BigInt(epoch)) * BigInt(1000)
  return micros.toString()
}

function digestNode(md5: ReturnType<typeof createHash>, node: ChromiumBookmarkNode): void {
  const id = node.id ?? ''
  md5.update(id)
  md5.update(Buffer.from(node.name, 'utf16le'))
  if (node.type === 'url') {
    md5.update('url')
    md5.update(node.url ?? '')
  } else {
    md5.update('folder')
    for (const child of node.children ?? []) {
      digestNode(md5, child)
    }
  }
}

export function computeBookmarksChecksum(file: ChromiumBookmarksFile): string {
  const md5 = createHash('md5')
  for (const key of ROOT_KEYS) {
    const root = file.roots?.[key]
    if (root) digestNode(md5, root)
  }
  return md5.digest('hex')
}

function collectMaxNumericId(node: ChromiumBookmarkNode): number {
  let max = Number.parseInt(node.id ?? '0', 10) || 0
  for (const child of node.children ?? []) {
    max = Math.max(max, collectMaxNumericId(child))
  }
  return max
}

export function collectMaxIdFromFile(file: ChromiumBookmarksFile): number {
  let max = 0
  for (const key of ROOT_KEYS) {
    const root = file.roots?.[key]
    if (root) max = Math.max(max, collectMaxNumericId(root))
  }
  return max
}

export function getFolderNodeByExternalPath(
  bookmarkBar: ChromiumBookmarkNode,
  externalPath: string
): ChromiumBookmarkNode | null {
  const parts = externalPath.split('/').filter(Boolean)
  if (!parts.length || parts[0] !== 'bookmark_bar') return null

  let node: ChromiumBookmarkNode = bookmarkBar
  for (let i = 1; i < parts.length; i++) {
    const idx = Number.parseInt(parts[i]!, 10)
    if (!Number.isFinite(idx) || !node.children?.[idx]) return null
    node = node.children[idx]!
    if (node.type !== 'folder') return null
  }
  return node.type === 'folder' ? node : null
}

export type ChromiumUrlNodeHit = {
  parent: ChromiumBookmarkNode
  index: number
  node: ChromiumBookmarkNode
}

function urlNodeMatches(node: ChromiumBookmarkNode, keys: string[]): boolean {
  if (node.type !== 'url') return false
  for (const key of keys) {
    if (!key) continue
    if (node.guid === key || node.url === key || node.id === key) return true
  }
  return false
}

export function findUrlNodeInBookmarkBar(
  bookmarkBar: ChromiumBookmarkNode,
  lookupKeys: string[]
): ChromiumUrlNodeHit | null {
  if (!lookupKeys.length) return null

  function scan(parent: ChromiumBookmarkNode, children: ChromiumBookmarkNode[]): ChromiumUrlNodeHit | null {
    for (let i = 0; i < children.length; i++) {
      const child = children[i]!
      if (child.type === 'url') {
        if (urlNodeMatches(child, lookupKeys)) {
          return { parent, index: i, node: child }
        }
      } else if (child.type === 'folder' && child.children?.length) {
        const hit = scan(child, child.children)
        if (hit) return hit
      }
    }
    return null
  }

  return scan(bookmarkBar, bookmarkBar.children ?? [])
}

export function writeChromiumBookmarksFile(
  filePath: string | null,
  file: ChromiumBookmarksFile
): boolean {
  if (!filePath) return false

  const next: ChromiumBookmarksFile = {
    ...file,
    version: file.version ?? 1,
    checksum: computeBookmarksChecksum(file)
  }

  const tmp = `${filePath}.wanwu-tmp`
  try {
    writeFileSync(tmp, JSON.stringify(next), 'utf8')
    renameSync(tmp, filePath)
    return true
  } catch {
    try {
      if (existsSync(tmp)) unlinkSync(tmp)
    } catch {
      /* ignore */
    }
    return false
  }
}

export function createChromiumUrlNode(
  nextId: number,
  title: string,
  url: string
): ChromiumBookmarkNode {
  const guid = randomUUID()
  const now = chromeTimeMicros()
  return {
    date_added: now,
    guid,
    id: String(nextId),
    name: title,
    type: 'url',
    url
  }
}
