import Database from 'better-sqlite3'
import { randomUUID } from 'crypto'
import { ensureWanwuDataLayout, getWanwuPathLayout } from '../data/paths'
import {
  DG_DRAFTS,
  DG_FILES,
  DG_HOME,
  DG_RECYCLE,
  isDiagramCustomFolderId,
  isDiagramSystemFolderId
} from '../../../src/modules/library/diagrams/domain/diagramFolderIds'
import type {
  DiagramContent,
  DiagramFileMeta,
  DiagramFileRecord,
  DiagramFolder,
  WriteResult
} from '../../../src/shared/types/diagrams'
import {
  createBlankContent,
  deleteDiagramContent,
  readDiagramContent,
  relativeContentPath,
  writeDiagramContent
} from './diagramFileStorage'

const SYSTEM_FOLDERS: Array<{ id: string; name: string; sortOrder: number }> = [
  { id: DG_HOME, name: '首页', sortOrder: 0 },
  { id: DG_DRAFTS, name: '草稿', sortOrder: 10 },
  { id: DG_FILES, name: '文件', sortOrder: 20 },
  { id: DG_RECYCLE, name: '回收站', sortOrder: 9999 }
]

export class DiagramService {
  private db: Database.Database
  private mediaDir: string

  constructor(private readonly basePath: string) {
    const root = ensureWanwuDataLayout(basePath)
    const layout = getWanwuPathLayout(root)
    this.mediaDir = layout.media
    this.db = new Database(layout.diagramsDbFile)
    this.initSchema()
    this.ensureSystemFolders()
  }

