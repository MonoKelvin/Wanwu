import Database from 'better-sqlite3'
import { existsSync, mkdirSync, readFileSync } from 'fs'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { seedDefaultRssFeeds } from './rssFeeds'

const LIBRARY_CATEGORIES = [
  { id: 'cat', name: '猫', icon: 'pi pi-heart' },
  { id: 'dog', name: '狗', icon: 'pi pi-heart-fill' },
  { id: 'supercar', name: '超跑', icon: 'pi pi-car' },
  { id: 'illustration', name: '立绘', icon: 'pi pi-image' },
  { id: 'ui-design', name: 'UI设计', icon: 'pi pi-palette' },
  { id: 'plant', name: '植物', icon: 'pi pi-sun' },
  { id: 'motorcycle', name: '摩托', icon: 'pi pi-compass' },
  { id: 'interior', name: '家装设计', icon: 'pi pi-home' },
  { id: 'industrial', name: '工业设计', icon: 'pi pi-box' },
  { id: 'transformers', name: '变形金刚', icon: 'pi pi-star' },
  { id: 'superhero-anime', name: '超级英雄动漫', icon: 'pi pi-bolt' },
  { id: 'anime', name: '日漫', icon: 'pi pi-sparkles' },
  { id: 'history', name: '历史', icon: 'pi pi-book' },
  { id: 'movie', name: '电影', icon: 'pi pi-video' }
]

export class DatabaseService {
  private userDb: Database.Database
  private customDb: Database.Database
  private rssDb: Database.Database
  private libraryDbs = new Map<string, Database.Database>()

  constructor(private readonly basePath: string) {
    mkdirSync(join(basePath, 'db'), { recursive: true })
    mkdirSync(join(basePath, 'media'), { recursive: true })
    mkdirSync(join(basePath, 'cache'), { recursive: true })

    this.userDb = new Database(join(basePath, 'db', 'user.sqlite'))
    this.customDb = new Database(join(basePath, 'db', 'custom.sqlite'))
    this.rssDb = new Database(join(basePath, 'db', 'rss.sqlite'))
  }

  async init(): Promise<void> {
    this.initUserSchema()
    this.initCustomSchema()
    this.initRssSchema()
    for (const cat of LIBRARY_CATEGORIES) {
      this.initLibraryDb(cat.id, cat.name)
    }
    this.seedIfEmpty()
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

  private initCustomSchema(): void {
    this.customDb.exec(`
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
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
        created_at TEXT,
        updated_at TEXT
      );
      CREATE TABLE IF NOT EXISTS custom_field_defs (
        id TEXT PRIMARY KEY,
        category_id TEXT NOT NULL,
        type TEXT NOT NULL,
        label TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0,
        config TEXT
      );
      CREATE TABLE IF NOT EXISTS custom_field_values (
        id TEXT PRIMARY KEY,
        item_id TEXT NOT NULL,
        field_id TEXT NOT NULL,
        value_text TEXT
      );
    `)
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
        created_at TEXT,
        updated_at TEXT
      );
      CREATE TABLE IF NOT EXISTS item_media (
        id TEXT PRIMARY KEY,
        item_id TEXT NOT NULL,
        path TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0
      );
    `)
    const root = db.prepare('SELECT id FROM categories WHERE parent_id IS NULL LIMIT 1').get()
    if (!root) {
      const rootId = categoryId
      db.prepare('INSERT INTO categories (id, name, parent_id, sort_order) VALUES (?, ?, NULL, 0)').run(
        rootId,
        categoryName
      )
      const subs = this.defaultSubCategories(categoryId)
      subs.forEach((name, i) => {
        db.prepare(
          'INSERT INTO categories (id, name, parent_id, sort_order) VALUES (?, ?, ?, ?)'
        ).run(`${categoryId}-${i}`, name, rootId, i)
      })
    }
    this.libraryDbs.set(categoryId, db)
  }

  private defaultSubCategories(categoryId: string): string[] {
    const map: Record<string, string[]> = {
      cat: ['品种', '习性', '护理'],
      dog: ['品种', '训练', '健康'],
      supercar: ['品牌', '车型', '赛事'],
      plant: ['观叶', '花卉', '多肉'],
      movie: ['华语', '欧美', '动画']
    }
    return map[categoryId] ?? ['概览', '精选', '更多']
  }

  private seedIfEmpty(): void {
    const seedPath = join(process.cwd(), 'assets', 'seed', 'sample-items.json')
    if (!existsSync(seedPath)) return
    const seeds = JSON.parse(readFileSync(seedPath, 'utf-8')) as Array<{
      categoryId: string
      subCategoryId: string
      name: string
      summary: string
      description: string
      tags: string[]
    }>
    for (const s of seeds) {
      const db = this.libraryDbs.get(s.categoryId)
      if (!db) continue
      const exists = db.prepare('SELECT id FROM items WHERE name = ?').get(s.name)
      if (exists) continue
      const id = randomUUID()
      const now = new Date().toISOString()
      db.prepare(
        `INSERT INTO items (id, category_id, sub_category_id, name, summary, description, tags, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        id,
        s.categoryId,
        s.subCategoryId,
        s.name,
        s.summary,
        s.description,
        JSON.stringify(s.tags),
        now,
        now
      )
    }
  }

  getLibraryDb(categoryId: string): Database.Database | undefined {
    return this.libraryDbs.get(categoryId)
  }

  getRssDb(): Database.Database {
    return this.rssDb
  }

  getCustomDb(): Database.Database {
    return this.customDb
  }

  listCustomCategories(): Array<{ id: string; name: string; parentId: string | null }> {
    return this.customDb
      .prepare('SELECT id, name, parent_id as parentId FROM categories ORDER BY sort_order')
      .all() as Array<{ id: string; name: string; parentId: string | null }>
  }

  listCustomItems(categoryId: string): unknown[] {
    return this.customDb
      .prepare(
        `SELECT id, category_id as categoryId, sub_category_id as subCategoryId,
                name, summary, description, tags, cover_path as coverPath,
                created_at as createdAt, updated_at as updatedAt
         FROM items WHERE category_id = ? ORDER BY updated_at DESC`
      )
      .all(categoryId)
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
    this.customDb.close()
    this.rssDb.close()
    for (const db of this.libraryDbs.values()) db.close()
  }
}

export { LIBRARY_CATEGORIES }
