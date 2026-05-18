import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { randomUUID } from 'crypto'
import type Database from 'better-sqlite3'
import type { DatabaseService } from './database'
import type { MediaAttribution } from '../../src/shared/types/unsplash'

export const LIBRARY_CATALOG_VERSION = 7

export interface LibraryCatalogItem {
  slug: string
  categoryId: string
  subCategoryId: string
  name: string
  summary: string
  description: string
  tags: string[]
  specs: Record<string, string>
  /** 封面文件是否已放入 assets/library/... */
  coverFile?: string
  galleryFiles?: string[]
  coverAttribution?: MediaAttribution
  galleryAttributions?: MediaAttribution[]
  /** 本条目的配图来源（覆盖 catalog.mediaProvider） */
  mediaProvider?: string
}

export interface LibraryCatalog {
  version: number
  /** 默认配图来源：pixabay | unsplash | manual */
  mediaProvider?: string
  mediaConfigVersion?: number
  items: LibraryCatalogItem[]
}

function ensureItemColumns(db: Database.Database): void {
  const cols = db.prepare('PRAGMA table_info(items)').all() as Array<{ name: string }>
  const names = new Set(cols.map((c) => c.name))
  if (!names.has('slug')) db.exec('ALTER TABLE items ADD COLUMN slug TEXT')
  if (!names.has('specs')) db.exec('ALTER TABLE items ADD COLUMN specs TEXT')
  if (!names.has('cover_attribution')) db.exec('ALTER TABLE items ADD COLUMN cover_attribution TEXT')
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_items_slug ON items(slug) WHERE slug IS NOT NULL')

  const mediaCols = db.prepare('PRAGMA table_info(item_media)').all() as Array<{ name: string }>
  if (!mediaCols.some((c) => c.name === 'attribution')) {
    db.exec('ALTER TABLE item_media ADD COLUMN attribution TEXT')
  }
}

function upsertItem(db: Database.Database, item: LibraryCatalogItem): string {
  const cover = item.coverFile?.replace(/\\/g, '/') ?? null
  const coverAttributionJson = item.coverAttribution
    ? JSON.stringify(item.coverAttribution)
    : null

  const existing = db.prepare('SELECT id FROM items WHERE slug = ?').get(item.slug) as
    | { id: string }
    | undefined
  const now = new Date().toISOString()
  const specsJson = JSON.stringify(item.specs ?? {})

  if (existing) {
    db.prepare(
      `UPDATE items SET category_id = ?, sub_category_id = ?, name = ?, summary = ?, description = ?,
       tags = ?, cover_path = ?, cover_attribution = ?, specs = ?, updated_at = ? WHERE id = ?`
    ).run(
      item.categoryId,
      item.subCategoryId,
      item.name,
      item.summary,
      item.description,
      JSON.stringify(item.tags),
      cover,
      coverAttributionJson,
      specsJson,
      now,
      existing.id
    )
    syncMedia(db, existing.id, item)
    return existing.id
  }

  const id = randomUUID()
  db.prepare(
    `INSERT INTO items (id, category_id, sub_category_id, slug, name, summary, description, tags, cover_path, cover_attribution, specs, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    item.categoryId,
    item.subCategoryId,
    item.slug,
    item.name,
    item.summary,
    item.description,
    JSON.stringify(item.tags),
    cover,
    coverAttributionJson,
    specsJson,
    now,
    now
  )
  syncMedia(db, id, item)
  return id
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

export interface LibraryCategoryDef {
  id: string
  name: string
  icon: string
  subcategories: Array<{ id: string; name: string }>
}

export interface LibraryCategoriesFile {
  version: number
  categories: LibraryCategoryDef[]
}

export function loadLibraryCategories(): LibraryCategoriesFile | null {
  const path = join(process.cwd(), 'assets', 'seed', 'library', 'categories.json')
  if (!existsSync(path)) return null
  return JSON.parse(readFileSync(path, 'utf-8')) as LibraryCategoriesFile
}

export function syncLibraryCategories(
  db: Database.Database,
  def: LibraryCategoryDef
): void {
  const rootId = def.id
  db.prepare(
    `INSERT INTO categories (id, name, parent_id, sort_order) VALUES (?, ?, NULL, 0)
     ON CONFLICT(id) DO UPDATE SET name = excluded.name`
  ).run(rootId, def.name)

  const existingSubs = db
    .prepare('SELECT id FROM categories WHERE parent_id = ?')
    .all(rootId) as Array<{ id: string }>
  const newIds = new Set(def.subcategories.map((s) => s.id))

  for (const sub of existingSubs) {
    if (!newIds.has(sub.id)) {
      db.prepare('DELETE FROM categories WHERE id = ?').run(sub.id)
    }
  }

  def.subcategories.forEach((sub, i) => {
    db.prepare(
      `INSERT INTO categories (id, name, parent_id, sort_order) VALUES (?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         parent_id = excluded.parent_id,
         sort_order = excluded.sort_order`
    ).run(sub.id, sub.name, rootId, i)
  })
}

export function loadLibraryCatalog(): LibraryCatalog | null {
  const path = join(process.cwd(), 'assets', 'seed', 'library', 'catalog.json')
  if (!existsSync(path)) return null
  return JSON.parse(readFileSync(path, 'utf-8')) as LibraryCatalog
}

export function importLibraryCatalog(dbService: DatabaseService): { imported: number } {
  const catalog = loadLibraryCatalog()
  if (!catalog?.items?.length) return { imported: 0 }

  const categoriesFile = loadLibraryCategories()
  const categoryDefs = categoriesFile?.categories ?? []
  const validSlugs = new Set(catalog.items.map((i) => i.slug))

  let imported = 0
  const cleaned = new Set<string>()
  for (const item of catalog.items) {
    const libDb = dbService.getLibraryDb(item.categoryId)
    if (!libDb) continue
    ensureItemColumns(libDb)

    const catDef = categoryDefs.find((c) => c.id === item.categoryId)
    if (catDef) syncLibraryCategories(libDb, catDef)

    if (!cleaned.has(item.categoryId)) {
      libDb.prepare("DELETE FROM items WHERE slug IS NULL OR slug = ''").run()
      libDb.prepare(`DELETE FROM items WHERE cover_path LIKE '%.svg'`).run()
      const rows = libDb.prepare('SELECT id, slug FROM items').all() as Array<{
        id: string
        slug: string | null
      }>
      for (const row of rows) {
        if (row.slug && !validSlugs.has(row.slug)) {
          libDb.prepare('DELETE FROM item_media WHERE item_id = ?').run(row.id)
          libDb.prepare('DELETE FROM items WHERE id = ?').run(row.id)
        }
      }
      cleaned.add(item.categoryId)
    }
    upsertItem(libDb, item)
    imported += 1
  }
  return { imported }
}
