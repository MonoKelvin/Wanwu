import Database from 'better-sqlite3'
import { randomUUID } from 'crypto'
import { existsSync } from 'fs'
import { readFile, stat } from 'fs/promises'
import { basename, dirname, extname, join, normalize } from 'path'
import { ensureWanwuDataLayout, getWanwuPathLayout } from '../../../../../../electron/services/data/paths'
import {
  DG_DRAFTS,
  DG_FILES,
  DG_HOME,
  DG_RECYCLE,
  isDiagramCustomFolderId,
  isDiagramSystemFolderId
} from '@modules/library/diagrams/domain/diagramFolderIds'
import { app, dialog } from 'electron'
import { ensureDirSync } from '@shared/lib/fsEnsure'
import {
  isExternalDiagramContentPath,
  resolveStoredDiagramWfgPath
} from './diagramWfgPaths'
import { registerDiagramWfgPath } from './diagramWfgStore'
import type {
  DiagramContent,
  DiagramExportWfgResult,
  DiagramSaveNewResult,
  DiagramImportDrawioResult,
  DiagramImportNodeAssetResult,
  DiagramImportWfgResult,
  DiagramFileMeta,
  DiagramFileRecord,
  DiagramFolder,
  DiagramSearchHit,
  DiagramWritePatch,
  WriteResult
} from '@modules/library/diagrams/domain/types'
import { getMainWindow } from '../../../../../../electron/windowState'
import { diagramBodyPlainText } from '@modules/library/diagrams/lib/diagramContentText'
import { buildSearchSnippet } from '@shared/lib/searchText'
import { cloneForIpc } from '@shared/lib/cloneForIpc'
import {
  createBlankContent,
  deleteDiagramContent,
  diagramContentSizeBytes,
  ensureDiagramWfgFile,
  exportContentWfg,
  exportDiagramWfg,
  readDiagramContent,
  materializeImportedWfg,
  readDrawioFile,
  readWfgFile,
  relativeContentPath,
  renameDiagramWfgFile,
  writeDiagramAsset,
  writeDiagramContent,
  writeDiagramContentWithAssets,
  writeDiagramContentPatch,
  copyDiagramPackageAssets,
  migrateAllDiagramStorageToWfg
} from './diagramFileStorage'
import { toWanwuMediaUrl } from '../../../../../../electron/services/media/wanwu'
import { diagramsDbFile, diagramsMediaDir } from '../diagramPaths'
import { buildDiagramAssetRelPath } from '@modules/library/diagrams/lib/diagramAssetRefs'

const SYSTEM_FOLDERS: Array<{ id: string; name: string; sortOrder: number }> = [
  { id: DG_HOME, name: '首页', sortOrder: 0 },
  { id: DG_FILES, name: '文件', sortOrder: 20 },
  { id: DG_RECYCLE, name: '回收站', sortOrder: 9999 }
]

const FILE_SELECT_COLS = `id, folder_id, previous_folder_id, title, page_count, content_path, thumbnail_path, pinned, created_at, updated_at, deleted_at`

