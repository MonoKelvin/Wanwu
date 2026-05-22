/**
 * 图鉴种子：catalog.json 入库、增量/全量同步、启动后台 seed。
 */
import { existsSync, readFileSync, statSync, writeFileSync } from 'fs'
import { join } from 'path'
import { randomUUID } from 'crypto'
import type Database from 'better-sqlite3'
import type { DatabaseService } from '../core/database'
import type { MediaAttribution } from '../../../src/shared/types/unsplash'
import { resolveLibraryMediaAbsolute } from '../media/library'
import {
  loadLibraryCategories,
  syncLibraryCategories,
  type LibraryCategoriesFile,
  type LibraryCategoryDef
} from './categories'
import { getLibraryCatalogPath, getLibrarySeedRoot } from './paths'

export type { LibraryCategoriesFile, LibraryCategoryDef } from './categories'
export { loadLibraryCategories } from './categories'

export const LIBRARY_CATALOG_SCHEMA = 3

export interface LibraryCatalogItem {
  /** 全库唯一稳定 id（种子配置必填，禁止入库时随机生成） */
  id: string
  slug: string
  categoryId: string
  subCategoryId: string
  name: string
  summary: string
  /** 已废弃：正文仅存 content.md，catalog 留空 */
  description?: string
  tags: string[]
  specs: Record<string, string>
  coverFile?: string
  galleryFiles?: string[]
  contentFile?: string
  coverAttribution?: MediaAttribution
  galleryAttributions?: MediaAttribution[]
  mediaProvider?: string
}

export interface LibraryCatalog {
  schema?: number
  version?: number
  mediaProvider?: string
  mediaConfigVersion?: number
  items: LibraryCatalogItem[]
}

export interface ImportLibraryProgress {
  stage: 'prepare-categories' | 'import-items' | 'cleanup-category'
  current: number
  total: number
  detail?: string
}

export interface ImportLibraryOptions {
  /** 从 catalog 仅新增尚未入库的 id（应用启动默认） */
  importNew?: boolean
  /** 按稳定 id 强制从 catalog 更新（可重复执行） */
  updateIds?: string[]
  /** 全量同步 catalog（开发恢复用，会删除 catalog 外条目） */
  full?: boolean
  /** 按 catalog 更新全部已入库条目的配图路径（cover + gallery） */
  syncAllMedia?: boolean
  /** 长任务进度（打包脚本等） */
  onProgress?: (progress: ImportLibraryProgress) => void
}

export interface ImportLibraryResult {
  imported: number
  skipped: number
  updated: number
}

function seedRoot(): string {
  return getLibrarySeedRoot()
}

const CATALOG_IMPORT_MARKER = '.library-catalog-import'

/** 与 catalog 内容/规模绑定的指纹；变更后才会重新扫描入库 */
export function getCatalogSeedToken(catalog: LibraryCatalog): string {
  return `schema:${catalog.schema ?? 0}:media:${catalog.mediaConfigVersion ?? 0}:n:${catalog.items.length}`
}

function catalogImportMarkerPath(basePath: string): string {
  return join(basePath, 'db', CATALOG_IMPORT_MARKER)
}

interface CatalogImportMarker {
  token: string
  mtimeMs: number
  size: number
  itemCount: number
}

function catalogJsonPath(): string {
  return getLibraryCatalogPath()
}

function itemCountFromToken(token: string): number {
  const m = /:n:(\d+)$/.exec(token)
  return m ? Number(m[1]) : 0
}

function readCatalogImportMarker(basePath: string): CatalogImportMarker | null {
  const path = catalogImportMarkerPath(basePath)
  if (!existsSync(path)) return null
  try {
    const lines = readFileSync(path, 'utf-8').trim().split('\n')
    const token = lines[0]?.trim()
    if (!token) return null
    const mtimeMs = Number(lines[1])
    const size = Number(lines[2])
    if (!Number.isFinite(mtimeMs) || !Number.isFinite(size)) return null
    return { token, mtimeMs, size, itemCount: itemCountFromToken(token) }
  } catch {
    return null
  }
}

export function writeCatalogImportMarker(basePath: string, catalog: LibraryCatalog): void {
  const catalogPath = catalogJsonPath()
  const stat = existsSync(catalogPath) ? statSync(catalogPath) : { mtimeMs: 0, size: 0 }
  const body = [
    getCatalogSeedToken(catalog),
    String(stat.mtimeMs),
    String(stat.size)
  ].join('\n')
  writeFileSync(catalogImportMarkerPath(basePath), body, 'utf-8')
}

