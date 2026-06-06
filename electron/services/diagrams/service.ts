import Database from 'better-sqlite3'
import { randomUUID } from 'crypto'
import { readFile } from 'fs/promises'
import { extname } from 'path'
import { ensureWanwuDataLayout, getWanwuPathLayout } from '../data/paths'
import {
  DG_DRAFTS,
  DG_FILES,
  DG_HOME,
  DG_RECYCLE,
  isDiagramCustomFolderId,
  isDiagramSystemFolderId
} from '../../../src/modules/library/diagrams/domain/diagramFolderIds'
import { dialog } from 'electron'
import type {
  DiagramContent,
  DiagramExportWfgResult,
  DiagramImportDrawioResult,
  DiagramImportNodeAssetResult,
  DiagramImportWfgResult,
  DiagramFileMeta,
  DiagramFileRecord,
  DiagramFolder,
  DiagramSearchHit,
  DiagramWritePatch,
  WriteResult
} from '../../../src/shared/types/diagrams'
import { getMainWindow } from '../../windowState'
import { diagramBodyPlainText } from '../../../src/modules/library/diagrams/lib/diagramContentText'
import {
  createBlankContent,
  deleteDiagramContent,
  diagramContentPath,
  diagramContentSizeBytes,
  exportContentWfg,
  exportDiagramWfg,
  readDiagramContent,
  materializeImportedWfg,
  readDrawioFile,
  readWfgFile,
  relativeContentPath,
  writeDiagramAsset,
  writeDiagramContent,
  writeDiagramContentWithAssets,
  writeDiagramContentPatch
} from './diagramFileStorage'
import { toWanwuMediaUrl } from '../media/wanwu'
import { buildDiagramAssetRelPath } from '../../../src/modules/library/diagrams/lib/diagramAssetRefs'

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
    this.migrateSchema()
  }

  private migrateSchema(): void {
    const cols = this.db.prepare(`PRAGMA table_info(diagram_files)`).all() as Array<{ name: string }>
    if (!cols.some((c) => c.name === 'pinned')) {
      this.db.exec(`ALTER TABLE diagram_files ADD COLUMN pinned INTEGER NOT NULL DEFAULT 0`)
    }
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
      ? `SELECT id, folder_id, title, page_count, thumbnail_path, pinned, created_at, updated_at, deleted_at
         FROM diagram_files WHERE folder_id = ? ORDER BY pinned DESC, updated_at DESC`
      : `SELECT id, folder_id, title, page_count, thumbnail_path, pinned, created_at, updated_at, deleted_at
         FROM diagram_files WHERE folder_id = ? AND deleted_at IS NULL ORDER BY pinned DESC, updated_at DESC`

    const rows = this.db.prepare(sql).all(folderId) as Array<{
      id: string
      folder_id: string
      title: string
      page_count: number
      thumbnail_path: string | null
      pinned: number
      created_at: string
      updated_at: string
      deleted_at: string | null
    }>

    return rows.map((r) => mapFileRow(r, this.mediaDir))
  }

  listRecentFiles(limit = 20): DiagramFileMeta[] {
    const rows = this.db
      .prepare(
        `SELECT id, folder_id, title, page_count, thumbnail_path, pinned, created_at, updated_at, deleted_at
         FROM diagram_files WHERE deleted_at IS NULL AND folder_id != ?
         ORDER BY pinned DESC, updated_at DESC LIMIT ?`
      )
      .all(DG_RECYCLE, limit) as Array<{
      id: string
      folder_id: string
      title: string
      page_count: number
      thumbnail_path: string | null
      pinned: number
      created_at: string
      updated_at: string
      deleted_at: string | null
    }>
    return rows.map((r) => mapFileRow(r, this.mediaDir))
  }

  searchFiles(query: string, limit = 40): DiagramSearchHit[] {
    const q = query.trim().toLowerCase()
    if (!q) return []

    const rows = this.db
      .prepare(
        `SELECT id, folder_id, title, page_count, thumbnail_path, pinned, created_at, updated_at, deleted_at
         FROM diagram_files WHERE deleted_at IS NULL AND folder_id != ?
         ORDER BY pinned DESC, updated_at DESC`
      )
      .all(DG_RECYCLE) as Array<{
      id: string
      folder_id: string
      title: string
      page_count: number
      thumbnail_path: string | null
      pinned: number
      created_at: string
      updated_at: string
      deleted_at: string | null
    }>

    const hits: DiagramSearchHit[] = []
    for (const row of rows) {
      const titleMatch = row.title.toLowerCase().includes(q)
      const content = readDiagramContent(this.mediaDir, row.id)
      const bodyPlain = content ? diagramBodyPlainText(content) : ''
      const contentMatch = bodyPlain.toLowerCase().includes(q)
      if (!titleMatch && !contentMatch) continue
      hits.push({
        meta: mapFileRow(row, this.mediaDir),
        matchedInTitle: titleMatch,
        matchedInContent: contentMatch
      })
      if (hits.length >= limit) break
    }
    return hits
  }

  duplicateFile(fileId: string): DiagramFileRecord | null {
    const record = this.readFile(fileId)
    if (!record || record.meta.deletedAt) return null
    const newTitle = `${record.meta.title.trim() || '未命名流程图'} 副本`
    const content = structuredClone(record.content)
    content.meta.title = newTitle
    return this.createFile(record.meta.folderId, newTitle, content)
  }

  setFilePinned(fileId: string, pinned: boolean): DiagramFileMeta | null {
    const row = this.getFileRow(fileId)
    if (!row || row.deleted_at) return null
    const now = new Date().toISOString()
    this.db
      .prepare(`UPDATE diagram_files SET pinned = ?, updated_at = ? WHERE id = ?`)
      .run(pinned ? 1 : 0, now, fileId)
    return mapFileRow({ ...row, pinned: pinned ? 1 : 0, updated_at: now }, this.mediaDir)
  }

  getFileContentPath(fileId: string): string | null {
    const row = this.getFileRow(fileId)
    if (!row) return null
    return diagramContentPath(this.mediaDir, fileId)
  }

  createFile(folderId: string, title: string, content?: DiagramContent): DiagramFileRecord {
    if (folderId === DG_HOME || folderId === DG_RECYCLE) {
      throw new Error('不能在该分组创建文件')
    }
    const id = randomUUID()
    const now = new Date().toISOString()
    let body = content ?? createBlankContent(title)
    body.meta.title = title
    body = writeDiagramContentWithAssets(this.mediaDir, id, body)

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
        pinned: false,
        sizeBytes: diagramContentSizeBytes(this.mediaDir, id),
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
    return { meta: mapFileRow(row, this.mediaDir), content }
  }

  writeFile(
    fileId: string,
    content: DiagramContent,
    baseUpdatedAt: string,
    force = false,
    patch?: DiagramWritePatch
  ): WriteResult {
    const row = this.getFileRow(fileId)
    if (!row) return { ok: false, reason: 'not_found', message: '文件不存在' }
    if (!force && row.updated_at !== baseUpdatedAt) {
      return { ok: false, reason: 'conflict', message: '文件已被其他位置修改，请重新加载或覆盖保存' }
    }

    const now = new Date().toISOString()
    if (patch && patch.dirtyPageIds.length + (patch.deletedPageIds?.length ?? 0) > 0) {
      writeDiagramContentPatch(this.mediaDir, fileId, content, patch)
    } else if (patch?.metaDirty) {
      writeDiagramContentPatch(this.mediaDir, fileId, content, patch)
    } else {
      writeDiagramContent(this.mediaDir, fileId, content)
    }
    this.db
      .prepare(
        `UPDATE diagram_files SET title = ?, page_count = ?, updated_at = ? WHERE id = ?`
      )
      .run(content.meta.title, content.pages.length, now, fileId)

    return { ok: true, updatedAt: now }
  }

  private async createFileFromImportedWfg(
    folderId: string,
    sourcePath: string,
    content: DiagramContent
  ): Promise<DiagramFileRecord | null> {
    const id = randomUUID()
    const title = content.meta.title
    const now = new Date().toISOString()
    await materializeImportedWfg(this.mediaDir, sourcePath, id, content)

    this.db
      .prepare(
        `INSERT INTO diagram_files
         (id, folder_id, title, page_count, content_path, thumbnail_path, created_at, updated_at, deleted_at)
         VALUES (?, ?, ?, ?, ?, NULL, ?, ?, NULL)`
      )
      .run(
        id,
        folderId,
        title,
        content.pages.length,
        relativeContentPath(id),
        now,
        now
      )

    const saved = readDiagramContent(this.mediaDir, id)
    if (!saved) return null

    return {
      meta: {
        id,
        folderId,
        title,
        pageCount: saved.pages.length,
        thumbnailPath: null,
        pinned: false,
        sizeBytes: diagramContentSizeBytes(this.mediaDir, id),
        createdAt: now,
        updatedAt: now,
        deletedAt: null
      },
      content: saved
    }
  }

  async importWfgAndCreate(
    folderId: string
  ): Promise<DiagramFileRecord | { canceled: true } | null> {
    if (folderId === DG_HOME || folderId === DG_RECYCLE) {
      throw new Error('不能在该分组创建文件')
    }
    const imported = await this.importWfg()
    if (!imported.ok) {
      if (imported.canceled) return { canceled: true }
      return null
    }
    return this.createFileFromImportedWfg(folderId, imported.sourcePath, imported.content)
  }

  async importWfgFromSource(
    folderId: string,
    sourcePath: string,
    content: DiagramContent
  ): Promise<DiagramFileRecord | null> {
    if (folderId === DG_HOME || folderId === DG_RECYCLE) {
      throw new Error('不能在该分组创建文件')
    }
    return this.createFileFromImportedWfg(folderId, sourcePath, content)
  }

  async importDrawioAndCreate(
    folderId: string
  ): Promise<DiagramFileRecord | { canceled: true } | null> {
    if (folderId === DG_HOME || folderId === DG_RECYCLE) {
      throw new Error('不能在该分组创建文件')
    }
    const imported = await this.importDrawio()
    if (!imported.ok) {
      if (imported.canceled) return { canceled: true }
      return null
    }
    return this.createFile(folderId, imported.content.meta.title, imported.content)
  }

  async importDrawio(): Promise<DiagramImportDrawioResult> {
    const win = getMainWindow()
    const openOptions = {
      filters: [
        { name: 'draw.io 图表', extensions: ['drawio', 'xml'] }
      ],
      properties: ['openFile'] as const
    }
    const result = win
      ? await dialog.showOpenDialog(win, openOptions)
      : await dialog.showOpenDialog(openOptions)
    if (result.canceled || !result.filePaths?.[0]) return { ok: false, canceled: true }

    try {
      const sourcePath = result.filePaths[0]
      const content = await readDrawioFile(sourcePath)
      return { ok: true, content, sourcePath }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return { ok: false, error: message }
    }
  }

  async importWfg(): Promise<DiagramImportWfgResult> {
    const win = getMainWindow()
    const openOptions = {
      filters: [{ name: 'Wanwu 流程图', extensions: ['wfg'] }],
      properties: ['openFile'] as const
    }
    const result = win
      ? await dialog.showOpenDialog(win, openOptions)
      : await dialog.showOpenDialog(openOptions)
    if (result.canceled || !result.filePaths?.[0]) return { ok: false, canceled: true }

    try {
      const sourcePath = result.filePaths[0]
      const content = await readWfgFile(sourcePath)
      return { ok: true, content, sourcePath }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return { ok: false, error: message }
    }
  }

  async importNodeAsset(fileId: string): Promise<DiagramImportNodeAssetResult> {
    const row = this.getFileRow(fileId)
    if (!row || row.deleted_at) {
      return { ok: false, error: '文件不存在' }
    }

    const win = getMainWindow()
    const openOptions = {
      filters: [
        { name: '图片', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'] }
      ],
      properties: ['openFile'] as const
    }
    const result = win
      ? await dialog.showOpenDialog(win, openOptions)
      : await dialog.showOpenDialog(openOptions)
    if (result.canceled || !result.filePaths?.[0]) return { ok: false, canceled: true }

    try {
      const sourcePath = result.filePaths[0]
      const rawExt = extname(sourcePath).slice(1).toLowerCase()
      const ext = rawExt === 'jpeg' ? 'jpg' : rawExt || 'png'
      const data = await readFile(sourcePath)
      const assetId = randomUUID()
      writeDiagramAsset(this.mediaDir, fileId, assetId, ext, data)
      const rel = buildDiagramAssetRelPath(fileId, assetId, ext)
      const url = toWanwuMediaUrl(rel)
      if (!url) return { ok: false, error: '资源路径无效' }
      return { ok: true, assetId, ext, url }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return { ok: false, error: message }
    }
  }

  async exportWfg(input: {
    fileId?: string | null
    content?: DiagramContent
    defaultName: string
  }): Promise<DiagramExportWfgResult> {
    const win = getMainWindow()
    const defaultPath = `${input.defaultName.trim() || '未命名流程图'}.wfg`
    const saveOptions = {
      defaultPath,
      filters: [{ name: 'Wanwu 流程图', extensions: ['wfg'] }]
    }
    const result = win
      ? await dialog.showSaveDialog(win, saveOptions)
      : await dialog.showSaveDialog(saveOptions)
    if (result.canceled || !result.filePath) return { ok: false, canceled: true }

    try {
      if (input.fileId) {
        await exportDiagramWfg(this.mediaDir, input.fileId, result.filePath)
      } else if (input.content) {
        await exportContentWfg(input.content, result.filePath)
      } else {
        return { ok: false, error: '缺少导出内容' }
      }
      return { ok: true, path: result.filePath }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return { ok: false, error: message }
    }
  }

  renameFile(fileId: string, title: string): DiagramFileMeta | null {
    const row = this.getFileRow(fileId)
    if (!row || row.deleted_at) return null
    const now = new Date().toISOString()
    this.db.prepare(`UPDATE diagram_files SET title = ?, updated_at = ? WHERE id = ?`).run(title, now, fileId)
    const content = readDiagramContent(this.mediaDir, fileId)
    if (content) {
      content.meta.title = title
      writeDiagramContentPatch(this.mediaDir, fileId, content, {
        dirtyPageIds: [],
        metaDirty: true
      })
    }
    return { ...mapFileRow(row, this.mediaDir), title, updatedAt: now }
  }

  moveFile(fileId: string, folderId: string): DiagramFileMeta | null {
    if (folderId === DG_HOME || folderId === DG_RECYCLE) return null
    const row = this.getFileRow(fileId)
    if (!row || row.deleted_at) return null
    const now = new Date().toISOString()
    this.db
      .prepare(`UPDATE diagram_files SET folder_id = ?, updated_at = ? WHERE id = ?`)
      .run(folderId, now, fileId)
    return { ...mapFileRow(row, this.mediaDir), folderId, updatedAt: now }
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
        `SELECT id, folder_id, title, page_count, thumbnail_path, pinned, created_at, updated_at, deleted_at
         FROM diagram_files WHERE id = ?`
      )
      .get(fileId) as
      | {
          id: string
          folder_id: string
          title: string
          page_count: number
          thumbnail_path: string | null
          pinned: number
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
      | undefined
  }
}

function mapFileRow(
  r: {
    id: string
    folder_id: string
    title: string
    page_count: number
    thumbnail_path: string | null
    pinned: number
    created_at: string
    updated_at: string
    deleted_at: string | null
  },
  mediaDir: string
): DiagramFileMeta {
  return {
    id: r.id,
    folderId: r.folder_id,
    title: r.title,
    pageCount: r.page_count,
    thumbnailPath: r.thumbnail_path,
    pinned: Boolean(r.pinned),
    sizeBytes: diagramContentSizeBytes(mediaDir, r.id),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    deletedAt: r.deleted_at
  }
}
