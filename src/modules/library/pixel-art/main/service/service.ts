import Database from 'better-sqlite3'
import { randomUUID } from 'crypto'
import { dialog } from 'electron'
import { writeFileSync } from 'node:fs'
import { isAbsolute, normalize } from 'node:path'
import { ensureWanwuDataLayout, getWanwuPathLayout } from '../../../../../../electron/services/data/paths'
import { ensureDirSync } from '@shared/lib/fsEnsure'
import { getMainWindow } from '../../../../../../electron/windowState'
import {
  PA_FILES,
  PA_HOME,
  PA_RECYCLE
} from '@modules/library/pixel-art/domain/meta'
import { createBlankPixelDocument } from '@modules/library/pixel-art/lib/blankDocument'
import {
  clonePixelDocumentForIpc
} from '@modules/library/pixel-art/lib/pixelIpcCodec'
import type {
  PixelDocument,
  PixelExportResult,
  PixelFileMeta,
  PixelFileRecord,
  PixelFolder,
  PixelWritePatch,
  WriteResult
} from '@modules/library/pixel-art/domain/types'
import { pixelArtDbFile, pixelArtMediaDir } from '@modules/library/pixel-art/main/pixelPaths'
import {
  readPixelContent,
  registerPixelWppPath,
  relativePixelWppPath,
  unregisterPixelWppPath,
  writePixelContent,
  writePixelContentPatch
} from '@modules/library/pixel-art/main/service/pixelWppStore'
import { WppPixelDocument } from '@modules/library/pixel-art/main/service/wppPixelDocument'
import { pixelWppFileName } from '@modules/library/pixel-art/main/pixelPaths'

const SYSTEM_FOLDERS: Array<{ id: string; name: string; sortOrder: number }> = [
  { id: PA_HOME, name: '首页', sortOrder: 0 },
  { id: PA_FILES, name: '文件', sortOrder: 20 },
  { id: PA_RECYCLE, name: '回收站', sortOrder: 9999 }
]

const FILE_SELECT_COLS = `id, folder_id, previous_folder_id, title, width, height, content_path, pinned, created_at, updated_at, deleted_at`

type PixelFileRow = {
  id: string
  folder_id: string
  previous_folder_id: string | null
  title: string
  width: number
  height: number
  content_path: string
  pinned: number
  created_at: string
  updated_at: string
  deleted_at: string | null
}

function stripWppExtension(title: string): string {
  return title.replace(/\.wpp$/i, '').trim()
}

function mapFileRow(row: PixelFileRow): PixelFileMeta {
  return {
    id: row.id,
    folderId: row.folder_id,
    previousFolderId: row.previous_folder_id,
    title: row.title,
    width: row.width,
    height: row.height,
    pinned: row.pinned === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at
  }
}

export class PixelArtService {
  private db: Database.Database
  private mediaDir: string

  constructor(private readonly basePath: string) {
    const root = ensureWanwuDataLayout(basePath)
    const layout = getWanwuPathLayout(root)
    this.mediaDir = pixelArtMediaDir(layout)
    ensureDirSync(this.mediaDir)
    this.db = new Database(pixelArtDbFile(layout))
    this.initSchema()
    this.ensureSystemFolders()
    this.migrateAwayCustomFolders()
    this.refreshWppPathRegistry()
  }

  /** \u5c06\u65e7\u7248\u81ea\u5b9a\u4e49\u5206\u7ec4\u4e2d\u7684\u6587\u4ef6\u5f52\u5e76\u5230\u300c\u6587\u4ef6\u300d\u5206\u7ec4 */
  private migrateAwayCustomFolders(): void {
    const customRows = this.db
      .prepare(`SELECT id FROM pa_folders WHERE kind = 'custom' AND deleted_at IS NULL`)
      .all() as Array<{ id: string }>
    if (!customRows.length) return
    const now = new Date().toISOString()
    const moveFiles = this.db.prepare(
      `UPDATE pa_files SET folder_id = ? WHERE folder_id = ? AND deleted_at IS NULL`
    )
    const markDeleted = this.db.prepare(`UPDATE pa_folders SET deleted_at = ? WHERE id = ?`)
    for (const row of customRows) {
      moveFiles.run(PA_FILES, row.id)
      markDeleted.run(now, row.id)
    }
    this.db
      .prepare(
        `UPDATE pa_files SET previous_folder_id = ? WHERE previous_folder_id IN (SELECT id FROM pa_folders WHERE kind = 'custom')`
      )
      .run(PA_FILES)
  }

  private refreshWppPathRegistry(): void {
    const rows = this.db
      .prepare(`SELECT id, content_path FROM pa_files`)
      .all() as Array<{ id: string; content_path: string }>
    for (const row of rows) {
      registerPixelWppPath(row.id, row.content_path, this.mediaDir)
    }
  }

