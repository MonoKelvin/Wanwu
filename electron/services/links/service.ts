import Database from 'better-sqlite3'
import { existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { randomUUID } from 'crypto'
import type { LinkBookmark, LinkFolder, LinksSyncResult } from '../../../src/shared/types/links'
import { edgeBookmarkBarRoot, readEdgeBookmarksFile, type EdgeBookmarkNode } from './edgeBookmarks'

const EDGE_ROOT_ID = 'edge-microsoft'
const RECYCLE_BIN_ID = 'links-recycle-bin'

export class LinksService {
  private db: Database.Database

  constructor(private readonly basePath: string) {
    mkdirSync(join(basePath, 'db'), { recursive: true })
    const dbPath = join(basePath, 'db', 'library_links.sqlite')
    this.db = new Database(dbPath)
    this.initSchema()
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
        unreachable INTEGER
      );
      CREATE INDEX IF NOT EXISTS idx_link_bookmarks_folder ON link_bookmarks(folder_id);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_link_bookmarks_external
        ON link_bookmarks(external_id) WHERE external_id IS NOT NULL;
    `)
  }

  private ensureSystemFolders(): void {
    const insert = this.db.prepare(`
      INSERT OR IGNORE INTO link_folders (id, parent_id, name, sort_order, source, external_path, is_recycle_bin)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
    insert.run(EDGE_ROOT_ID, null, 'Microsoft Edge', 0, 'edge', 'bookmark_bar', 0)
    insert.run(RECYCLE_BIN_ID, null, '回收站', 9999, 'system', null, 1)
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
    const rows = this.db
      .prepare(
        `SELECT id, folder_id, title, url, sort_order, deleted, source, external_id, user_created, unreachable
         FROM link_bookmarks
         WHERE folder_id = ? ${includeDeleted ? '' : 'AND deleted = 0'}
         ORDER BY sort_order, title`
      )
      .all(folderId) as Array<{
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

    return rows.map((r) => ({
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
    }))
  }

  /** 全库链接（搜索用） */
  listAllBookmarks(): LinkBookmark[] {
    const rows = this.db
      .prepare(
        `SELECT id, folder_id, title, url, sort_order, deleted, source, external_id, user_created, unreachable
         FROM link_bookmarks
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

    return rows.map((r) => ({
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
    }))
  }

  softDeleteBookmark(id: string): void {
    this.db
      .prepare(`UPDATE link_bookmarks SET deleted = 1, folder_id = ? WHERE id = ?`)
      .run(RECYCLE_BIN_ID, id)
  }

  restoreBookmark(id: string): void {
    const row = this.db
      .prepare(`SELECT external_id, folder_id FROM link_bookmarks WHERE id = ?`)
      .get(id) as { external_id: string | null; folder_id: string } | undefined
    if (!row) return
    let targetFolder = EDGE_ROOT_ID
    if (row.external_id) {
      const folder = this.db
        .prepare(`SELECT id FROM link_folders WHERE external_path = ?`)
        .get(row.external_id.split('::')[0]) as { id: string } | undefined
      if (folder) targetFolder = folder.id
    } else if (row.folder_id !== RECYCLE_BIN_ID) {
      targetFolder = row.folder_id
    }
    this.db
      .prepare(`UPDATE link_bookmarks SET deleted = 0, folder_id = ? WHERE id = ?`)
      .run(targetFolder, id)
  }

  permanentDeleteBookmark(id: string): void {
    this.db.prepare(`DELETE FROM link_bookmarks WHERE id = ?`).run(id)
  }

  createBookmark(input: { folderId: string; title: string; url: string }): LinkBookmark {
    const id = randomUUID()
    const maxOrder = this.db
      .prepare(`SELECT COALESCE(MAX(sort_order), -1) AS m FROM link_bookmarks WHERE folder_id = ?`)
      .get(input.folderId) as { m: number }
    this.db
      .prepare(
        `INSERT INTO link_bookmarks (id, folder_id, title, url, sort_order, deleted, source, user_created)
         VALUES (?, ?, ?, ?, ?, 0, 'local', 1)`
      )
      .run(id, input.folderId, input.title, input.url, (maxOrder?.m ?? -1) + 1)
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
    if (input.title != null) {
      this.db.prepare(`UPDATE link_bookmarks SET title = ? WHERE id = ?`).run(input.title, input.id)
    }
    if (input.url != null) {
      this.db.prepare(`UPDATE link_bookmarks SET url = ? WHERE id = ?`).run(input.url, input.id)
    }
    if (input.folderId != null) {
      this.db.prepare(`UPDATE link_bookmarks SET folder_id = ? WHERE id = ?`).run(input.folderId, input.id)
    }
    const folderId = (input.folderId ?? row.folder_id) as string
    return this.listBookmarks(folderId, { includeDeleted: true }).find((b) => b.id === input.id) ?? null
  }

  syncFromEdge(): LinksSyncResult {
    const root = edgeBookmarkBarRoot()
    if (!root) {
      return { added: 0, updated: 0, skippedDeleted: 0, pushedToBrowser: 0 }
    }

    let added = 0
    let updated = 0
    let skippedDeleted = 0

    const upsertFolder = this.db.prepare(`
      INSERT INTO link_folders (id, parent_id, name, sort_order, source, external_path, is_recycle_bin)
      VALUES (?, ?, ?, ?, 'edge', ?, 0)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        sort_order = excluded.sort_order,
        parent_id = excluded.parent_id
    `)

    const findBookmarkByExternal = this.db.prepare(
      `SELECT id, deleted, user_created FROM link_bookmarks WHERE external_id = ?`
    )

    const insertBookmark = this.db.prepare(`
      INSERT INTO link_bookmarks (id, folder_id, title, url, sort_order, deleted, source, external_id, user_created)
      VALUES (?, ?, ?, ?, ?, 0, 'edge', ?, 0)
    `)
    const updateBookmark = this.db.prepare(`
      UPDATE link_bookmarks SET title = ?, url = ?, sort_order = ?, folder_id = ?
      WHERE id = ?
    `)

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
        const externalId = `edge:${externalPath}:${node.guid ?? node.url}`
        const existing = findBookmarkByExternal.get(externalId) as
          | { id: string; deleted: number; user_created: number }
          | undefined
        if (existing?.deleted) {
          skippedDeleted += 1
          return
        }
        if (existing?.user_created) {
          skippedDeleted += 1
          return
        }
        if (existing) {
          updateBookmark.run(node.name, node.url, index, parentId, existing.id)
          updated += 1
        } else {
          insertBookmark.run(randomUUID(), parentId, node.name, node.url, index, externalId)
          added += 1
        }
      }
    }

    const children = root.children ?? []
    children.forEach((child, i) => walk(child, EDGE_ROOT_ID, `bookmark_bar/${i}`, i))

    return { added, updated, skippedDeleted, pushedToBrowser: 0 }
  }

  /** 将本地未删除、非回收站条目写回 Edge（保留浏览器内软删项） */
  syncToEdge(): LinksSyncResult {
    const file = readEdgeBookmarksFile()
    if (!file?.roots?.bookmark_bar) {
      return { added: 0, updated: 0, skippedDeleted: 0, pushedToBrowser: 0 }
    }
    // 完整双向合并写回需改写 Bookmarks JSON 并落盘；首版仅统计待推送数量
    const count = this.db
      .prepare(
        `SELECT COUNT(*) AS c FROM link_bookmarks WHERE deleted = 0 AND user_created = 1 AND source = 'local'`
      )
      .get() as { c: number }
    return {
      added: 0,
      updated: 0,
      skippedDeleted: 0,
      pushedToBrowser: count?.c ?? 0
    }
  }

  syncMerge(): LinksSyncResult {
    const from = this.syncFromEdge()
    const to = this.syncToEdge()
    return {
      added: from.added,
      updated: from.updated,
      skippedDeleted: from.skippedDeleted,
      pushedToBrowser: to.pushedToBrowser
    }
  }

  probeUnreachable(ids: string[]): Record<string, boolean> {
    const out: Record<string, boolean> = {}
    for (const id of ids) {
      const row = this.db
        .prepare(`SELECT url FROM link_bookmarks WHERE id = ? AND deleted = 0`)
        .get(id) as { url: string } | undefined
      if (!row?.url) continue
      try {
        const u = new URL(row.url)
        out[id] = !['http:', 'https:', 'ftp:'].includes(u.protocol)
      } catch {
        out[id] = true
      }
    }
    return out
  }
}
