import type Database from 'better-sqlite3'
import { randomUUID } from 'crypto'
import type { LinksSyncResult } from '../../../../../src/shared/types/links'
import { LINKS_RECYCLE_BIN_ID } from '../../constants'
import type { BrowserBookmarkProvider } from '../types'
import {
  buildChromiumExternalId,
  chromiumLookupKeys,
  legacyChromiumExternalId
} from './externalId'
import { chromiumBookmarkBarRoot, type ChromiumBookmarkNode } from './bookmarksFile'

type BookmarkRow = { id: string; deleted: number; user_created: number }

function markSeenFromUrlNode(
  sourceId: string,
  node: ChromiumBookmarkNode & { url: string },
  externalPath: string,
  seenExternalIds: Set<string>,
  seenBrowserKeys: Set<string>
): void {
  const externalId = buildChromiumExternalId(sourceId, node, externalPath)
  seenExternalIds.add(externalId)
  seenExternalIds.add(legacyChromiumExternalId(sourceId, externalPath, node))
  if (node.guid?.trim()) seenBrowserKeys.add(node.guid.trim())
  if (node.url) seenBrowserKeys.add(node.url)
}

function pruneBookmarksMissingFromBrowser(
  db: Database.Database,
  provider: BrowserBookmarkProvider,
  seenExternalIds: Set<string>,
  seenBrowserKeys: Set<string>
): number {
  const likePrefix = `${provider.id}:%`
  const rows = db
    .prepare(
      `SELECT id, external_id, folder_id, url FROM link_bookmarks
       WHERE source = ? AND external_id LIKE ? AND deleted = 0`
    )
    .all(provider.id, likePrefix) as Array<{
    id: string
    external_id: string
    folder_id: string
    url: string
  }>

  const moveToRecycle = db.prepare(
    `UPDATE link_bookmarks
     SET deleted = 1, prev_folder_id = ?, folder_id = ?
     WHERE id = ?`
  )

  let removed = 0
  for (const row of rows) {
    if (seenExternalIds.has(row.external_id)) continue
    const keys = chromiumLookupKeys(provider.id, row.external_id, row.url)
    if (keys.some((k) => seenBrowserKeys.has(k))) continue
    moveToRecycle.run(row.folder_id, LINKS_RECYCLE_BIN_ID, row.id)
    removed += 1
  }
  return removed
}

export function syncChromiumBookmarksIntoDb(
  db: Database.Database,
  provider: BrowserBookmarkProvider
): LinksSyncResult {
  const filePath = provider.resolveBookmarksPath()
  const root = chromiumBookmarkBarRoot(filePath)
  if (!root) {
    throw new Error(
      `未找到 ${provider.displayName} 收藏夹文件，请确认已安装该浏览器并使用过收藏夹`
    )
  }

  const sourceId = provider.id
  const externalLike = `${sourceId}:%`
  const folderIdPrefix = `${sourceId}-folder:`

  let added = 0
  let updated = 0
  let skippedDeleted = 0
  const seenExternalIds = new Set<string>()
  const seenBrowserKeys = new Set<string>()

  const upsertFolder = db.prepare(`
    INSERT INTO link_folders (id, parent_id, name, sort_order, source, external_path, is_recycle_bin)
    VALUES (?, ?, ?, ?, ?, ?, 0)
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
    WHERE source = ? AND external_id LIKE ?
      AND (external_id = ? OR external_id GLOB '*:' || ?)
    LIMIT 1
  `)
  const findBookmarkByUrlInFolder = db.prepare(`
    SELECT id, deleted, user_created FROM link_bookmarks
    WHERE source = ? AND folder_id = ? AND url = ? AND deleted = 0
    LIMIT 1
  `)

  const insertBookmark = db.prepare(`
    INSERT INTO link_bookmarks (id, folder_id, title, url, sort_order, deleted, source, external_id, user_created)
    VALUES (?, ?, ?, ?, ?, 0, ?, ?, 0)
  `)
  const linkPushedLocalBookmark = db.prepare(`
    UPDATE link_bookmarks
    SET title = ?, url = ?, sort_order = ?, folder_id = ?, external_id = ?, source = ?, user_created = 0
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
    node: ChromiumBookmarkNode,
    parentId: string
  ): BookmarkRow | undefined => {
    let row = findBookmarkByExternal.get(externalId) as BookmarkRow | undefined
    if (row) return row
    const guid = node.guid?.trim()
    if (guid) {
      row = findBookmarkByGuid.get(
        sourceId,
        externalLike,
        `${sourceId}:guid:${guid}`,
        guid
      ) as BookmarkRow | undefined
      if (row) return row
    }
    if (node.url) {
      row = findBookmarkByUrlInFolder.get(sourceId, parentId, node.url) as BookmarkRow | undefined
    }
    return row
  }

  const walk = (node: ChromiumBookmarkNode, parentId: string, path: string, index: number) => {
    const externalPath = path || 'bookmark_bar'
    const folderId = `${folderIdPrefix}${externalPath}`

    if (node.type === 'folder') {
      upsertFolder.run(folderId, parentId, node.name, index, sourceId, externalPath)
      const children = node.children ?? []
      children.forEach((child, i) => walk(child, folderId, `${externalPath}/${i}`, i))
      return
    }

    if (node.type === 'url' && node.url) {
      const urlNode = node as ChromiumBookmarkNode & { url: string }
      const externalId = buildChromiumExternalId(sourceId, urlNode, externalPath)
      markSeenFromUrlNode(sourceId, urlNode, externalPath, seenExternalIds, seenBrowserKeys)

      const existing = resolveExisting(externalId, node, parentId)

      if (existing?.deleted) {
        skippedDeleted += 1
        return
      }

      if (existing?.user_created && !existing.deleted) {
        markSeenFromUrlNode(sourceId, urlNode, externalPath, seenExternalIds, seenBrowserKeys)
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
            sourceId,
            local.id
          )
          updated += 1
        } else {
          insertBookmark.run(
            randomUUID(),
            parentId,
            node.name,
            node.url,
            index,
            sourceId,
            externalId
          )
          added += 1
        }
      }
    }
  }

  const children = root.children ?? []
  children.forEach((child, i) => walk(child, provider.rootFolderId, `bookmark_bar/${i}`, i))

  const removed = pruneBookmarksMissingFromBrowser(
    db,
    provider,
    seenExternalIds,
    seenBrowserKeys
  )

  return { added, updated, skippedDeleted, removed, pushedToBrowser: 0 }
}