  close(): void {
    this.db.close()
  }

  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS pa_folders (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        kind TEXT NOT NULL,
        parent_id TEXT,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        deleted_at TEXT
      );
      CREATE TABLE IF NOT EXISTS pa_files (
        id TEXT PRIMARY KEY,
        folder_id TEXT NOT NULL,
        previous_folder_id TEXT,
        title TEXT NOT NULL,
        width INTEGER NOT NULL,
        height INTEGER NOT NULL,
        content_path TEXT NOT NULL,
        pinned INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_pa_files_folder ON pa_files(folder_id);
    `)
  }

  private ensureSystemFolders(): void {
    const now = new Date().toISOString()
    const insert = this.db.prepare(
      `INSERT OR IGNORE INTO pa_folders (id, name, kind, parent_id, sort_order, created_at, deleted_at)
       VALUES (?, ?, 'system', NULL, ?, ?, NULL)`
    )
    for (const f of SYSTEM_FOLDERS) {
      insert.run(f.id, f.name, f.sortOrder, now)
    }
  }

  listFolders(): PixelFolder[] {
    const rows = this.db
      .prepare(
        `SELECT id, name, kind, parent_id, sort_order, created_at, deleted_at FROM pa_folders WHERE deleted_at IS NULL AND kind = 'system' ORDER BY sort_order`
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
      kind: r.kind as 'system' | 'custom',
      parentId: r.parent_id,
      sortOrder: r.sort_order,
      createdAt: r.created_at,
      deletedAt: r.deleted_at
    }))
  }

  listFiles(folderId: string, includeDeleted = false): PixelFileMeta[] {
    const sql = includeDeleted
      ? `SELECT ${FILE_SELECT_COLS} FROM pa_files WHERE folder_id = ? ORDER BY updated_at DESC`
      : `SELECT ${FILE_SELECT_COLS} FROM pa_files WHERE folder_id = ? AND deleted_at IS NULL ORDER BY updated_at DESC`
    return (this.db.prepare(sql).all(folderId) as PixelFileRow[]).map(mapFileRow)
  }

  listRecentFiles(limit = 20): PixelFileMeta[] {
    return (
      this.db
        .prepare(
          `SELECT ${FILE_SELECT_COLS} FROM pa_files WHERE deleted_at IS NULL AND folder_id != ? ORDER BY updated_at DESC LIMIT ?`
        )
        .all(PA_RECYCLE, limit) as PixelFileRow[]
    ).map(mapFileRow)
  }

  countRecycleFiles(): number {
    const row = this.db
      .prepare(`SELECT COUNT(*) as c FROM pa_files WHERE folder_id = ? AND deleted_at IS NOT NULL`)
      .get(PA_RECYCLE) as { c: number }
    return row.c
  }

  private getFileRow(fileId: string): PixelFileRow | undefined {
    return this.db
      .prepare(`SELECT ${FILE_SELECT_COLS} FROM pa_files WHERE id = ?`)
      .get(fileId) as PixelFileRow | undefined
  }

  async createFile(
    folderId: string,
    title: string,
    width = 32,
    height = 32,
    content?: PixelDocument,
    contentPath?: string
  ): Promise<PixelFileRecord> {
    folderId = PA_FILES
    const normalizedTitle = stripWppExtension(title)
    const id = randomUUID()
    const now = new Date().toISOString()
    const body = content ?? createBlankPixelDocument(width, height, normalizedTitle)
    body.meta.title = normalizedTitle
    body.meta.width = width
    body.meta.height = height
    const trimmedPath = contentPath?.trim()
    const storedPath =
      trimmedPath && isAbsolute(trimmedPath) ? normalize(trimmedPath) : relativePixelWppPath(id, normalizedTitle)
    await writePixelContent(this.mediaDir, id, storedPath, body)
    registerPixelWppPath(id, storedPath, this.mediaDir)

    this.db
      .prepare(
        `INSERT INTO pa_files (id, folder_id, previous_folder_id, title, width, height, content_path, pinned, created_at, updated_at, deleted_at)
         VALUES (?, ?, NULL, ?, ?, ?, ?, 0, ?, ?, NULL)`
      )
      .run(id, folderId, normalizedTitle, width, height, storedPath, now, now)

    const record = await this.readFile(id)
    if (!record) throw new Error('创建文件失败')
    return record
  }

  async readFile(fileId: string): Promise<PixelFileRecord | null> {
    const row = this.getFileRow(fileId)
    if (!row) return null
    const content = await readPixelContent(this.mediaDir, fileId, row.content_path, row.title)
    if (!content) return null
    return {
      meta: mapFileRow(row),
      content: clonePixelDocumentForIpc(content)
    }
  }

  async writeFile(
    fileId: string,
    content: PixelDocument,
    baseUpdatedAt: string,
    force = false,
    patch?: PixelWritePatch
  ): Promise<WriteResult> {
    const row = this.getFileRow(fileId)
    if (!row) return { ok: false, reason: 'not_found', message: '文件不存在' }
    if (!force && row.updated_at !== baseUpdatedAt) {
      return { ok: false, reason: 'conflict', message: '文件已被其他位置修改，请重新加载或覆盖保存' }
    }
    const now = new Date().toISOString()
    const cloned = clonePixelDocumentForIpc(content)
    if (patch?.dirtyLayerIds.length) {
      await writePixelContentPatch(this.mediaDir, fileId, row.content_path, cloned, patch)
    } else {
      await writePixelContent(this.mediaDir, fileId, row.content_path, cloned)
    }
    this.db
      .prepare(`UPDATE pa_files SET title = ?, width = ?, height = ?, updated_at = ? WHERE id = ?`)
      .run(cloned.meta.title, cloned.meta.width, cloned.meta.height, now, fileId)
    return { ok: true, updatedAt: now }
  }

  renameFile(fileId: string, title: string): PixelFileMeta | null {
    const row = this.getFileRow(fileId)
    if (!row) return null
    const normalizedTitle = stripWppExtension(title)
    const now = new Date().toISOString()
    this.db.prepare(`UPDATE pa_files SET title = ?, updated_at = ? WHERE id = ?`).run(normalizedTitle, now, fileId)
    return { ...mapFileRow(row), title: normalizedTitle, updatedAt: now }
  }

  softDeleteFile(fileId: string): boolean {
    const row = this.getFileRow(fileId)
    if (!row || row.deleted_at) return false
    const now = new Date().toISOString()
    this.db
      .prepare(
        `UPDATE pa_files SET previous_folder_id = folder_id, folder_id = ?, deleted_at = ?, updated_at = ? WHERE id = ?`
      )
      .run(PA_RECYCLE, now, now, fileId)
    return true
  }

  restoreFile(fileId: string): PixelFileMeta | null {
    const row = this.getFileRow(fileId)
    if (!row || !row.deleted_at) return null
    const folderId = PA_FILES
    const now = new Date().toISOString()
    this.db
      .prepare(
        `UPDATE pa_files SET folder_id = ?, previous_folder_id = NULL, deleted_at = NULL, updated_at = ? WHERE id = ?`
      )
      .run(folderId, now, fileId)
    return { ...mapFileRow(row), folderId, deletedAt: null, updatedAt: now }
  }

  purgeFile(fileId: string): boolean {
    const row = this.getFileRow(fileId)
    if (!row || row.folder_id !== PA_RECYCLE) return false
    unregisterPixelWppPath(fileId)
    this.db.prepare(`DELETE FROM pa_files WHERE id = ?`).run(fileId)
    return true
  }

  async exportImageWithDialog(params: {
    defaultName: string
    format: 'png' | 'jpeg' | 'svg' | 'wpp'
    dataBase64?: string
    svgContent?: string
    jpegQuality?: number
  }): Promise<PixelExportResult> {
    const win = getMainWindow()
    const ext =
      params.format === 'jpeg' ? 'jpg' : params.format === 'svg' ? 'svg' : params.format === 'wpp' ? 'wpp' : 'png'
    const filters = [{ name: ext.toUpperCase(), extensions: [ext] }]
    const result = win
      ? await dialog.showSaveDialog(win, { defaultPath: `${params.defaultName}.${ext}`, filters })
      : await dialog.showSaveDialog({ defaultPath: `${params.defaultName}.${ext}`, filters })
    if (result.canceled || !result.filePath) return { ok: false, canceled: true }

    if (params.format === 'svg' && params.svgContent) {
      writeFileSync(result.filePath, params.svgContent, 'utf8')
      return { ok: true, path: result.filePath }
    }
    if (params.dataBase64) {
      writeFileSync(result.filePath, Buffer.from(params.dataBase64, 'base64'))
      return { ok: true, path: result.filePath }
    }
    return { ok: false, error: '缺少导出数据' }
  }

  async pickWppSavePath(params: { defaultName: string }): Promise<PixelExportResult> {
    const win = getMainWindow()
    const result = win
      ? await dialog.showSaveDialog(win, {
          defaultPath: pixelWppFileName(params.defaultName),
          filters: [{ name: 'Wanwu Pixel', extensions: ['wpp'] }]
        })
      : await dialog.showSaveDialog({
          defaultPath: pixelWppFileName(params.defaultName),
          filters: [{ name: 'Wanwu Pixel', extensions: ['wpp'] }]
        })
    if (result.canceled || !result.filePath) return { ok: false, canceled: true }
    return { ok: true, path: result.filePath }
  }

  async saveWppWithDialog(params: {
    defaultName: string
    fileId?: string
    content?: PixelDocument
  }): Promise<PixelExportResult> {
    const win = getMainWindow()
    const result = win
      ? await dialog.showSaveDialog(win, {
          defaultPath: pixelWppFileName(params.defaultName),
          filters: [{ name: 'Wanwu Pixel', extensions: ['wpp'] }]
        })
      : await dialog.showSaveDialog({
          defaultPath: pixelWppFileName(params.defaultName),
          filters: [{ name: 'Wanwu Pixel', extensions: ['wpp'] }]
        })
    if (result.canceled || !result.filePath) return { ok: false, canceled: true }

    let content = params.content
    if (!content && params.fileId) {
      const record = await this.readFile(params.fileId)
      content = record?.content
    }
    if (!content) return { ok: false, error: '无文档内容' }

    const doc = WppPixelDocument.create(params.fileId ?? randomUUID(), content.meta.title, content)
    await doc.exportWpp(result.filePath)
    return { ok: true, path: result.filePath }
  }
}
