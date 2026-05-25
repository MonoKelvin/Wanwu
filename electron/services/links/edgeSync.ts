import type Database from 'better-sqlite3'
import { randomUUID } from 'crypto'
import type { LinksSyncResult } from '../../../src/shared/types/links'
import { edgeBookmarkBarRoot, type EdgeBookmarkNode } from './edgeBookmarks'
import { buildEdgeExternalId, edgeLookupKeys } from './edgeBookmarkKeys'
import { EDGE_ROOT_FOLDER_ID, LINKS_RECYCLE_BIN_ID } from './constants'

type BookmarkRow = { id: string; deleted: number; user_created: number }

/** 从 Edge external_id 解析收藏夹 external_path（仅 legacy / 旧 path 格式） */
export function parseEdgeExternalPath(externalId: string): string | null {
  if (!externalId.startsWith('edge:')) return null
  const rest = externalId.slice(5)
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

function legacyEdgeExternalId(externalPath: string, node: EdgeBookmarkNode): string {
  const key = node.guid?.trim() || node.url || ''
  return `edge:${externalPath}:${key}`
}

function markSeenFromUrlNode(
  node: EdgeBookmarkNode,
  externalPath: string,
  seenExternalIds: Set<string>,
  seenBrowserKeys: Set<string>
): void {
  const externalId = buildEdgeExternalId(node, externalPath)
  seenExternalIds.add(externalId)
  seenExternalIds.add(legacyEdgeExternalId(externalPath, node))
  if (node.guid?.trim()) seenBrowserKeys.add(node.guid.trim())
  if (node.url) seenBrowserKeys.add(node.url)
}

function pruneEdgeBookmarksMissingFromBrowser(
  db: Database.Database,
  seenExternalIds: Set<string>,
  seenBrowserKeys: Set<string>
): number {
  const rows = db
    .prepare(
      `SELECT id, external_id, folder_id, url FROM link_bookmarks
       WHERE external_id LIKE 'edge:%' AND deleted = 0`
    )
    .all() as Array<{ id: string; external_id: string; folder_id: string; url: string }>

  const moveToRecycle = db.prepare(
    `UPDATE link_bookmarks
     SET deleted = 1, prev_folder_id = ?, folder_id = ?
     WHERE id = ?`
  )

  let removed = 0
  for (const row of rows) {
    if (seenExternalIds.has(row.external_id)) continue
    const keys = edgeLookupKeys(row.external_id, row.url)
    if (keys.some((k) => seenBrowserKeys.has(k))) continue
    moveToRecycle.run(row.folder_id, LINKS_RECYCLE_BIN_ID, row.id)
    removed += 1
  }
  return removed
}

export function syncEdgeBookmarksIntoDb(db: Database.Database): LinksSyncResult {
  const root = edgeBookmarkBarRoot()
  if (!root) {
    throw new Error(
      '未找到 Microsoft Edge 收藏夹文件，请确认 Edge 已安装且已使用过收藏夹功能'
    )
  }

  let added = 0
  let updated = 0
  let skippedDeleted = 0
  const seenExternalIds = new Set<string>()
  const seenBrowserKeys = new Set<string>()

  const upsertFolder = db.prepare(`
    INSERT INTO link_folders (id, parent_id, name, sort_order, source, external_path, is_recycle_bin)
    VALUES (?, ?, ?, ?, 'edge', ?, 0)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      sort_order = excluded.sort_order,
      parent_id = excluded.parent_id
  `)

  const findBookmarkByExternal = db.prepare(
    `SELECT id, deleted, user_created FROM link_bookmarks WHERE external_id = ?`
  )
  const findBookmarkByGuid = db.prepare(`
    SELECT id, deleted, user_created FROM link_bookmarks
    WHERE external_id LIKE 'edge:%'
      AND (external_id = ? OR external_id GLOB '*:' || ?)
    LIMIT 1
  `)
  const findBookmarkByUrlInFolder = db.prepare(`
    SELECT id, deleted, user_created FROM link_bookmarks
    WHERE external_id LIKE 'edge:%' AND folder_id = ? AND url = ? AND deleted = 0
    LIMIT 1
  `)

  const insertBookmark = db.prepare(`
    INSERT INTO link_bookmarks (id, folder_id, title, url, sort_order, deleted, source, external_id, user_created)
    VALUES (?, ?, ?, ?, ?, 0, 'edge', ?, 0)
  `)
  const linkPushedLocalBookmark = db.prepare(`
    UPDATE link_bookmarks
    SET title = ?, url = ?, sort_order = ?, folder_id = ?, external_id = ?, source = 'edge', user_created = 0
    WHERE id = ?
  `)
  const findLocalPushedBookmark = db.prepare(`
    SELECT id FROM link_bookmarks
    WHERE folder_id = ? AND url = ? AND user_created = 1 AND external_id IS NULL AND deleted = 0
    LIMIT 1
  `)
  const updateBookmark = db.prepare(`
    UPDATE link_bookmarks SET title = ?, url = ?, sort_order = ?, folder_id = ?, external_id = ?
    WHERE id = ?
  `)

  const resolveExisting = (
    externalId: string,
    node: EdgeBookmarkNode,
    parentId: string
  ): BookmarkRow | undefined => {
    let row = findBookmarkByExternal.get(externalId) as BookmarkRow | undefined
    if (row) return row
    const guid = node.guid?.trim()
    if (guid) {
      row = findBookmarkByGuid.get(`edge:guid:${guid}`, guid) as BookmarkRow | undefined
      if (row) return row
    }
    if (node.url) {
      row = findBookmarkByUrlInFolder.get(parentId, node.url) as BookmarkRow | undefined
    }
    return row
  }

  const walk = (node: EdgeBookmarkNode, parentId: string, path: string, index: number) => {
    const externalPath = path || 'bookmark_bar'
    const folderId = `edge-folder:${externalPath}`

    if (node.type === 'folder') {
      upsertFolder.run(folderId, parentId, node.name, index, externalPath)
      const children = node.children ?? []
      children.forEach((child, i) => walk(child, folderId, `${externalPath}/${i}`, i))
      return
    }

    if (node.type === 'url' && node.url) {
      const externalId = buildEdgeExternalId(node, externalPath)
      markSeenFromUrlNode(node, externalPath, seenExternalIds, seenBrowserKeys)

      const existing = resolveExisting(externalId, node, parentId)

      if (existing?.deleted) {
        skippedDeleted += 1
        return
      }

      if (existing?.user_created && !existing.deleted) {
        markSeenFromUrlNode(node, externalPath, seenExternalIds, seenBrowserKeys)
        skippedDeleted += 1
        return
      }

      if (existing) {
        updateBookmark.run(node.name, node.url, index, parentId, externalId, existing.id)
        updated += 1
      } else {
        const local = findLocalPushedBookmark.get(parentId, node.url) as { id: string } | undefined
        if (local) {
          linkPushedLocalBookmark.run(
            node.name,
            node.url,
            index,
            parentId,
            externalId,
            local.id
          )
          updated += 1
        } else {
          insertBookmark.run(randomUUID(), parentId, node.name, node.url, index, externalId)
          added += 1
        }
      }
    }
  }

  const children = root.children ?? []
  children.forEach((child, i) => walk(child, EDGE_ROOT_FOLDER_ID, `bookmark_bar/${i}`, i))

  const removed = pruneEdgeBookmarksMissingFromBrowser(db, seenExternalIds, seenBrowserKeys)

  return { added, updated, skippedDeleted, removed, pushedToBrowser: 0 }
}