/** catalog 未变更且曾完整入库时，无需再读 1.6MB JSON */
function tryFastSkipImportNew(dbService: DatabaseService): ImportLibraryResult | null {
  const catalogPath = catalogJsonPath()
  if (!existsSync(catalogPath)) return null
  const stat = statSync(catalogPath)
  const marker = readCatalogImportMarker(dbService.getBasePath())
  if (!marker) return null
  if (marker.mtimeMs !== stat.mtimeMs || marker.size !== stat.size) return null
  return { imported: 0, skipped: marker.itemCount, updated: 0 }
}

/** 各分类库已入库 id（每库一次 SELECT） */
export function collectExistingItemIds(dbService: DatabaseService): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>()
  for (const catId of dbService.listLibraryCategoryIds()) {
    const libDb = dbService.getLibraryDb(catId)
    if (!libDb) continue
    ensureItemColumns(libDb)
    const rows = libDb.prepare('SELECT id FROM items').all() as Array<{ id: string }>
    map.set(catId, new Set(rows.map((r) => r.id)))
  }
  return map
}

function prepareLibraryDbsForImport(
  dbService: DatabaseService,
  items: LibraryCatalogItem[],
  categoriesFile: LibraryCategoriesFile | null,
  onProgress?: (progress: ImportLibraryProgress) => void
): void {
  const categoryDefs = categoriesFile?.categories ?? []
  const catIds = [...new Set(items.map((i) => i.categoryId))]
  const total = catIds.length
  let current = 0
  for (const catId of catIds) {
    const libDb = dbService.getLibraryDb(catId)
    if (libDb) {
      ensureItemColumns(libDb)
      const catDef = categoryDefs.find((c) => c.id === catId)
      if (catDef) syncLibraryCategories(libDb, catDef)
    }
    current++
    onProgress?.({
      stage: 'prepare-categories',
      current,
      total,
      detail: catId
    })
  }
}

function ensureItemColumns(db: Database.Database): void {
  const cols = db.prepare('PRAGMA table_info(items)').all() as Array<{ name: string }>
  const names = new Set(cols.map((c) => c.name))
  if (!names.has('slug')) db.exec('ALTER TABLE items ADD COLUMN slug TEXT')
  if (!names.has('specs')) db.exec('ALTER TABLE items ADD COLUMN specs TEXT')
  if (!names.has('cover_attribution')) db.exec('ALTER TABLE items ADD COLUMN cover_attribution TEXT')
  if (!names.has('content_file')) db.exec('ALTER TABLE items ADD COLUMN content_file TEXT')
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_items_slug ON items(slug) WHERE slug IS NOT NULL')
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_items_id ON items(id)')

  const mediaCols = db.prepare('PRAGMA table_info(item_media)').all() as Array<{ name: string }>
  if (!mediaCols.some((c) => c.name === 'attribution')) {
    db.exec('ALTER TABLE item_media ADD COLUMN attribution TEXT')
  }
}

type UpsertMode = 'insert-only' | 'update' | 'upsert'

