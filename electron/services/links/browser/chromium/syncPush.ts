import type Database from 'better-sqlite3'
import type { BrowserBookmarkProvider } from '../types'
import { chromiumLookupKeys } from './externalId'
import {
  chromeTimeMicros,
  readChromiumBookmarksFile,
  writeChromiumBookmarksFile,
  collectMaxIdFromFile,
  createChromiumUrlNode,
  findUrlNodeInBookmarkBar,
  getFolderNodeByExternalPath,
  type ChromiumBookmarkNode
} from './bookmarksFile'

function removeUrlFromBookmarkBar(
  bookmarkBar: ChromiumBookmarkNode,
  sourceId: string,
  externalId: string,
  fallbackUrl?: string
): boolean {
  const keys = chromiumLookupKeys(sourceId, externalId, fallbackUrl)
  const hit = findUrlNodeInBookmarkBar(bookmarkBar, keys)
  if (!hit) return false
  hit.parent.children!.splice(hit.index, 1)
  return true
}

type BrowserBookmarkRow = {
  id: string
  folder_id: string
  title: string
  url: string
  external_id: string | null
  user_created: number
  deleted: number
  external_path: string | null
}

function listSubtreeBookmarks(
  db: Database.Database,
  provider: BrowserBookmarkProvider
): BrowserBookmarkRow[] {
  return db
    .prepare(
      `
      WITH RECURSIVE browser_tree(id) AS (
        SELECT id FROM link_folders WHERE id = ?
        UNION ALL
        SELECT f.id FROM link_folders f
        INNER JOIN browser_tree t ON f.parent_id = t.id
      )
      SELECT b.id, b.folder_id, b.title, b.url, b.external_id, b.user_created, b.deleted,
             COALESCE(f.external_path, 'bookmark_bar') AS external_path
      FROM link_bookmarks b
      INNER JOIN browser_tree t ON b.folder_id = t.id
      LEFT JOIN link_folders f ON f.id = b.folder_id
      WHERE b.source = ? AND (b.deleted = 0 OR (b.deleted = 1 AND b.external_id LIKE ?))
    `
    )
    .all(provider.rootFolderId, provider.id, `${provider.id}:%`) as BrowserBookmarkRow[]
}

function resolveTargetFolder(
  bookmarkBar: ChromiumBookmarkNode,
  externalPath: string
): ChromiumBookmarkNode | null {
  if (externalPath === 'bookmark_bar') return bookmarkBar
  return getFolderNodeByExternalPath(bookmarkBar, externalPath)
}

export function syncChromiumBookmarksToFile(
  db: Database.Database,
  provider: BrowserBookmarkProvider
): {
  pushed: number
  updated: number
  removed: number
  failed: number
} {
  const filePath = provider.resolveBookmarksPath()
  const file = readChromiumBookmarksFile(filePath)
  const bookmarkBar = file?.roots?.bookmark_bar
  if (!file || !bookmarkBar) {
    return { pushed: 0, updated: 0, removed: 0, failed: 0 }
  }

  const sourceId = provider.id
  const externalPrefix = `${sourceId}:`

  let nextId = collectMaxIdFromFile(file) + 1
  let pushed = 0
  let updated = 0
  let removed = 0
  let failed = 0

  const rows = listSubtreeBookmarks(db, provider)

  for (const row of rows) {
    if (row.deleted === 1 && row.external_id?.startsWith(externalPrefix)) {
      if (removeUrlFromBookmarkBar(bookmarkBar, sourceId, row.external_id, row.url)) {
        removed += 1
      }
      continue
    }

    if (row.external_id?.startsWith(externalPrefix)) {
      const keys = chromiumLookupKeys(sourceId, row.external_id, row.url)
      const hit = findUrlNodeInBookmarkBar(bookmarkBar, keys)
      if (!hit) {
        failed += 1
        continue
      }
      let changed = false
      if (hit.node.name !== row.title) {
        hit.node.name = row.title
        changed = true
      }
      if (hit.node.url !== row.url) {
        hit.node.url = row.url
        changed = true
      }
      if (changed) {
        hit.node.date_modified = chromeTimeMicros()
        updated += 1
      }
      continue
    }

    if (row.user_created !== 1) continue

    const folderPath = row.external_path ?? 'bookmark_bar'
    const folder = resolveTargetFolder(bookmarkBar, folderPath)
    if (!folder) {
      failed += 1
      continue
    }
    if (!folder.children) folder.children = []

    const node = createChromiumUrlNode(nextId++, row.title, row.url)
    folder.children.push(node)
    pushed += 1
  }

  if (pushed + updated + removed === 0) {
    return { pushed, updated, removed, failed }
  }

  if (!writeChromiumBookmarksFile(filePath, file)) {
    return { pushed: 0, updated: 0, removed: 0, failed: rows.length }
  }

  return { pushed, updated, removed, failed }
}
