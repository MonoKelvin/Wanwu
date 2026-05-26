import { existsSync, readFileSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'
import { parse as parsePlist } from 'plist'

export type SafariBookmarkNode = {
  name: string
  type: 'url' | 'folder'
  url?: string
  children?: SafariBookmarkNode[]
}

function resolveSafariBookmarksPlistPath(): string | null {
  if (process.platform !== 'darwin') return null

  const home = homedir()
  const candidates = [
    join(home, 'Library', 'Safari', 'Bookmarks.plist'),
    join(
      home,
      'Library',
      'Containers',
      'com.apple.Safari',
      'Data',
      'Library',
      'Safari',
      'Bookmarks.plist'
    )
  ]
  for (const p of candidates) {
    if (existsSync(p)) return p
  }
  return null
}

function titleFromLeaf(entry: Record<string, unknown>): string {
  const uri = entry.URIDictionary
  if (uri && typeof uri === 'object' && !Array.isArray(uri)) {
    const t = (uri as Record<string, unknown>).title
    if (typeof t === 'string' && t.trim()) return t.trim()
  }
  if (typeof entry.ReadingListTitle === 'string' && entry.ReadingListTitle.trim()) {
    return entry.ReadingListTitle.trim()
  }
  return ''
}

function parsePlistNode(raw: unknown): SafariBookmarkNode | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const entry = raw as Record<string, unknown>
  const type = entry.WebBookmarkType

  if (type === 'WebBookmarkTypeList') {
    const childrenRaw = entry.Children
    const children: SafariBookmarkNode[] = []
    if (Array.isArray(childrenRaw)) {
      for (const child of childrenRaw) {
        const node = parsePlistNode(child)
        if (node) children.push(node)
      }
    }
    const name =
      typeof entry.Title === 'string' && entry.Title.trim() ?
        entry.Title.trim()
      : '书签'
    return { name, type: 'folder', children }
  }

  if (type === 'WebBookmarkTypeLeaf') {
    const url = typeof entry.URLString === 'string' ? entry.URLString : ''
    if (!url) return null
    const title = titleFromLeaf(entry) || url
    return { name: title, type: 'url', url }
  }

  return null
}

/** 读取 Safari Bookmarks.plist 根树（默认配置） */
export function safariBookmarksRoot(): SafariBookmarkNode | null {
  const path = resolveSafariBookmarksPlistPath()
  if (!path) return null

  try {
    const buf = readFileSync(path)
    const doc = parsePlist(buf)
    if (!doc || typeof doc !== 'object' || Array.isArray(doc)) return null
    const children = (doc as Record<string, unknown>).Children
    if (!Array.isArray(children)) return null

    const nodes: SafariBookmarkNode[] = []
    for (const child of children) {
      const node = parsePlistNode(child)
      if (node) nodes.push(node)
    }

    return {
      name: 'Safari 书签',
      type: 'folder',
      children: nodes
    }
  } catch {
    return null
  }
}

export function getSafariBookmarksFilePath(): string | null {
  return resolveSafariBookmarksPlistPath()
}
