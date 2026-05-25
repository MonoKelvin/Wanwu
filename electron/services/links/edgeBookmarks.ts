import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

export interface EdgeBookmarkNode {
  name: string
  type: 'url' | 'folder'
  url?: string
  children?: EdgeBookmarkNode[]
  /** Chromium 稳定 guid，可能缺失 */
  guid?: string
  date_added?: string
}

export interface EdgeBookmarksFile {
  roots?: {
    bookmark_bar?: EdgeBookmarkNode
    other?: EdgeBookmarkNode
    synced?: EdgeBookmarkNode
  }
}

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