  close(): void {
    this.db.close()
  }

  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS diagram_folders (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        kind TEXT NOT NULL,
        parent_id TEXT,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        deleted_at TEXT
      );
      CREATE TABLE IF NOT EXISTS diagram_files (
        id TEXT PRIMARY KEY,
        folder_id TEXT NOT NULL,
        title TEXT NOT NULL,
        page_count INTEGER NOT NULL DEFAULT 1,
        content_path TEXT NOT NULL,
        thumbnail_path TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_diagram_files_folder ON diagram_files(folder_id);
    `)
  }

  private ensureSystemFolders(): void {
    const now = new Date().toISOString()
    const insert = this.db.prepare(`
      INSERT OR IGNORE INTO diagram_folders (id, name, kind, parent_id, sort_order, created_at, deleted_at)
      VALUES (?, ?, 'system', NULL, ?, ?, NULL)
    `)
    for (const f of SYSTEM_FOLDERS) {
      insert.run(f.id, f.name, f.sortOrder, now)
    }
  }

  listFolders(): DiagramFolder[] {
    const rows = this.db
      .prepare(
        `SELECT id, name, kind, parent_id, sort_order, created_at, deleted_at
         FROM diagram_folders WHERE deleted_at IS NULL ORDER BY sort_order, name`
      )
      .all() as Array<{
      id: string
      name: string
      kind: string
      parent_id: string | null
      sort_order: number
      created_at: string
      deleted_at: string | null
    }>

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      kind: r.kind as DiagramFolder['kind'],
      parentId: r.parent_id,
      sortOrder: r.sort_order,
      createdAt: r.created_at,
      deletedAt: r.deleted_at
    }))
  }

  createFolder(name: string): DiagramFolder {
    const id = `dg-custom-${randomUUID()}`
    const now = new Date().toISOString()
    const maxOrder = this.db
      .prepare(`SELECT COALESCE(MAX(sort_order), 0) AS m FROM diagram_folders WHERE kind = 'custom'`)
      .get() as { m: number }
    const sortOrder = maxOrder.m + 10

    this.db
      .prepare(
        `INSERT INTO diagram_folders (id, name, kind, parent_id, sort_order, created_at, deleted_at)
         VALUES (?, ?, 'custom', NULL, ?, ?, NULL)`
      )
      .run(id, name.trim(), sortOrder, now)

    return {
      id,
      name: name.trim(),
      kind: 'custom',
      parentId: null,
      sortOrder,
      createdAt: now,
      deletedAt: null
    }
  }

  renameFolder(folderId: string, name: string): void {
    if (isDiagramSystemFolderId(folderId)) {
      throw new Error('不能重命名系统分组')
    }
    const result = this.db
      .prepare(`UPDATE diagram_folders SET name = ? WHERE id = ? AND kind = 'custom'`)
      .run(name.trim(), folderId)
    if (result.changes === 0) throw new Error('分组不存在')
  }

  deleteFolder(folderId: string): void {
    if (isDiagramSystemFolderId(folderId)) {
      throw new Error('不能删除系统分组')
    }
    const count = this.db
      .prepare(`SELECT COUNT(*) AS c FROM diagram_files WHERE folder_id = ? AND deleted_at IS NULL`)
      .get(folderId) as { c: number }
    if (count.c > 0) throw new Error('分组内仍有文件，请先移走或删除')
    const result = this.db.prepare(`DELETE FROM diagram_folders WHERE id = ? AND kind = 'custom'`).run(folderId)
    if (result.changes === 0) throw new Error('分组不存在')
  }

  reorderFolders(orders: Array<{ folderId: string; sortOrder: number }>): void {
    const stmt = this.db.prepare(`UPDATE diagram_folders SET sort_order = ? WHERE id = ?`)
    const tx = this.db.transaction(() => {
      for (const o of orders) stmt.run(o.sortOrder, o.folderId)
    })
    tx()
  }

  listFiles(folderId: string, includeDeleted = false): DiagramFileMeta[] {
    if (folderId === DG_HOME) return this.listRecentFiles(20)

    const sql = includeDeleted
      ? `SELECT id, folder_id, title, page_count, thumbnail_path, created_at, updated_at, deleted_at
         FROM diagram_files WHERE folder_id = ? ORDER BY updated_at DESC`
      : `SELECT id, folder_id, title, page_count, thumbnail_path, created_at, updated_at, deleted_at
         FROM diagram_files WHERE folder_id = ? AND deleted_at IS NULL ORDER BY updated_at DESC`

    const rows = this.db.prepare(sql).all(folderId) as Array<{
      id: string
      folder_id: string
      title: string
      page_count: number
      thumbnail_path: string | null
      created_at: string
      updated_at: string
      deleted_at: string | null
    }>

    return rows.map(mapFileRow)
  }

  listRecentFiles(limit = 20): DiagramFileMeta[] {
    const rows = this.db
      .prepare(
        `SELECT id, folder_id, title, page_count, thumbnail_path, created_at, updated_at, deleted_at
         FROM diagram_files WHERE deleted_at IS NULL AND folder_id != ?
         ORDER BY updated_at DESC LIMIT ?`
      )
      .all(DG_RECYCLE, limit) as Array<{
      id: string
      folder_id: string
      title: string
      page_count: number
      thumbnail_path: string | null
      created_at: string
      updated_at: string
      deleted_at: string | null
    }>
    return rows.map(mapFileRow)
  }

  createFile(folderId: string, title: string, content?: DiagramContent): DiagramFileRecord {
    if (folderId === DG_HOME || folderId === DG_RECYCLE) {
      throw new Error('不能在该分组创建文件')
    }
    const id = randomUUID()
    const now = new Date().toISOString()
    const body = content ?? createBlankContent(title)
    body.meta.title = title
    writeDiagramContent(this.mediaDir, id, body)

    this.db
      .prepare(
        `INSERT INTO diagram_files
         (id, folder_id, title, page_count, content_path, thumbnail_path, created_at, updated_at, deleted_at)
         VALUES (?, ?, ?, ?, ?, NULL, ?, ?, NULL)`
      )
      .run(id, folderId, title, body.pages.length, relativeContentPath(id), now, now)

    return {
      meta: {
        id,
        folderId,
        title,
        pageCount: body.pages.length,
        thumbnailPath: null,
        createdAt: now,
        updatedAt: now,
        deletedAt: null
      },
      content: body
    }
  }

  readFile(fileId: string): DiagramFileRecord | null {
    const row = this.getFileRow(fileId)
    if (!row) return null
    const content = readDiagramContent(this.mediaDir, fileId)
    if (!content) return null
    return { meta: mapFileRow(row), content }
  }

  writeFile(fileId: string, content: DiagramContent, baseUpdatedAt: string): WriteResult {
    const row = this.getFileRow(fileId)
    if (!row) return { ok: false, reason: 'not_found', message: '文件不存在' }
    if (row.updated_at !== baseUpdatedAt) {
      return { ok: false, reason: 'conflict', message: '文件已被修改' }
    }

    const now = new Date().toISOString()
    writeDiagramContent(this.mediaDir, fileId, content)
    this.db
      .prepare(
        `UPDATE diagram_files SET title = ?, page_count = ?, updated_at = ? WHERE id = ?`
      )
      .run(content.meta.title, content.pages.length, now, fileId)

    return { ok: true, updatedAt: now }
  }

  renameFile(fileId: string, title: string): DiagramFileMeta | null {
    const row = this.getFileRow(fileId)
    if (!row || row.deleted_at) return null
    const now = new Date().toISOString()
    this.db.prepare(`UPDATE diagram_files SET title = ?, updated_at = ? WHERE id = ?`).run(title, now, fileId)
    const content = readDiagramContent(this.mediaDir, fileId)
    if (content) {
      content.meta.title = title
      writeDiagramContent(this.mediaDir, fileId, content)
    }
    return { ...mapFileRow(row), title, updatedAt: now }
  }

  moveFile(fileId: string, folderId: string): DiagramFileMeta | null {
    if (folderId === DG_HOME || folderId === DG_RECYCLE) return null
    const row = this.getFileRow(fileId)
    if (!row || row.deleted_at) return null
    const now = new Date().toISOString()
    this.db
      .prepare(`UPDATE diagram_files SET folder_id = ?, updated_at = ? WHERE id = ?`)
      .run(folderId, now, fileId)
    return { ...mapFileRow(row), folderId, updatedAt: now }
  }

  softDeleteFile(fileId: string): boolean {
    const row = this.getFileRow(fileId)
    if (!row || row.deleted_at) return false
    const now = new Date().toISOString()
    this.db
      .prepare(`UPDATE diagram_files SET folder_id = ?, deleted_at = ?, updated_at = ? WHERE id = ?`)
      .run(DG_RECYCLE, now, now, fileId)
    return true
  }

  restoreFile(fileId: string): boolean {
    const row = this.getFileRow(fileId)
    if (!row || !row.deleted_at) return false
    const targetFolder = row.folder_id === DG_RECYCLE ? DG_FILES : row.folder_id
    const now = new Date().toISOString()
    this.db
      .prepare(
        `UPDATE diagram_files SET folder_id = ?, deleted_at = NULL, updated_at = ? WHERE id = ?`
      )
      .run(targetFolder, now, fileId)
    return true
  }

  purgeFile(fileId: string): boolean {
    const row = this.getFileRow(fileId)
    if (!row) return false
    this.db.prepare(`DELETE FROM diagram_files WHERE id = ?`).run(fileId)
    deleteDiagramContent(this.mediaDir, fileId)
    return true
  }

  private getFileRow(fileId: string) {
    return this.db
      .prepare(
        `SELECT id, folder_id, title, page_count, thumbnail_path, created_at, updated_at, deleted_at
         FROM diagram_files WHERE id = ?`
      )
      .get(fileId) as
      | {
          id: string
          folder_id: string
          title: string
          page_count: number
          thumbnail_path: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
      | undefined
  }
}

function mapFileRow(r: {
  id: string
  folder_id: string
  title: string
  page_count: number
  thumbnail_path: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}): DiagramFileMeta {
  return {
    id: r.id,
    folderId: r.folder_id,
    title: r.title,
    pageCount: r.page_count,
    thumbnailPath: r.thumbnail_path,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    deletedAt: r.deleted_at
  }
}