type DiagramFileRow = {
  id: string
  folder_id: string
  previous_folder_id: string | null
  title: string
  page_count: number
  content_path: string
  thumbnail_path: string | null
  pinned: number
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export class DiagramService {
  private db: Database.Database
  private mediaDir: string

  constructor(private readonly basePath: string) {
    const root = ensureWanwuDataLayout(basePath)
    const layout = getWanwuPathLayout(root)
    this.mediaDir = layout.media
    ensureDirSync(diagramsMediaDir(layout))
    this.db = new Database(diagramsDbFile(layout))
    this.initSchema()
    this.ensureSystemFolders()
    this.refreshWfgPathRegistry()
  }

  private refreshWfgPathRegistry(): void {
    const rows = this.db
      .prepare(`SELECT id, content_path FROM diagram_files`)
      .all() as Array<{ id: string; content_path: string }>
    for (const row of rows) {
      registerDiagramWfgPath(row.id, row.content_path, this.mediaDir)
    }
  }

  close(): void {
    this.db.close()
  }

  /** 将库内所有解压目录迁移为仅含 .wfg 的压缩包（启动时调用） */
  async migrateStorageToWfg(): Promise<number> {
    const rows = this.db
      .prepare(`SELECT id, title FROM diagram_files WHERE deleted_at IS NULL`)
      .all() as Array<{ id: string; title: string }>
    const titles = new Map(rows.map((r) => [r.id, r.title]))
    const count = await migrateAllDiagramStorageToWfg(this.mediaDir, titles)
    if (count > 0) {
      console.info(`[wanwu:diagrams] 已将 ${count} 个文档迁移为 .wfg 压缩包`)
    }
    return count
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
    if (!cols.some((c) => c.name === 'previous_folder_id')) {
      this.db.exec(`ALTER TABLE diagram_files ADD COLUMN previous_folder_id TEXT`)
    }
    // 草稿分组已废弃：文件迁入「文件」，并隐藏草稿目录
    this.db
      .prepare(`UPDATE diagram_files SET folder_id = ? WHERE folder_id = ? AND deleted_at IS NULL`)
      .run(DG_FILES, DG_DRAFTS)
    const now = new Date().toISOString()
    this.db
      .prepare(`UPDATE diagram_folders SET deleted_at = ? WHERE id = ? AND deleted_at IS NULL`)
      .run(now, DG_DRAFTS)
    // 自定义分组归入「文件」目录下
    this.db
      .prepare(
        `UPDATE diagram_folders SET parent_id = ? WHERE kind = 'custom' AND (parent_id IS NULL OR parent_id = '')`
      )
      .run(DG_FILES)
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

    return rows
      .filter((r) => r.id !== DG_DRAFTS)
      .map((r) => ({
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
      .prepare(
        `SELECT COALESCE(MAX(sort_order), 0) AS m FROM diagram_folders WHERE kind = 'custom' AND parent_id = ?`
      )
      .get(DG_FILES) as { m: number }
    const sortOrder = maxOrder.m + 10

    this.db
      .prepare(
        `INSERT INTO diagram_folders (id, name, kind, parent_id, sort_order, created_at, deleted_at)
         VALUES (?, ?, 'custom', ?, ?, ?, NULL)`
      )
      .run(id, name.trim(), DG_FILES, sortOrder, now)

    return {
      id,
      name: name.trim(),
      kind: 'custom',
      parentId: DG_FILES,
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
      ? `SELECT ${FILE_SELECT_COLS}
         FROM diagram_files WHERE folder_id = ? ORDER BY pinned DESC, updated_at DESC`
      : `SELECT ${FILE_SELECT_COLS}
         FROM diagram_files WHERE folder_id = ? AND deleted_at IS NULL ORDER BY pinned DESC, updated_at DESC`

    const rows = this.db.prepare(sql).all(folderId) as DiagramFileRow[]

    return rows.map((r) => mapFileRow(r, this.mediaDir))
  }

  listRecentFiles(limit = 20): DiagramFileMeta[] {
    const rows = this.db
      .prepare(
        `SELECT ${FILE_SELECT_COLS}
         FROM diagram_files WHERE deleted_at IS NULL AND folder_id != ?
         ORDER BY pinned DESC, updated_at DESC LIMIT ?`
      )
      .all(DG_RECYCLE, limit) as DiagramFileRow[]
    return rows.map((r) => mapFileRow(r, this.mediaDir))
  }

  async searchFiles(query: string, limit = 40): Promise<DiagramSearchHit[]> {
    const q = query.trim().toLowerCase()
    if (!q) return []

    const rows = this.db
      .prepare(
        `SELECT ${FILE_SELECT_COLS}
         FROM diagram_files WHERE deleted_at IS NULL AND folder_id != ?
         ORDER BY pinned DESC, updated_at DESC`
      )
      .all(DG_RECYCLE) as DiagramFileRow[]

    const hits: DiagramSearchHit[] = []
    for (const row of rows) {
      const titleMatch = row.title.toLowerCase().includes(q)
      if (titleMatch) {
        hits.push({
          meta: mapFileRow(row, this.mediaDir),
          matchedInTitle: true,
          matchedInContent: false
        })
        if (hits.length >= limit) break
        continue
      }
      const content = await readDiagramContent(this.mediaDir, row.id, row.content_path, row.title)
      const bodyPlain = content ? diagramBodyPlainText(content) : ''
      if (!bodyPlain.toLowerCase().includes(q)) continue
      hits.push({
        meta: mapFileRow(row, this.mediaDir),
        matchedInTitle: false,
        matchedInContent: true,
        contentPreview: buildSearchSnippet(bodyPlain, q)
      })
      if (hits.length >= limit) break
    }
    return hits
  }

  countRecycleFiles(): number {
    const row = this.db
      .prepare(`SELECT COUNT(*) AS c FROM diagram_files WHERE folder_id = ?`)
      .get(DG_RECYCLE) as { c: number } | undefined
    return row?.c ?? 0
  }

  async duplicateFile(fileId: string): Promise<DiagramFileRecord | null> {
    const sourceRow = this.getFileRow(fileId)
    const record = await this.readFile(fileId)
    if (!sourceRow || !record || record.meta.deletedAt) return null

    const folderId = record.meta.folderId
    const newTitle = resolveUniqueDuplicateTitle(this.db, folderId, record.meta.title)
    const content = cloneForIpc(record.content)
    content.meta.title = newTitle

    const id = randomUUID()
    const now = new Date().toISOString()
    const newContentPath = relativeContentPath(id, newTitle)
    await writeDiagramContentWithAssets(this.mediaDir, id, newContentPath, content)
    await copyDiagramPackageAssets(
      this.mediaDir,
      fileId,
      sourceRow.content_path,
      id,
      newContentPath,
      newTitle
    )

    this.db
      .prepare(
        `INSERT INTO diagram_files
         (id, folder_id, title, page_count, content_path, thumbnail_path, created_at, updated_at, deleted_at)
         VALUES (?, ?, ?, ?, ?, NULL, ?, ?, NULL)`
      )
      .run(
        id,
        folderId,
        newTitle,
        content.pages.length,
        newContentPath,
        now,
        now
      )

    const row = this.getFileRow(id)
    if (!row) return null
    registerDiagramWfgPath(id, row.content_path, this.mediaDir)
    const saved = await readDiagramContent(this.mediaDir, id, row.content_path, newTitle)
    if (!saved) return null
    return { meta: mapFileRow(row, this.mediaDir), content: cloneForIpc(saved) }
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

  async getFileContentPath(fileId: string): Promise<string | null> {
    const row = this.getFileRow(fileId)
    if (!row) return null
    const resolved = resolveStoredDiagramWfgPath(this.mediaDir, row.content_path)
    if (isExternalDiagramContentPath(row.content_path)) {
      return resolved
    }
    return ensureDiagramWfgFile(this.mediaDir, fileId, row.content_path, row.title)
  }

  async createFile(
    folderId: string,
    title: string,
    content?: DiagramContent
  ): Promise<DiagramFileRecord> {
    if (folderId === DG_HOME || folderId === DG_RECYCLE) {
      throw new Error('不能在该分组创建文件')
    }
    const normalizedTitle = stripWfgExtension(title)
    const id = randomUUID()
    const now = new Date().toISOString()
    let body = content ? cloneForIpc(content) : createBlankContent(normalizedTitle)
    body.meta.title = normalizedTitle
    const contentPath = relativeContentPath(id, normalizedTitle)
    body = await writeDiagramContentWithAssets(this.mediaDir, id, contentPath, body)

    this.db
      .prepare(
        `INSERT INTO diagram_files
         (id, folder_id, title, page_count, content_path, thumbnail_path, created_at, updated_at, deleted_at)
         VALUES (?, ?, ?, ?, ?, NULL, ?, ?, NULL)`
      )
      .run(
        id,
        folderId,
        normalizedTitle,
        body.pages.length,
        contentPath,
        now,
        now
      )

    registerDiagramWfgPath(id, contentPath, this.mediaDir)

    return {
      meta: {
        id,
        folderId,
        title: normalizedTitle,
        pageCount: body.pages.length,
        thumbnailPath: null,
        pinned: false,
        sizeBytes: diagramContentSizeBytes(this.mediaDir, id, contentPath),
        createdAt: now,
        updatedAt: now,
        deletedAt: null
      },
      content: cloneForIpc(body)
    }
  }

  async readFile(fileId: string): Promise<DiagramFileRecord | null> {
    const row = this.getFileRow(fileId)
    if (!row) return null
    const content = await readDiagramContent(this.mediaDir, fileId, row.content_path, row.title)
    if (!content) return null
    return { meta: mapFileRow(row, this.mediaDir), content: cloneForIpc(content) }
  }

  async writeFile(
    fileId: string,
    content: DiagramContent,
    baseUpdatedAt: string,
    force = false,
    patch?: DiagramWritePatch
  ): Promise<WriteResult> {
    content = cloneForIpc(content)
    const row = this.getFileRow(fileId)
    if (!row) return { ok: false, reason: 'not_found', message: '文件不存在' }
    if (!force && row.updated_at !== baseUpdatedAt) {
      return { ok: false, reason: 'conflict', message: '文件已被其他位置修改，请重新加载或覆盖保存' }
    }

    const now = new Date().toISOString()
    if (patch && patch.dirtyPageIds.length + (patch.deletedPageIds?.length ?? 0) > 0) {
      await writeDiagramContentPatch(this.mediaDir, fileId, row.content_path, content, patch)
    } else if (patch?.metaDirty) {
      await writeDiagramContentPatch(this.mediaDir, fileId, row.content_path, content, patch)
    } else {
      await writeDiagramContent(this.mediaDir, fileId, row.content_path, content)
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
        relativeContentPath(id, title),
        now,
        now
      )

    const contentPath = relativeContentPath(id, title)
    registerDiagramWfgPath(id, contentPath, this.mediaDir)
    const saved = await readDiagramContent(this.mediaDir, id, contentPath, title)
    if (!saved) {
      throw new Error('导入后无法读取流程图内容，请检查磁盘权限或重试')
    }

    return {
      meta: {
        id,
        folderId,
        title,
        pageCount: saved.pages.length,
        thumbnailPath: null,
        pinned: false,
        sizeBytes: diagramContentSizeBytes(this.mediaDir, id, contentPath),
        createdAt: now,
        updatedAt: now,
        deletedAt: null
      },
      content: cloneForIpc(saved)
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
    return this.createFileFromImportedWfg(folderId, sourcePath, cloneForIpc(content))
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
    return await this.createFile(folderId, imported.content.meta.title, imported.content)
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
      return { ok: true, content: cloneForIpc(content), sourcePath }
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
      const sourcePath = normalize(result.filePaths[0])
      if (!existsSync(sourcePath)) {
        return { ok: false, error: '所选文件不存在或无法访问' }
      }
      const content = await readWfgFile(sourcePath)
      return { ok: true, content: cloneForIpc(content), sourcePath }
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
      await writeDiagramAsset(this.mediaDir, fileId, row.content_path, assetId, ext, data)
      const rel = buildDiagramAssetRelPath(fileId, assetId, ext)
      const url = toWanwuMediaUrl(rel)
      if (!url) return { ok: false, error: '资源路径无效' }
      return { ok: true, assetId, ext, url }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return { ok: false, error: message }
    }
  }

  async saveNewWithDialog(input: {
    folderId: string
    content: DiagramContent
    defaultName: string
  }): Promise<DiagramSaveNewResult> {
    const win = getMainWindow()
    const baseName = stripWfgExtension(input.defaultName.trim() || '未命名流程图')
    const defaultPath = join(app.getPath('documents'), `${baseName}.wfg`)
    const saveOptions = {
      defaultPath,
      filters: [{ name: 'Wanwu 流程图', extensions: ['wfg'] }]
    }
    const result = win
      ? await dialog.showSaveDialog(win, saveOptions)
      : await dialog.showSaveDialog(saveOptions)
    if (result.canceled || !result.filePath) return { ok: false, canceled: true }

    try {
      const wfgPath = normalize(result.filePath)
      const title = stripWfgExtension(basename(wfgPath, '.wfg'))
      const cloned = cloneForIpc(input.content)
      const content: DiagramContent = {
        ...cloned,
        meta: { ...cloned.meta, title }
      }
      await exportContentWfg(content, wfgPath)

      const id = randomUUID()
      const now = new Date().toISOString()
      const sizeBytes = (await stat(wfgPath)).size
      this.db
        .prepare(
          `INSERT INTO diagram_files
           (id, folder_id, title, page_count, content_path, thumbnail_path, created_at, updated_at, deleted_at)
           VALUES (?, ?, ?, ?, ?, NULL, ?, ?, NULL)`
        )
        .run(id, input.folderId, title, content.pages.length, wfgPath, now, now)

      registerDiagramWfgPath(id, wfgPath, this.mediaDir)

      const record: DiagramFileRecord = {
        meta: {
          id,
          folderId: input.folderId,
          title,
          pageCount: content.pages.length,
          thumbnailPath: null,
          pinned: false,
          sizeBytes,
          createdAt: now,
          updatedAt: now,
          deletedAt: null
        },
        content: cloneForIpc(content)
      }
      return { ok: true, record, path: wfgPath }
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
        const row = this.getFileRow(input.fileId)
        if (!row) return { ok: false, error: '文件不存在' }
        await exportDiagramWfg(this.mediaDir, input.fileId, row.content_path, result.filePath)
      } else if (input.content) {
        await exportContentWfg(cloneForIpc(input.content), result.filePath)
      } else {
        return { ok: false, error: '缺少导出内容' }
      }
      return { ok: true, path: result.filePath }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return { ok: false, error: message }
    }
  }

  async renameFile(fileId: string, title: string): Promise<DiagramFileMeta | null> {
    const row = this.getFileRow(fileId)
    if (!row || row.deleted_at) return null
    const normalizedTitle = stripWfgExtension(title)
    const now = new Date().toISOString()
    this.db
      .prepare(`UPDATE diagram_files SET title = ?, updated_at = ? WHERE id = ?`)
      .run(normalizedTitle, now, fileId)
    const content = await readDiagramContent(this.mediaDir, fileId, row.content_path, row.title)
    if (content) {
      content.meta.title = normalizedTitle
      await writeDiagramContentPatch(this.mediaDir, fileId, row.content_path, content, {
        dirtyPageIds: [],
        metaDirty: true
      })
      if (!isExternalDiagramContentPath(row.content_path)) {
        const newContentPath = relativeContentPath(fileId, normalizedTitle)
        await renameDiagramWfgFile(
          this.mediaDir,
          fileId,
          row.content_path,
          normalizedTitle,
          newContentPath
        )
        this.db
          .prepare(`UPDATE diagram_files SET content_path = ? WHERE id = ?`)
          .run(newContentPath, fileId)
        registerDiagramWfgPath(fileId, newContentPath, this.mediaDir)
      }
    }
    return { ...mapFileRow(row, this.mediaDir), title: normalizedTitle, updatedAt: now }
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
    const previousFolder =
      row.folder_id !== DG_RECYCLE && row.folder_id !== DG_HOME ? row.folder_id : row.previous_folder_id
    this.db
      .prepare(
        `UPDATE diagram_files SET folder_id = ?, previous_folder_id = ?, deleted_at = ?, updated_at = ? WHERE id = ?`
      )
      .run(DG_RECYCLE, previousFolder, now, now, fileId)
    return true
  }

  restoreFile(fileId: string): DiagramFileMeta | null {
    const row = this.getFileRow(fileId)
    if (!row || !row.deleted_at) return null
    const targetFolder = this.resolveRestoreFolderId(row.previous_folder_id)
    const now = new Date().toISOString()
    this.db
      .prepare(
        `UPDATE diagram_files SET folder_id = ?, previous_folder_id = NULL, deleted_at = NULL, updated_at = ? WHERE id = ?`
      )
      .run(targetFolder, now, fileId)
    const updated = this.getFileRow(fileId)
    if (!updated) return null
    return mapFileRow(updated, this.mediaDir)
  }

  private resolveRestoreFolderId(previousFolderId: string | null): string {
    if (!previousFolderId || previousFolderId === DG_RECYCLE || previousFolderId === DG_HOME) {
      return DG_FILES
    }
    const folder = this.db
      .prepare(`SELECT id, deleted_at FROM diagram_folders WHERE id = ?`)
      .get(previousFolderId) as { id: string; deleted_at: string | null } | undefined
    if (!folder || folder.deleted_at) return DG_FILES
    return previousFolderId
  }

  purgeFile(fileId: string): boolean {
    const row = this.getFileRow(fileId)
    if (!row) return false
    this.db.prepare(`DELETE FROM diagram_files WHERE id = ?`).run(fileId)
    deleteDiagramContent(this.mediaDir, fileId, row.content_path)
    return true
  }

  private getFileRow(fileId: string) {
    return this.db
      .prepare(`SELECT ${FILE_SELECT_COLS} FROM diagram_files WHERE id = ?`)
      .get(fileId) as DiagramFileRow | undefined
  }
}

function stripWfgExtension(title: string): string {
  const trimmed = title.trim()
  if (!trimmed) return '未命名流程图'
  return /\.wfg$/i.test(trimmed) ? trimmed.slice(0, -4) : trimmed
}

/** 在同一分组内生成不重复的副本标题 */
function resolveUniqueDuplicateTitle(
  db: Database,
  folderId: string,
  sourceTitle: string
): string {
  const base = stripWfgExtension(sourceTitle)
  const rows = db
    .prepare(`SELECT title FROM diagram_files WHERE folder_id = ? AND deleted_at IS NULL`)
    .all(folderId) as Array<{ title: string }>
  const existing = new Set(rows.map((r) => stripWfgExtension(r.title).toLowerCase()))

  const suffix = ' 副本'
  const primary = `${base}${suffix}`
  if (!existing.has(primary.toLowerCase())) return primary

  let n = 2
  while (existing.has(`${base}${suffix} (${n})`.toLowerCase())) n++
  return `${base}${suffix} (${n})`
}

function mapFileRow(r: DiagramFileRow, mediaDir: string): DiagramFileMeta {
  return {
    id: r.id,
    folderId: r.folder_id,
    previousFolderId: r.previous_folder_id,
    title: r.title,
    pageCount: r.page_count,
    thumbnailPath: r.thumbnail_path,
    pinned: Boolean(r.pinned),
    sizeBytes: diagramContentSizeBytes(mediaDir, r.id, r.content_path),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    deletedAt: r.deleted_at
  }
}
