import type Database from 'better-sqlite3'
import { randomUUID } from 'crypto'
import type { LinksSyncResult } from '../../../../../src/shared/types/links'
import { LINKS_RECYCLE_BIN_ID } from '../../constants'
import type { BrowserBookmarkProvider } from '../types'
import { buildSafariExternalId, safariLookupKeys } from './externalId'
import { safariBookmarksRoot, type SafariBookmarkNode } from './plistBookmarks'

type BookmarkRow = { id: string; deleted: number; user_created: number }

function markSeen(
  node: SafariBookmarkNode,
  externalPath: string,
  seenExternalIds: Set<string>,
  seenBrowserKeys: Set<string>
): void {
  const externalId = buildSafariExternalId(node, externalPath)
  seenExternalIds.add(externalId)
  if (node.url) seenBrowserKeys.add(node.url)
}

function pruneMissing(
  db: Database.Database,
  provider: BrowserBookmarkProvider,
  seenExternalIds: Set<string>,
  seenBrowserKeys: Set<string>
): number {
  const rows = db
    .prepare(
      `SELECT id, external_id, folder_id, url FROM link_bookmarks
       WHERE source = ? AND external_id LIKE 'safari:%' AND deleted = 0`
    )
    .all(provider.id) as Array<{
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
    const keys = safariLookupKeys(row.external_id, row.url)
    if (keys.some((k) => seenBrowserKeys.has(k))) continue
    moveToRecycle.run(row.folder_id, LINKS_RECYCLE_BIN_ID, row.id)
    removed += 1
  }
  return removed
}

export function syncSafariBookmarksIntoDb(
  db: Database.Database,
  provider: BrowserBookmarkProvider
): LinksSyncResult {
  const root = safariBookmarksRoot()
  if (!root) {
    const hint =
      process.platform === 'darwin' ?
        '请确认 Safari 已安装，并在系统设置中为万物开启「完全磁盘访问权限」'
      : 'Safari 书签同步仅支持 macOS（Windows 无 Safari 配置目录）'
    throw new Error(`未找到 ${provider.displayName} 收藏夹：${hint}`)
  }

  const sourceId = provider.id
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
  const findBookmarkByUrlInFolder = db.prepare(`
    SELECT id, deleted, user_created FROM link_bookmarks
    WHERE source = ? AND folder_id = ? AND url = ? AND deleted = 0
    LIMIT 1
  `)
  const insertBookmark = db.prepare(`
    INSERT INTO link_bookmarks (id, folder_id, title, url, sort_order, deleted, source, external_id, user_created)
    VALUES (?, ?, ?, ?, ?, 0, ?, ?, 0)
  `)
  const updateBookmark = db.prepare(`
    UPDATE link_bookmarks SET title = ?, url = ?, sort_order = ?, folder_id = ?, external_id = ?
    WHERE id = ?
  `)

  const walk = (node: SafariBookmarkNode, parentId: string, path: string, index: number) => {
    const externalPath = path || 'bookmark_bar'
    const folderId = `${folderIdPrefix}${externalPath}`

    if (node.type === 'folder') {
      upsertFolder.run(folderId, parentId, node.name, index, sourceId, externalPath)
      const children = node.children ?? []
      children.forEach((child, i) => walk(child, folderId, `${externalPath}/${i}`, i))
      return
    }

    if (node.type === 'url' && node.url) {
      const externalId = buildSafariExternalId(node, externalPath)
      markSeen(node, externalPath, seenExternalIds, seenBrowserKeys)

      const existing = findBookmarkByExternal.get(externalId) as BookmarkRow | undefined
      if (!existing && node.url) {
        const byUrl = findBookmarkByUrlInFolder.get(sourceId, parentId, node.url) as
          | BookmarkRow
          | undefined
        if (byUrl) {
          updateBookmark.run(node.name, node.url, index, parentId, externalId, byUrl.id)
          updated += 1
          return
        }
      }

      if (existing?.deleted) {
        skippedDeleted += 1
        return
      }
      if (existing?.user_created && !existing.deleted) {
        skippedDeleted += 1
        return
      }

      if (existing) {
        updateBookmark.run(node.name, node.url, index, parentId, externalId, existing.id)
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

  const children = root.children ?? []
  children.forEach((child, i) => walk(child, provider.rootFolderId, `bookmark_bar/${i}`, i))

  const removed = pruneMissing(db, provider, seenExternalIds, seenBrowserKeys)
  return { added, updated, skippedDeleted, removed, pushedToBrowser: 0 }
}
