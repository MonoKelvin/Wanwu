import Database from 'better-sqlite3'
import { mkdirSync } from 'fs'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { seedDefaultRssFeeds } from './rssFeeds'
import { importLibraryCatalog, loadLibraryCategories } from './librarySeed'

function loadLibraryCategoriesMeta(): Array<{ id: string; name: string; icon: string }> {
  const file = loadLibraryCategories()
  if (file?.categories?.length) {
    return file.categories.map((c) => ({ id: c.id, name: c.name, icon: c.icon }))
  }
  return [
    { id: 'cat', name: '猫', icon: 'heart' },
    { id: 'dog', name: '狗', icon: 'heart' }
  ]
}

const LIBRARY_CATEGORIES = loadLibraryCategoriesMeta()

export class DatabaseService {
  private userDb: Database.Database
  private rssDb: Database.Database
  private libraryDbs = new Map<string, Database.Database>()

  constructor(private readonly basePath: string) {
    mkdirSync(join(basePath, 'db'), { recursive: true })
    mkdirSync(join(basePath, 'media'), { recursive: true })
    mkdirSync(join(basePath, 'cache'), { recursive: true })

    this.userDb = new Database(join(basePath, 'db', 'user.sqlite'))
    this.rssDb = new Database(join(basePath, 'db', 'rss.sqlite'))
  }

  async init(): Promise<void> {
    this.initUserSchema()
    this.initRssSchema()
    for (const cat of LIBRARY_CATEGORIES) {
      this.initLibraryDb(cat.id, cat.name)
    }
    importLibraryCatalog(this)
  }

  private initUserSchema(): void {
    this.userDb.exec(`
      CREATE TABLE IF NOT EXISTS profiles (
        id TEXT PRIMARY KEY,
        nickname TEXT,
        bio TEXT,
        avatar_path TEXT,
        updated_at TEXT
      );
      CREATE TABLE IF NOT EXISTS favorites (
        id TEXT PRIMARY KEY,
        item_id TEXT NOT NULL,
        source TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS history (
        id TEXT PRIMARY KEY,
        item_id TEXT NOT NULL,
        source TEXT NOT NULL,
        viewed_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS app_settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        json TEXT NOT NULL
      );
    `)
    const row = this.userDb.prepare('SELECT id FROM profiles LIMIT 1').get()
    if (!row) {
      this.userDb
        .prepare('INSERT INTO profiles (id, nickname, bio, updated_at) VALUES (?, ?, ?, ?)')
        .run(randomUUID(), '万物探索者', '记录世间万物', new Date().toISOString())
    }
    const settingsRow = this.userDb.prepare('SELECT id FROM app_settings WHERE id = 1').get()
    if (!settingsRow) {
      this.userDb
        .prepare('INSERT INTO app_settings (id, json) VALUES (1, ?)')
        .run(
          JSON.stringify({
            navAlign: 'start',
            navDisplay: 'icon',
            rssFetchLimit: 20
          })
        )
    }
  }

  getAppSettings(): { navAlign: string; navDisplay: string } {
    const row = this.userDb.prepare('SELECT json FROM app_settings WHERE id = 1').get() as
      | { json: string }
      | undefined
    if (!row) {
      return { navAlign: 'start', navDisplay: 'icon' }
    }
    try {
      return JSON.parse(row.json) as { navAlign: string; navDisplay: string }
    } catch {
      return { navAlign: 'start', navDisplay: 'icon' }
    }
  }

  updateAppSettings(settings: { navAlign: string; navDisplay: string }): void {
    this.userDb
      .prepare(
        `INSERT INTO app_settings (id, json) VALUES (1, ?)
         ON CONFLICT(id) DO UPDATE SET json = excluded.json`
      )
      .run(JSON.stringify(settings))
  }

  private initRssSchema(): void {
    this.rssDb.exec(`
      CREATE TABLE IF NOT EXISTS rss_feeds (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        url TEXT NOT NULL,
        refresh_interval INTEGER DEFAULT 1800,
        last_fetched_at TEXT,
        enabled INTEGER DEFAULT 1,
        is_default INTEGER DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS rss_entries (
        id TEXT PRIMARY KEY,
        feed_id TEXT NOT NULL,
        guid TEXT,
        title TEXT,
        summary TEXT,
        link TEXT,
        published_at TEXT,
        raw TEXT
      );
    `)
    seedDefaultRssFeeds(this.rssDb)
  }

  private initLibraryDb(categoryId: string, categoryName: string): void {
    const dbPath = join(this.basePath, 'db', `library_${categoryId}.sqlite`)
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
    this.libraryDbs.set(categoryId, db)
  }

  getLibraryDb(categoryId: string): Database.Database | undefined {
    return this.libraryDbs.get(categoryId)
  }

  getRssDb(): Database.Database {
    return this.rssDb
  }

  getProfile(): { nickname: string; bio: string } | null {
    const row = this.userDb.prepare('SELECT nickname, bio FROM profiles LIMIT 1').get() as
      | { nickname: string; bio: string }
      | undefined
    return row ?? null
  }

  updateProfile(profile: { nickname: string; bio: string }): void {
    this.userDb
      .prepare('UPDATE profiles SET nickname = ?, bio = ?, updated_at = ? WHERE id = (SELECT id FROM profiles LIMIT 1)')
      .run(profile.nickname, profile.bio, new Date().toISOString())
  }

  listFavorites(): unknown[] {
    return this.userDb.prepare('SELECT * FROM favorites ORDER BY created_at DESC').all()
  }

  toggleFavorite(itemId: string, source: string): boolean {
    const existing = this.userDb
      .prepare('SELECT id FROM favorites WHERE item_id = ? AND source = ?')
      .get(itemId, source) as { id: string } | undefined
    if (existing) {
      this.userDb.prepare('DELETE FROM favorites WHERE id = ?').run(existing.id)
      return false
    }
    this.userDb
      .prepare('INSERT INTO favorites (id, item_id, source, created_at) VALUES (?, ?, ?, ?)')
      .run(randomUUID(), itemId, source, new Date().toISOString())
    return true
  }

  close(): void {
    this.userDb.close()
    this.rssDb.close()
    this.libraryDbs.forEach((db) => db.close())
  }
}

export { LIBRARY_CATEGORIES }
