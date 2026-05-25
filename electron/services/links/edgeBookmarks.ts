import { createHash, randomUUID } from 'crypto'
import { edgeLookupKeys } from './edgeBookmarkKeys'
import { existsSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'fs'
import { join } from 'path'

export interface EdgeBookmarkNode {
  name: string
  type: 'url' | 'folder'
  url?: string
  children?: EdgeBookmarkNode[]
  guid?: string
  id?: string
  date_added?: string
  date_modified?: string
}

export interface EdgeBookmarksFile {
  checksum?: string
  version?: number
  roots?: {
    bookmark_bar?: EdgeBookmarkNode
    other?: EdgeBookmarkNode
    synced?: EdgeBookmarkNode
  }
}

const ROOT_KEYS = ['bookmark_bar', 'other', 'synced'] as const

export function getEdgeBookmarksFilePath(): string | null {
  const local = process.env.LOCALAPPDATA
  if (!local) return null
  const path = join(local, 'Microsoft', 'Edge', 'User Data', 'Default', 'Bookmarks')
  return existsSync(path) ? path : null
}

export function readEdgeBookmarksFile(): EdgeBookmarksFile | null {
  const path = getEdgeBookmarksFilePath()
  if (!path) return null
  try {
    const raw = readFileSync(path, 'utf8')
    return JSON.parse(raw) as EdgeBookmarksFile
  } catch {
    return null
  }
}

export function edgeBookmarkBarRoot(): EdgeBookmarkNode | null {
  const file = readEdgeBookmarksFile()
  return file?.roots?.bookmark_bar ?? null
}

export function chromeTimeMicros(): string {
  const epoch = Date.UTC(1601, 0, 1)
  const micros = (BigInt(Date.now()) - BigInt(epoch)) * 1000n
  return micros.toString()
}

function digestNode(md5: ReturnType<typeof createHash>, node: EdgeBookmarkNode): void {
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

export function computeBookmarksChecksum(file: EdgeBookmarksFile): string {
  const md5 = createHash('md5')
  for (const key of ROOT_KEYS) {
    const root = file.roots?.[key]
    if (root) digestNode(md5, root)
  }
  return md5.digest('hex')
}

function collectMaxNumericId(node: EdgeBookmarkNode): number {
  let max = Number.parseInt(node.id ?? '0', 10) || 0
  for (const child of node.children ?? []) {
    max = Math.max(max, collectMaxNumericId(child))
  }
  return max
}

export function collectMaxIdFromFile(file: EdgeBookmarksFile): number {
  let max = 0
  for (const key of ROOT_KEYS) {
    const root = file.roots?.[key]
    if (root) max = Math.max(max, collectMaxNumericId(root))
  }
  return max
}

/** 按 sync 时记录的 external_path 定位文件夹节点（如 bookmark_bar/0） */
export function getFolderNodeByExternalPath(
  bookmarkBar: EdgeBookmarkNode,
  externalPath: string
): EdgeBookmarkNode | null {
  const parts = externalPath.split('/').filter(Boolean)
  if (!parts.length || parts[0] !== 'bookmark_bar') return null

  let node: EdgeBookmarkNode = bookmarkBar
  for (let i = 1; i < parts.length; i++) {
    const idx = Number.parseInt(parts[i]!, 10)
    if (!Number.isFinite(idx) || !node.children?.[idx]) return null
    node = node.children[idx]!
    if (node.type !== 'folder') return null
  }
  return node.type === 'folder' ? node : null
}

export type EdgeUrlNodeHit = {
  parent: EdgeBookmarkNode
  index: number
  node: EdgeBookmarkNode
}

function urlNodeMatches(node: EdgeBookmarkNode, keys: string[]): boolean {
  if (node.type !== 'url') return false
  for (const key of keys) {
    if (!key) continue
    if (node.guid === key || node.url === key || node.id === key) return true
  }
  return false
}

/** 在整棵收藏夹栏树中按 guid / URL 查找（不依赖同步时的路径索引） */
export function findUrlNodeInBookmarkBar(
  bookmarkBar: EdgeBookmarkNode,
  lookupKeys: string[]
): EdgeUrlNodeHit | null {
  if (!lookupKeys.length) return null

  function scan(parent: EdgeBookmarkNode, children: EdgeBookmarkNode[]): EdgeUrlNodeHit | null {
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

/** @deprecated 优先 findUrlNodeInBookmarkBar */
export function findUrlNodeByExternalId(
  bookmarkBar: EdgeBookmarkNode,
  externalPath: string,
  externalId: string
): EdgeUrlNodeHit | null {
  const folder =
    externalPath === 'bookmark_bar' ?
      bookmarkBar
    : getFolderNodeByExternalPath(bookmarkBar, externalPath)
  if (!folder?.children?.length) return null

  const keys = edgeLookupKeys(externalId)
  const index = folder.children.findIndex((c) => urlNodeMatches(c, keys))
  if (index < 0) return null
  return { parent: folder, index, node: folder.children[index]! }
}

export function writeEdgeBookmarksFile(file: EdgeBookmarksFile): boolean {
  const path = getEdgeBookmarksFilePath()
  if (!path) return false

  const next: EdgeBookmarksFile = {
    ...file,
    version: file.version ?? 1,
    checksum: computeBookmarksChecksum(file)
  }

  const tmp = `${path}.wanwu-tmp`
  try {
    writeFileSync(tmp, JSON.stringify(next), 'utf8')
    renameSync(tmp, path)
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

export function createEdgeUrlNode(nextId: number, title: string, url: string): EdgeBookmarkNode {
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
