import type Database from 'better-sqlite3'
import {
  chromeTimeMicros,
  collectMaxIdFromFile,
  createEdgeUrlNode,
  findUrlNodeInBookmarkBar,
  getFolderNodeByExternalPath,
  readEdgeBookmarksFile,
  writeEdgeBookmarksFile,
  type EdgeBookmarkNode
} from './edgeBookmarks'
import { edgeLookupKeys } from './edgeBookmarkKeys'
import { EDGE_ROOT_FOLDER_ID } from './constants'

type EdgeBookmarkRow = {
  id: string
  folder_id: string
  title: string
  url: string
  external_id: string | null
  user_created: number
  deleted: number
  external_path: string | null
}

function listEdgeSubtreeBookmarks(db: Database.Database): EdgeBookmarkRow[] {
  return db
    .prepare(
      `
      WITH RECURSIVE edge_tree(id) AS (
        SELECT id FROM link_folders WHERE id = ?
        UNION ALL
        SELECT f.id FROM link_folders f
        INNER JOIN edge_tree t ON f.parent_id = t.id
      )
      SELECT b.id, b.folder_id, b.title, b.url, b.external_id, b.user_created, b.deleted,
             COALESCE(f.external_path, 'bookmark_bar') AS external_path
      FROM link_bookmarks b
      INNER JOIN edge_tree t ON b.folder_id = t.id
      LEFT JOIN link_folders f ON f.id = b.folder_id
      WHERE b.deleted = 0 OR (b.deleted = 1 AND b.external_id LIKE 'edge:%')
    `
    )
    .all(EDGE_ROOT_FOLDER_ID) as EdgeBookmarkRow[]
}

function resolveTargetFolder(
  bookmarkBar: EdgeBookmarkNode,
  externalPath: string
): EdgeBookmarkNode | null {
  if (externalPath === 'bookmark_bar') return bookmarkBar
  return getFolderNodeByExternalPath(bookmarkBar, externalPath)
}

function removeUrlFromEdge(
  bookmarkBar: EdgeBookmarkNode,
  externalId: string,
  fallbackUrl?: string
): boolean {
  const keys = edgeLookupKeys(externalId, fallbackUrl)
  const hit = findUrlNodeInBookmarkBar(bookmarkBar, keys)
  if (!hit) return false
  hit.parent.children!.splice(hit.index, 1)
  return true
}

/**
 * 将本地变更写回 Edge Bookmarks（须在 pull 之后调用，并与 pull 串行执行）。
 */
export function syncBookmarksToEdgeFile(db: Database.Database): {
  pushed: number
  updated: number
  removed: number
  failed: number
} {
  const file = readEdgeBookmarksFile()
  const bookmarkBar = file?.roots?.bookmark_bar
  if (!file || !bookmarkBar) {
    return { pushed: 0, updated: 0, removed: 0, failed: 0 }
  }

  let nextId = collectMaxIdFromFile(file) + 1
  let pushed = 0
  let updated = 0
  let removed = 0
  let failed = 0

  const rows = listEdgeSubtreeBookmarks(db)

  for (const row of rows) {
    if (row.deleted === 1 && row.external_id?.startsWith('edge:')) {
      if (removeUrlFromEdge(bookmarkBar, row.external_id, row.url)) {
        removed += 1
      }
      continue
    }

    if (row.external_id?.startsWith('edge:')) {
      const keys = edgeLookupKeys(row.external_id, row.url)
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

    const node = createEdgeUrlNode(nextId++, row.title, row.url)
    folder.children.push(node)
    pushed += 1
  }

  if (pushed + updated + removed === 0) {
    return { pushed, updated, removed, failed }
  }

  if (!writeEdgeBookmarksFile(file)) {
    return { pushed: 0, updated: 0, removed: 0, failed: rows.length }
  }

  return { pushed, updated, removed, failed }
}
