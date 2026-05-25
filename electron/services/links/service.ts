import Database from 'better-sqlite3'
import { mkdirSync } from 'fs'
import { join } from 'path'
import { randomUUID } from 'crypto'
import type { LinkBookmark, LinkFolder, LinksSyncResult } from '../../../src/shared/types/links'
import {
  EDGE_ROOT_FOLDER_ID,
  LINKS_RECYCLE_BIN_ID,
  LOCAL_COLLECTIONS_ROOT_ID
} from './constants'
import { syncEdgeBookmarksIntoDb, parseEdgeExternalPath } from './edgeSync'
import { syncBookmarksToEdgeFile } from './edgeWriteBack'
import {
  checkLinkReachability,
  mapPool,
  type LinkReachabilityIssue
} from './linkReachability'
import { normalizeLinkUrl } from './linkUrl'
import type { LinksProbeProgress, LinksProbeSummary } from '../../../src/shared/types/links'

export {
  EDGE_ROOT_FOLDER_ID,
  LINKS_RECYCLE_BIN_ID,
  LOCAL_COLLECTIONS_ROOT_ID
} from './constants'

export class LinksService {
  private db: Database.Database

  constructor(private readonly basePath: string) {
    mkdirSync(join(basePath, 'db'), { recursive: true })
    const dbPath = join(basePath, 'db', 'library_links.sqlite')
    this.db = new Database(dbPath)
    this.initSchema()
    this.migrateSchema()
    this.ensureSystemFolders()
  }

  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS link_folders (
        id TEXT PRIMARY KEY,
        parent_id TEXT,
        name TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        source TEXT NOT NULL DEFAULT 'local',
        external_path TEXT,
        is_recycle_bin INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS link_bookmarks (
        id TEXT PRIMARY KEY,
        folder_id TEXT NOT NULL,
        title TEXT NOT NULL,
        url TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        deleted INTEGER NOT NULL DEFAULT 0,
        source TEXT NOT NULL DEFAULT 'local',
        external_id TEXT,
        user_created INTEGER NOT NULL DEFAULT 0,
        unreachable INTEGER,
        prev_folder_id TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_link_bookmarks_folder ON link_bookmarks(folder_id);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_link_bookmarks_external
        ON link_bookmarks(external_id) WHERE external_id IS NOT NULL;
    `)
  }

  private migrateSchema(): void {
    const cols = this.db
      .prepare(`PRAGMA table_info(link_bookmarks)`)
      .all() as Array<{ name: string }>
    if (!cols.some((c) => c.name === 'prev_folder_id')) {
      this.db.exec(`ALTER TABLE link_bookmarks ADD COLUMN prev_folder_id TEXT`)
    }
  }

  private ensureSystemFolders(): void {
    const insert = this.db.prepare(`
      INSERT OR IGNORE INTO link_folders (id, parent_id, name, sort_order, source, external_path, is_recycle_bin)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
    insert.run(EDGE_ROOT_FOLDER_ID, null, 'Microsoft Edge', 0, 'edge', 'bookmark_bar', 0)
    insert.run(LOCAL_COLLECTIONS_ROOT_ID, null, '收藏夹', 1, 'local', null, 0)
    this.db
      .prepare(`UPDATE link_folders SET name = '收藏夹' WHERE id = ?`)
      .run(LOCAL_COLLECTIONS_ROOT_ID)
    insert.run(LINKS_RECYCLE_BIN_ID, null, '回收站', 9999, 'system', null, 1)
  }

  private getFolderRow(id: string):
    | {
        id: string
        parent_id: string | null
        name: string
        sort_order: number
        source: string
        external_path: string | null
        is_recycle_bin: number
      }
    | undefined {
    return this.db
      .prepare(
        `SELECT id, parent_id, name, sort_order, source, external_path, is_recycle_bin
         FROM link_folders WHERE id = ?`
      )
      .get(id) as
      | {
          id: string
          parent_id: string | null
          name: string
          sort_order: number
          source: string
          external_path: string | null
          is_recycle_bin: number
        }
      | undefined
  }

  private isLocalSubtreeFolderId(folderId: string): boolean {
    let current: string | null = folderId
    while (current) {
      if (current === LOCAL_COLLECTIONS_ROOT_ID) return true
      if (current === LINKS_RECYCLE_BIN_ID || current === EDGE_ROOT_FOLDER_ID) return false
      const row = this.getFolderRow(current)
      if (!row) return false
      current = row.parent_id
    }
    return false
  }

  private assertBookmarkTargetFolder(folderId: string): void {
    if (folderId === LINKS_RECYCLE_BIN_ID) {
      throw new Error('无法在回收站中新建链接')
    }
    const folder = this.getFolderRow(folderId)
    if (!folder || folder.is_recycle_bin) {
      throw new Error('目标文件夹不存在')
    }
  }

  private assertLocalFolderParent(parentId: string): void {
    if (parentId !== LOCAL_COLLECTIONS_ROOT_ID && !this.isLocalSubtreeFolderId(parentId)) {
      throw new Error('自定义目录仅能在「收藏夹」下创建')
    }
    const parent = this.getFolderRow(parentId)
    if (!parent || parent.is_recycle_bin) {
      throw new Error('父文件夹不存在')
    }
  }

  listFolders(): LinkFolder[] {
    const rows = this.db
      .prepare(
        `SELECT id, parent_id, name, sort_order, source, external_path, is_recycle_bin
         FROM link_folders ORDER BY sort_order, name`
      )
      .all() as Array<{
      id: string
      parent_id: string | null
      name: string
      sort_order: number
      source: string
      external_path: string | null
      is_recycle_bin: number
    }>

    const map = new Map<string, LinkFolder>()
    for (const r of rows) {
      map.set(r.id, {
        id: r.id,
        parentId: r.parent_id,
        name: r.name,
        sortOrder: r.sort_order,
        source: r.source as LinkFolder['source'],
        externalPath: r.external_path,
        isRecycleBin: r.is_recycle_bin === 1,
        children: []
      })
    }

    const roots: LinkFolder[] = []
    for (const folder of map.values()) {
      if (folder.parentId && map.has(folder.parentId)) {
        map.get(folder.parentId)!.children!.push(folder)
      } else if (!folder.parentId) {
        roots.push(folder)
      }
    }

    const sortRec = (nodes: LinkFolder[]) => {
      nodes.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'zh-CN'))
      nodes.forEach((n) => n.children?.length && sortRec(n.children))
    }
    sortRec(roots)
    return roots
  }

  listBookmarks(folderId: string, options?: { includeDeleted?: boolean }): LinkBookmark[] {
    const includeDeleted = options?.includeDeleted ?? false
    const isRecycle = folderId === LINKS_RECYCLE_BIN_ID
    const sql = isRecycle
      ? `SELECT id, folder_id, title, url, sort_order, deleted, source, external_id, user_created, unreachable
         FROM link_bookmarks
         WHERE folder_id = ? AND deleted = 1
         ORDER BY sort_order, title`
      : `SELECT id, folder_id, title, url, sort_order, deleted, source, external_id, user_created, unreachable
         FROM link_bookmarks
         WHERE folder_id = ? ${includeDeleted ? '' : 'AND deleted = 0'}
         ORDER BY sort_order, title`

    const rows = this.db.prepare(sql).all(folderId) as Array<{
      id: string
      folder_id: string
      title: string
      url: string
      sort_order: number
      deleted: number
      source: string
      external_id: string | null
      user_created: number
      unreachable: number | null
    }>

    return rows.map((r) => this.rowToBookmark(r))
  }

  listAllBookmarks(): LinkBookmark[] {
    const rows = this.db
      .prepare(
        `SELECT id, folder_id, title, url, sort_order, deleted, source, external_id, user_created, unreachable
         FROM link_bookmarks
         WHERE deleted = 0
         ORDER BY sort_order, title`
      )
      .all() as Array<{
      id: string
      folder_id: string
      title: string
      url: string
      sort_order: number
      deleted: number
      source: string
      external_id: string | null
      user_created: number
      unreachable: number | null
    }>

    return rows.map((r) => this.rowToBookmark(r))
  }

  private rowToBookmark(r: {
    id: string
    folder_id: string
    title: string
    url: string
    sort_order: number
    deleted: number
    source: string
    external_id: string | null
    user_created: number
    unreachable: number | null
  }): LinkBookmark {
    return {
      id: r.id,
      folderId: r.folder_id,
      title: r.title,
      url: r.url,
      sortOrder: r.sort_order,
      deleted: r.deleted === 1,
      source: r.source as LinkBookmark['source'],
      externalId: r.external_id,
      userCreated: r.user_created === 1,
      unreachable: r.unreachable === null ? null : r.unreachable === 1
    }
  }

  createFolder(input: { parentId: string; name: string }): LinkFolder {
    const name = input.name.trim()
    if (!name) throw new Error('分组名称不能为空')
    this.assertLocalFolderParent(input.parentId)

    const id = `local-folder:${randomUUID()}`
    const maxOrder = this.db
      .prepare(`SELECT COALESCE(MAX(sort_order), -1) AS m FROM link_folders WHERE parent_id = ?`)
      .get(input.parentId) as { m: number }
    const sortOrder = (maxOrder?.m ?? -1) + 1

    this.db
      .prepare(
        `INSERT INTO link_folders (id, parent_id, name, sort_order, source, external_path, is_recycle_bin)
         VALUES (?, ?, ?, ?, 'local', NULL, 0)`
      )
      .run(id, input.parentId, name, sortOrder)

    const row = this.getFolderRow(id)
    if (row) {
      return {
        id: row.id,
        parentId: row.parent_id,
        name: row.name,
        sortOrder: row.sort_order,
        source: 'local',
        externalPath: null,
        isRecycleBin: false,
        children: []
      }
    }

    return {
      id,
      parentId: input.parentId,
      name,
      sortOrder,
      source: 'local',
      externalPath: null,
      isRecycleBin: false,
      children: []
    }
  }

  deleteFolder(input: { folderId: string; moveBookmarksToRoot: boolean }): void {
    this.assertDeletableLocalFolder(input.folderId)
    const folderIds = this.collectDescendantFolderIds(input.folderId)
    const placeholders = folderIds.map(() => '?').join(',')

    const tx = this.db.transaction(() => {
      const bookmarks = this.db
        .prepare(
          `SELECT id, folder_id FROM link_bookmarks
           WHERE folder_id IN (${placeholders}) AND deleted = 0`
        )
        .all(...folderIds) as Array<{ id: string; folder_id: string }>

      if (input.moveBookmarksToRoot && bookmarks.length) {
        const maxOrder = this.db
          .prepare(
            `SELECT COALESCE(MAX(sort_order), -1) AS m FROM link_bookmarks
             WHERE folder_id = ? AND deleted = 0`
          )
          .get(LOCAL_COLLECTIONS_ROOT_ID) as { m: number }
        let nextOrder = (maxOrder?.m ?? -1) + 1
        const moveStmt = this.db.prepare(
          `UPDATE link_bookmarks SET folder_id = ?, sort_order = ? WHERE id = ?`
        )
        for (const row of bookmarks) {
          moveStmt.run(LOCAL_COLLECTIONS_ROOT_ID, nextOrder++, row.id)
        }
      } else {
        for (const row of bookmarks) {
          this.softDeleteBookmark(row.id)
        }
      }

      const deleteFolderStmt = this.db.prepare(`DELETE FROM link_folders WHERE id = ?`)
      for (let i = folderIds.length - 1; i >= 0; i--) {
        deleteFolderStmt.run(folderIds[i])
      }
    })
    tx()
  }

  private assertDeletableLocalFolder(folderId: string): void {
    if (folderId === LOCAL_COLLECTIONS_ROOT_ID) {
      throw new Error('不能删除收藏夹根目录')
    }
    const row = this.getFolderRow(folderId)
    if (!row || row.is_recycle_bin || row.source !== 'local') {
      throw new Error('只能删除收藏夹下的自定义目录')
    }
    if (!this.isLocalSubtreeFolderId(folderId)) {
      throw new Error('只能删除收藏夹下的自定义目录')
    }
  }

  private collectDescendantFolderIds(folderId: string): string[] {
    const ids: string[] = [folderId]
    const children = this.db
      .prepare(`SELECT id FROM link_folders WHERE parent_id = ?`)
      .all(folderId) as Array<{ id: string }>
    for (const child of children) {
      ids.push(...this.collectDescendantFolderIds(child.id))
    }
    return ids
  }

  softDeleteBookmark(id: string): void {
    const row = this.db
      .prepare(`SELECT folder_id, deleted FROM link_bookmarks WHERE id = ?`)
      .get(id) as { folder_id: string; deleted: number } | undefined
    if (!row || row.deleted === 1) return
    if (row.folder_id === LINKS_RECYCLE_BIN_ID) return

    this.db
      .prepare(
        `UPDATE link_bookmarks
         SET deleted = 1, prev_folder_id = ?, folder_id = ?
         WHERE id = ?`
      )
      .run(row.folder_id, LINKS_RECYCLE_BIN_ID, id)
  }

  restoreBookmark(id: string): void {
    const row = this.db
      .prepare(
        `SELECT external_id, folder_id, prev_folder_id FROM link_bookmarks WHERE id = ?`
      )
      .get(id) as
      | { external_id: string | null; folder_id: string; prev_folder_id: string | null }
      | undefined
    if (!row) return

    let targetFolder = row.prev_folder_id
    if (!targetFolder && row.external_id) {
      const path = parseEdgeExternalPath(row.external_id)
      if (path) {
        const folder = this.db
          .prepare(`SELECT id FROM link_folders WHERE external_path = ?`)
          .get(path) as { id: string } | undefined
        if (folder) targetFolder = folder.id
      }
    }
    if (!targetFolder || targetFolder === LINKS_RECYCLE_BIN_ID) {
      targetFolder = EDGE_ROOT_FOLDER_ID
    }

    this.db
      .prepare(
        `UPDATE link_bookmarks
         SET deleted = 0, folder_id = ?, prev_folder_id = NULL
         WHERE id = ?`
      )
      .run(targetFolder, id)
  }

  permanentDeleteBookmark(id: string): void {
    this.db.prepare(`DELETE FROM link_bookmarks WHERE id = ?`).run(id)
  }

  createBookmark(input: { folderId: string; title: string; url: string }): LinkBookmark {
    const title = input.title.trim()
    if (!title) throw new Error('标题不能为空')
    this.assertBookmarkTargetFolder(input.folderId)
    const url = normalizeLinkUrl(input.url)

    const id = randomUUID()
    const maxOrder = this.db
      .prepare(`SELECT COALESCE(MAX(sort_order), -1) AS m FROM link_bookmarks WHERE folder_id = ?`)
      .get(input.folderId) as { m: number }
    this.db
      .prepare(
        `INSERT INTO link_bookmarks (id, folder_id, title, url, sort_order, deleted, source, user_created)
         VALUES (?, ?, ?, ?, ?, 0, 'local', 1)`
      )
      .run(id, input.folderId, title, url, (maxOrder?.m ?? -1) + 1)
    return this.listBookmarks(input.folderId).find((b) => b.id === id)!
  }

  updateBookmark(input: {
    id: string
    title?: string
    url?: string
    folderId?: string
  }): LinkBookmark | null {
    const row = this.db
      .prepare(`SELECT folder_id FROM link_bookmarks WHERE id = ?`)
      .get(input.id) as { folder_id: string } | undefined
    if (!row) return null

    if (input.folderId != null) {
      this.assertBookmarkTargetFolder(input.folderId)
    }
    if (input.title != null) {
      const title = input.title.trim()
      if (!title) throw new Error('标题不能为空')
      this.db.prepare(`UPDATE link_bookmarks SET title = ? WHERE id = ?`).run(title, input.id)
    }
    if (input.url != null) {
      const url = normalizeLinkUrl(input.url)
      this.db.prepare(`UPDATE link_bookmarks SET url = ? WHERE id = ?`).run(url, input.id)
    }
    if (input.folderId != null) {
      this.db.prepare(`UPDATE link_bookmarks SET folder_id = ? WHERE id = ?`).run(input.folderId, input.id)
    }

    const folderId = (input.folderId ?? row.folder_id) as string
    return (
      this.listBookmarks(folderId, { includeDeleted: true }).find((b) => b.id === input.id) ?? null
    )
  }

  /** 仅更新软件内展示顺序，不写 Edge */
  reorderBookmarks(folderId: string, orderedIds: string[]): void {
    const stmt = this.db.prepare(
      `UPDATE link_bookmarks SET sort_order = ? WHERE id = ? AND folder_id = ?`
    )
    const tx = this.db.transaction((ids: string[]) => {
      ids.forEach((id, index) => stmt.run(index, id, folderId))
    })
    tx(orderedIds)
  }

  syncFromEdge(): LinksSyncResult {
    return syncEdgeBookmarksIntoDb(this.db)
  }

  syncToEdge(): LinksSyncResult {
    const push = syncBookmarksToEdgeFile(this.db)
    if (push.failed > 0 && push.pushed + push.updated + push.removed === 0) {
      throw new Error(
        `无法写回 Edge：有 ${push.failed} 条链接在浏览器收藏夹中未找到对应项`
      )
    }
    const pull = syncEdgeBookmarksIntoDb(this.db)
    return {
      added: pull.added,
      updated: pull.updated + push.updated,
      skippedDeleted: pull.skippedDeleted,
      removed: pull.removed,
      pushedToBrowser: push.pushed + push.updated + push.removed
    }
  }

  /** 拉取 → 写回 Edge → 再拉取（串行，保证 external_id 与浏览器一致） */
  syncMerge(): LinksSyncResult {
    const pullBefore = this.syncFromEdge()
    const push = syncBookmarksToEdgeFile(this.db)
    const pullAfter = this.syncFromEdge()
    return {
      added: pullBefore.added + pullAfter.added,
      updated: pullBefore.updated + pullAfter.updated + push.updated,
      skippedDeleted: pullBefore.skippedDeleted + pullAfter.skippedDeleted,
      removed: pullBefore.removed + pullAfter.removed,
      pushedToBrowser: push.pushed + push.updated + push.removed
    }
  }

  async probeUnreachable(
    ids: string[],
    onProgress?: (progress: LinksProbeProgress) => void
  ): Promise<LinksProbeSummary> {
    const results: Record<string, boolean> = {}
    const byIssue: Record<LinkReachabilityIssue, number> = {
      invalid_syntax: 0,
      network: 0,
      http_status: 0,
      timeout: 0
    }

    const rows = ids
      .map((id) => {
        const row = this.db
          .prepare(`SELECT id, url FROM link_bookmarks WHERE id = ? AND deleted = 0`)
          .get(id) as { id: string; url: string } | undefined
        return row
      })
      .filter((r): r is { id: string; url: string } => !!r?.url)

    const update = this.db.prepare(`UPDATE link_bookmarks SET unreachable = ? WHERE id = ?`)
    const clear = this.db.prepare(`UPDATE link_bookmarks SET unreachable = NULL WHERE id = ?`)

    for (const id of ids) {
      clear.run(id)
    }

    let done = 0
    const total = rows.length
    onProgress?.({ done, total })

    await mapPool(rows, 4, async (row) => {
      const check = await checkLinkReachability(row.url)
      results[row.id] = check.unreachable
      update.run(check.unreachable ? 1 : 0, row.id)
      if (check.unreachable && check.issue) {
        byIssue[check.issue] += 1
      }
      done += 1
      onProgress?.({ done, total })
      return check
    })

    const invalidCount = Object.values(results).filter(Boolean).length
    return { results, invalidCount, byIssue }
  }
}