function upsertItem(
  db: Database.Database,
  item: LibraryCatalogItem,
  mode: UpsertMode
): 'insert' | 'update' | 'skip' {
  if (!item.id) {
    throw new Error(`条目 ${item.slug} 缺少稳定 id，请检查 assets/seed/library 配置`)
  }

  const cover = item.coverFile?.replace(/\\/g, '/') ?? null
  const contentFile = item.contentFile?.replace(/\\/g, '/') ?? null
  const coverAttributionJson = item.coverAttribution
    ? JSON.stringify(item.coverAttribution)
    : null
  const now = new Date().toISOString()
  const specsJson = JSON.stringify(item.specs ?? {})

  const existingById = db.prepare('SELECT id FROM items WHERE id = ?').get(item.id) as
    | { id: string }
    | undefined
  const existingBySlug = item.slug
    ? (db.prepare('SELECT id FROM items WHERE slug = ?').get(item.slug) as { id: string } | undefined)
    : undefined

  if (mode === 'insert-only') {
    if (existingById) return 'skip'
    if (existingBySlug && existingBySlug.id !== item.id) return 'skip'
  }

  if (existingById) {
    db.prepare(
      `UPDATE items SET category_id = ?, sub_category_id = ?, slug = ?, name = ?, summary = ?, description = ?,
       tags = ?, cover_path = ?, cover_attribution = ?, content_file = ?, specs = ?, updated_at = ? WHERE id = ?`
    ).run(
      item.categoryId,
      item.subCategoryId,
      item.slug,
      item.name,
      item.summary,
      null,
      JSON.stringify(item.tags),
      cover,
      coverAttributionJson,
      contentFile,
      specsJson,
      now,
      item.id
    )
    syncMedia(db, item.id, item)
    return mode === 'insert-only' ? 'skip' : 'update'
  }

  if (existingBySlug) {
    if (mode === 'insert-only') return 'skip'
    db.prepare(
      `UPDATE items SET category_id = ?, sub_category_id = ?, slug = ?, name = ?, summary = ?, description = ?,
       tags = ?, cover_path = ?, cover_attribution = ?, content_file = ?, specs = ?, updated_at = ? WHERE id = ?`
    ).run(
      item.categoryId,
      item.subCategoryId,
      item.slug,
      item.name,
      item.summary,
      null,
      JSON.stringify(item.tags),
      cover,
      coverAttributionJson,
      contentFile,
      specsJson,
      now,
      existingBySlug.id
    )
    syncMedia(db, existingBySlug.id, item)
    return 'update'
  }

  if (mode === 'update') return 'skip'

  db.prepare(
    `INSERT INTO items (id, category_id, sub_category_id, slug, name, summary, description, tags, cover_path, cover_attribution, content_file, specs, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    item.id,
    item.categoryId,
    item.subCategoryId,
    item.slug,
    item.name,
    item.summary,
    null,
    JSON.stringify(item.tags),
    cover,
    coverAttributionJson,
    contentFile,
    specsJson,
    now,
    now
  )
  syncMedia(db, item.id, item)
  return 'insert'
}

/** 仅同步已入库条目的 cover / gallery（按 id 或 slug 匹配，避免 slug 唯一约束冲突） */
function syncItemMediaFromCatalog(
  db: Database.Database,
  item: LibraryCatalogItem
): 'update' | 'skip' {
  const row = db
    .prepare('SELECT id FROM items WHERE id = ? OR slug = ? LIMIT 1')
    .get(item.id, item.slug) as { id: string } | undefined
  if (!row) return 'skip'

  const cover = item.coverFile?.replace(/\\/g, '/') ?? null
  const coverAttributionJson = item.coverAttribution
    ? JSON.stringify(item.coverAttribution)
    : null
  const now = new Date().toISOString()

  db.prepare(
    `UPDATE items SET cover_path = ?, cover_attribution = ?, updated_at = ? WHERE id = ?`
  ).run(cover, coverAttributionJson, now, row.id)
  syncMedia(db, row.id, item)
  return 'update'
}

function syncMedia(db: Database.Database, itemId: string, item: LibraryCatalogItem): void {
  db.prepare('DELETE FROM item_media WHERE item_id = ?').run(itemId)
  const files = item.galleryFiles ?? []
  const attrs = item.galleryAttributions ?? []
  const insert = db.prepare(
    'INSERT INTO item_media (id, item_id, path, sort_order, attribution) VALUES (?, ?, ?, ?, ?)'
  )
  files.forEach((file, i) => {
    const attr = attrs[i]
    insert.run(randomUUID(), itemId, file, i, attr ? JSON.stringify(attr) : null)
  })
}

function importItems(
  dbService: DatabaseService,
  items: LibraryCatalogItem[],
  mode: UpsertMode,
  categoriesFile: LibraryCategoriesFile | null,
  onProgress?: (progress: ImportLibraryProgress) => void
): ImportLibraryResult {
  let imported = 0
  let skipped = 0
  let updated = 0
  const cleaned = new Set<string>()
  const total = items.length

  if (items.length > 0) {
    prepareLibraryDbsForImport(dbService, items, categoriesFile, onProgress)
  }

  for (let index = 0; index < items.length; index++) {
    const item = items[index]!
    const libDb = dbService.getLibraryDb(item.categoryId)
    if (!libDb) continue

    if (mode === 'upsert' && !cleaned.has(item.categoryId)) {
      onProgress?.({
        stage: 'cleanup-category',
        current: cleaned.size + 1,
        total: new Set(items.map((i) => i.categoryId)).size,
        detail: item.categoryId
      })
      const validIds = new Set(
        items.filter((i) => i.categoryId === item.categoryId).map((i) => i.id)
      )
      libDb.prepare("DELETE FROM items WHERE slug IS NULL OR slug = ''").run()
      libDb.prepare(`DELETE FROM items WHERE cover_path LIKE '%.svg'`).run()
      const rows = libDb.prepare('SELECT id, slug FROM items').all() as Array<{
        id: string
        slug: string | null
      }>
      for (const row of rows) {
        if (!validIds.has(row.id)) {
          libDb.prepare('DELETE FROM item_media WHERE item_id = ?').run(row.id)
          libDb.prepare('DELETE FROM items WHERE id = ?').run(row.id)
        }
      }
      cleaned.add(item.categoryId)
    }

    const result = upsertItem(libDb, item, mode)
    if (result === 'insert') imported++
    else if (result === 'update') updated++
    else skipped++

    const n = index + 1
    if (n === total || n % 25 === 0 || n % Math.max(1, Math.floor(total / 100)) === 0) {
      onProgress?.({
        stage: 'import-items',
        current: n,
        total,
        detail: item.slug
      })
    }
  }

  return { imported, skipped, updated }
}

export function loadLibraryCatalog(): LibraryCatalog | null {
  const path = catalogJsonPath()
  if (!existsSync(path)) return null
  return JSON.parse(readFileSync(path, 'utf-8')) as LibraryCatalog
}

function importCatalogItems(
  dbService: DatabaseService,
  items: LibraryCatalogItem[],
  mode: UpsertMode,
  onProgress?: (progress: ImportLibraryProgress) => void
): ImportLibraryResult {
  return importItems(dbService, items, mode, loadLibraryCategories(), onProgress)
}

export function syncLibraryMediaFromCatalog(dbService: DatabaseService): ImportLibraryResult {
  const catalog = loadLibraryCatalog()
  if (!catalog?.items?.length) return { imported: 0, skipped: 0, updated: 0 }

  prepareLibraryDbsForImport(dbService, catalog.items, loadLibraryCategories())

  let updated = 0
  let skipped = 0
  for (const item of catalog.items) {
    const libDb = dbService.getLibraryDb(item.categoryId)
    if (!libDb) continue
    if (syncItemMediaFromCatalog(libDb, item) === 'update') updated++
    else skipped++
  }
  return { imported: 0, skipped, updated }
}

export function importLibraryCatalog(
  dbService: DatabaseService,
  options: ImportLibraryOptions = {}
): ImportLibraryResult {
  if (options.importNew) {
    const fast = tryFastSkipImportNew(dbService)
    if (fast) return fast
  }

  const catalog = loadLibraryCatalog()
  if (!catalog?.items?.length) return { imported: 0, skipped: 0, updated: 0 }

  if (options.full) {
    const result = importCatalogItems(dbService, catalog.items, 'upsert', options.onProgress)
    writeCatalogImportMarker(dbService.getBasePath(), catalog)
    return result
  }

  if (options.syncAllMedia) {
    return syncLibraryMediaFromCatalog(dbService)
  }

  if (options.updateIds?.length) {
    const byId = new Map(catalog.items.map((i) => [i.id, i]))
    const targets = options.updateIds
      .map((id) => byId.get(id))
      .filter((i): i is LibraryCatalogItem => Boolean(i))
    if (targets.length !== options.updateIds.length) {
      const missing = options.updateIds.filter((id) => !byId.has(id))
      console.warn('[librarySeed] catalog 中未找到 id:', missing.join(', '))
    }
    return importCatalogItems(dbService, targets, 'update')
  }

  if (options.importNew) {
    const basePath = dbService.getBasePath()
    const existing = collectExistingItemIds(dbService)
    const toImport = catalog.items.filter((item) => !existing.get(item.categoryId)?.has(item.id))

    if (toImport.length === 0) {
      writeCatalogImportMarker(basePath, catalog)
      return { imported: 0, skipped: catalog.items.length, updated: 0 }
    }

    const result = importCatalogItems(dbService, toImport, 'insert-only')
    const skipped = catalog.items.length - result.imported
    if (result.imported === toImport.length) {
      writeCatalogImportMarker(basePath, catalog)
    }
    return { imported: result.imported, skipped, updated: result.updated }
  }

  return { imported: 0, skipped: 0, updated: 0 }
}

/** 应用启动：后台增量入库 + 配图同步（不阻塞窗口） */
export function runStartupLibrarySeed(dbService: DatabaseService): void {
  const t0 = Date.now()
  try {
    const seedResult = importLibraryCatalog(dbService, { importNew: true })
    if (seedResult.imported > 0) {
      console.log(
        `[librarySeed] imported ${seedResult.imported} items (skipped ${seedResult.skipped}) in ${Date.now() - t0}ms`
      )
    }
    syncLibraryMediaFromCatalogIfNeeded(dbService)
  } catch (err) {
    console.error('[librarySeed] background seed failed', err)
  }
}

function syncLibraryMediaFromCatalogIfNeeded(dbService: DatabaseService): void {
  const catalog = loadLibraryCatalog()
  if (!catalog?.items?.length) return

  const basePath = dbService.getBasePath()
  const marker = join(basePath, 'db', '.library-media-sync')
  const token = `v${catalog.schema ?? 0}-${catalog.mediaConfigVersion ?? 0}`
  let last = ''
  if (existsSync(marker)) {
    try {
      last = readFileSync(marker, 'utf-8').trim()
    } catch {
      last = ''
    }
  }
  if (last === token) return

  const t0 = Date.now()
  const result = syncLibraryMediaFromCatalog(dbService)
  writeFileSync(marker, token, 'utf-8')
  if (result.updated > 0) {
    console.log(
      `[librarySeed] synced media paths for ${result.updated} items in ${Date.now() - t0}ms`
    )
  }
}
