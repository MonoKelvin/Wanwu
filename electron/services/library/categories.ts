import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import type Database from 'better-sqlite3'
import { getLibrarySeedRoot } from './paths'

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

/** 图鉴顶部分类元数据（与 categories.json 同步） */
export interface LibraryCategoryMeta {
  id: string
  name: string
  icon: string
}

const FALLBACK_CATEGORIES: LibraryCategoryMeta[] = [
  { id: 'cat', name: '猫', icon: 'heart' },
  { id: 'dog', name: '狗', icon: 'heart' }
]

export function loadLibraryCategories(): LibraryCategoriesFile | null {
  const path = join(getLibrarySeedRoot(), 'categories.json')
  if (!existsSync(path)) return null
  return JSON.parse(readFileSync(path, 'utf-8')) as LibraryCategoriesFile
}

export function loadLibraryCategoryMeta(): LibraryCategoryMeta[] {
  const file = loadLibraryCategories()
  if (file?.categories?.length) {
    return file.categories.map((c) => ({ id: c.id, name: c.name, icon: c.icon }))
  }
  return FALLBACK_CATEGORIES
}

export const LIBRARY_CATEGORIES = loadLibraryCategoryMeta()

/** 将 categories.json 中的子分类同步到分类库 SQLite */
export function syncLibraryCategories(db: Database.Database, def: LibraryCategoryDef): void {
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
