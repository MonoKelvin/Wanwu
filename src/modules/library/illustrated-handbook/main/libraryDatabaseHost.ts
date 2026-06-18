import Database from 'better-sqlite3'
import { existsSync, mkdirSync, readdirSync } from 'fs'
import {
  ensureWanwuDataLayout,
  getWanwuPathLayout
} from '../../../../../electron/services/data/paths'
import { libraryCategoryDbFile } from './handbookPaths'
import type { WanwuPathLayout } from '@shared/lib/wanwuPaths'
import { LIBRARY_CATEGORIES, loadLibraryCategories } from './service/categories'
import { ensureLibraryItemColumns } from './service/itemSchema'

/** 图鉴分类 SQLite 连接池（按 categoryId 懒加载） */
export class LibraryDatabaseHost {
  private readonly layout: WanwuPathLayout
  private libraryDbs = new Map<string, Database.Database>()

  constructor(basePath?: string) {
    const root = ensureWanwuDataLayout(basePath)
    this.layout = getWanwuPathLayout(root)
  }

  getBasePath(): string {
    return this.layout.root
  }

  listLibraryCategoryIds(): string[] {
    const dbDir = this.layout.db
    if (!existsSync(dbDir)) return []
    return readdirSync(dbDir)
      .filter((f) => f.startsWith('library_') && f.endsWith('.sqlite'))
      .map((f) => f.slice('library_'.length, -'.sqlite'.length))
      .filter((id) => id.length > 0)
  }

  closeAllLibraryDbs(): void {
    this.libraryDbs.forEach((db) => db.close())
    this.libraryDbs.clear()
  }

  getLibraryDb(categoryId: string): Database.Database | undefined {
    return this.openLibraryDbIfExists(categoryId)
  }

  createLibraryDbForImport(categoryId: string, categoryName?: string): Database.Database {
    const dbPath = libraryCategoryDbFile(this.layout, categoryId)
    if (!existsSync(dbPath)) {
      mkdirSync(this.layout.db, { recursive: true })
    }
    let db = this.libraryDbs.get(categoryId)
    if (!db) {
      db = this.openLibraryDb(categoryId, categoryName ?? categoryId)
      this.libraryDbs.set(categoryId, db)
    }
    return db
  }

  private openLibraryDb(categoryId: string, categoryName: string): Database.Database {
    const dbPath = libraryCategoryDbFile(this.layout, categoryId)
    const db = new Database(dbPath)
    db.exec(`
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        parent_id TEXT,
        sort_order INTEGER DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS items (
        id TEXT PRIMARY KEY,
        category_id TEXT NOT NULL,
        sub_category_id TEXT,
        name TEXT NOT NULL,
        summary TEXT,
        description TEXT,
        tags TEXT,
        cover_path TEXT,
        cover_attribution TEXT,
        created_at TEXT,
        updated_at TEXT
      );
      CREATE TABLE IF NOT EXISTS item_media (
        id TEXT PRIMARY KEY,
        item_id TEXT NOT NULL,
        path TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0,
        attribution TEXT
      );
    `)
    const root = db.prepare('SELECT id FROM categories WHERE parent_id IS NULL LIMIT 1').get()
    if (!root) {
      const rootId = categoryId
      db.prepare('INSERT INTO categories (id, name, parent_id, sort_order) VALUES (?, ?, NULL, 0)').run(
        rootId,
        categoryName
      )
      const def = loadLibraryCategories()?.categories.find((c) => c.id === categoryId)
      if (def) {
        def.subcategories.forEach((sub, i) => {
          db.prepare(
            'INSERT INTO categories (id, name, parent_id, sort_order) VALUES (?, ?, ?, ?)'
          ).run(sub.id, sub.name, rootId, i)
        })
      }
    }
    ensureLibraryItemColumns(db)
    return db
  }

  private openLibraryDbIfExists(categoryId: string): Database.Database | undefined {
    const dbPath = libraryCategoryDbFile(this.layout, categoryId)
    if (!existsSync(dbPath)) return undefined
    let db = this.libraryDbs.get(categoryId)
    if (!db) {
      const meta = LIBRARY_CATEGORIES.find((c) => c.id === categoryId)
      db = this.openLibraryDb(categoryId, meta?.name ?? categoryId)
      this.libraryDbs.set(categoryId, db)
    }
    return db
  }
}

export { LIBRARY_CATEGORIES, loadLibraryCategories } from './service/categories'
