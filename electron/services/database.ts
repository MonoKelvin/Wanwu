import Database from 'better-sqlite3'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { seedDefaultRssFeeds } from './rssFeeds'
import {
  importLibraryCatalog,
  loadLibraryCatalog,
  loadLibraryCategories,
  syncLibraryMediaFromCatalog
} from './librarySeed'

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

export const DEFAULT_FAVORITE_GROUP_ID = 'default'

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

  getBasePath(): string {
    return this.basePath
  }

  async init(options?: { skipLibrarySeed?: boolean }): Promise<void> {
    this.initUserSchema()
    this.initRssSchema()
    for (const cat of LIBRARY_CATEGORIES) {
      this.initLibraryDb(cat.id, cat.name)
    }
    if (!options?.skipLibrarySeed) {
      const seedResult = importLibraryCatalog(this, { importNew: true })
      if (seedResult.imported > 0) {
        console.log(
          `[librarySeed] 增量入库 ${seedResult.imported} 条（跳过 ${seedResult.skipped}）`
        )
      }
      this.syncLibraryMediaFromCatalogIfNeeded()
    }
  }

  /** catalog 配图路径变更时，将 cover / gallery 同步到各分类库 */
  private syncLibraryMediaFromCatalogIfNeeded(): void {
    const catalog = loadLibraryCatalog()
    if (!catalog?.items?.length) return

    const marker = join(this.basePath, 'db', '.library-media-sync')
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

    const result = syncLibraryMediaFromCatalog(this)
    writeFileSync(marker, token, 'utf-8')
    if (result.updated > 0) {
      console.log(`[librarySeed] 同步配图路径 ${result.updated} 条`)
    }
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
      CREATE UNIQUE INDEX IF NOT EXISTS idx_favorites_item ON favorites(item_id, source);
      CREATE TABLE IF NOT EXISTS likes (
        id TEXT PRIMARY KEY,
        item_id TEXT NOT NULL,
        source TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_likes_item ON likes(item_id, source);
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
    this.ensureProfileMediaColumns()
    this.ensureFavoriteGroupsSchema()
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
        .run(JSON.stringify({ navAlign: 'start', navDisplay: 'icon', rssFetchLimit: 20, startupModule: 'last', lastActiveModule: 'library', rssAutoRefreshMinutes: 0 }))
    }
  }

  getAppSettings(): Record<string, unknown> {
    const row = this.userDb.prepare('SELECT json FROM app_settings WHERE id = 1').get() as
      | { json: string }
      | undefined
    if (!row) {
      return {}
    }
    try {
      return JSON.parse(row.json) as Record<string, unknown>
    } catch {
      return {}
    }
  }

  updateAppSettings(settings: Record<string, unknown>): void {
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

  private ensureProfileMediaColumns(): void {
    const cols = this.userDb.prepare('PRAGMA table_info(profiles)').all() as Array<{ name: string }>
    const names = new Set(cols.map((c) => c.name))
    if (!names.has('background_path')) {
      this.userDb.exec('ALTER TABLE profiles ADD COLUMN background_path TEXT')
    }
    if (!names.has('background_config')) {
      this.userDb.exec('ALTER TABLE profiles ADD COLUMN background_config TEXT')
    }
  }

  getProfile(): {
    nickname: string
    bio: string
    avatarPath: string | null
    backgroundPath: string | null
    backgroundConfig: Record<string, unknown> | null
  } | null {
    const row = this.userDb
      .prepare(
        'SELECT nickname, bio, avatar_path, background_path, background_config FROM profiles LIMIT 1'
      )
      .get() as
      | {
          nickname: string
          bio: string
          avatar_path: string | null
          background_path: string | null
          background_config: string | null
        }
      | undefined
    if (!row) return null
    let backgroundConfig: Record<string, unknown> | null = null
    if (row.background_config) {
      try {
        backgroundConfig = JSON.parse(row.background_config) as Record<string, unknown>
      } catch {
        backgroundConfig = null
      }
    }
    return {
      nickname: row.nickname,
      bio: row.bio,
      avatarPath: row.avatar_path,
      backgroundPath: row.background_path,
      backgroundConfig
    }
  }

  updateProfile(profile: {
    nickname: string
    bio: string
    avatarPath?: string | null
    backgroundPath?: string | null
    backgroundConfig?: Record<string, unknown> | null
  }): void {
    const current = this.getProfile()
    const avatarPath = profile.avatarPath !== undefined ? profile.avatarPath : current?.avatarPath ?? null
    const backgroundPath =
      profile.backgroundPath !== undefined ? profile.backgroundPath : current?.backgroundPath ?? null
    const backgroundConfig =
      profile.backgroundConfig !== undefined
        ? profile.backgroundConfig
        : current?.backgroundConfig ?? null

    this.userDb
      .prepare(
        `UPDATE profiles SET nickname = ?, bio = ?, avatar_path = ?, background_path = ?, background_config = ?, updated_at = ?
         WHERE id = (SELECT id FROM profiles LIMIT 1)`
      )
      .run(
        profile.nickname,
        profile.bio,
        avatarPath,
        backgroundPath,
        backgroundConfig ? JSON.stringify(backgroundConfig) : null,
        new Date().toISOString()
      )
  }

  private ensureFavoriteGroupsSchema(): void {
    this.userDb.exec(`
      CREATE TABLE IF NOT EXISTS favorite_groups (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        sort_order INTEGER DEFAULT 0,
        created_at TEXT NOT NULL
      );
    `)
    const cols = this.userDb.prepare('PRAGMA table_info(favorites)').all() as Array<{ name: string }>
    if (!cols.some((c) => c.name === 'group_id')) {
      this.userDb.exec('ALTER TABLE favorites ADD COLUMN group_id TEXT')
    }
    const hasDefault = this.userDb
      .prepare('SELECT id FROM favorite_groups WHERE id = ?')
      .get(DEFAULT_FAVORITE_GROUP_ID)
    if (!hasDefault) {
      this.userDb
        .prepare(
          'INSERT INTO favorite_groups (id, name, sort_order, created_at) VALUES (?, ?, 0, ?)'
        )
        .run(DEFAULT_FAVORITE_GROUP_ID, '默认收藏', new Date().toISOString())
    }
    this.userDb
      .prepare("UPDATE favorites SET group_id = ? WHERE group_id IS NULL OR group_id = ''")
      .run(DEFAULT_FAVORITE_GROUP_ID)
  }

  listFavoriteGroups(): Array<{
    id: string
    name: string
    sort_order: number
    created_at: string
  }> {
    return this.userDb
      .prepare('SELECT id, name, sort_order, created_at FROM favorite_groups ORDER BY sort_order, created_at')
      .all() as Array<{ id: string; name: string; sort_order: number; created_at: string }>
  }

  createFavoriteGroup(name: string): { id: string; name: string; sortOrder: number } {
    const id = randomUUID()
    const trimmed = name.trim() || '未命名分组'
    const maxOrder = this.userDb
      .prepare('SELECT COALESCE(MAX(sort_order), -1) as m FROM favorite_groups')
      .get() as { m: number }
    const sortOrder = (maxOrder?.m ?? -1) + 1
    const now = new Date().toISOString()
    this.userDb
      .prepare(
        'INSERT INTO favorite_groups (id, name, sort_order, created_at) VALUES (?, ?, ?, ?)'
      )
      .run(id, trimmed, sortOrder, now)
    return { id, name: trimmed, sortOrder }
  }

  listFavorites(): Array<{
    id: string
    item_id: string
    source: string
    group_id: string
    created_at: string
  }> {
    return this.userDb
      .prepare(
        'SELECT id, item_id, source, group_id, created_at FROM favorites ORDER BY created_at DESC'
      )
      .all() as Array<{
      id: string
      item_id: string
      source: string
      group_id: string
      created_at: string
    }>
  }

  isFavorite(itemId: string, source: string): boolean {
    const row = this.userDb
      .prepare('SELECT 1 FROM favorites WHERE item_id = ? AND source = ?')
      .get(itemId, source)
    return Boolean(row)
  }

  addFavorite(itemId: string, source: string, groupId: string): boolean {
    if (this.isFavorite(itemId, source)) return true
    const groupExists = this.userDb
      .prepare('SELECT id FROM favorite_groups WHERE id = ?')
      .get(groupId) as { id: string } | undefined
    const gid = groupExists?.id ?? DEFAULT_FAVORITE_GROUP_ID
    this.userDb
      .prepare(
        'INSERT INTO favorites (id, item_id, source, group_id, created_at) VALUES (?, ?, ?, ?, ?)'
      )
      .run(randomUUID(), itemId, source, gid, new Date().toISOString())
    return true
  }

  removeFavorite(itemId: string, source: string): boolean {
    const existing = this.userDb
      .prepare('SELECT id FROM favorites WHERE item_id = ? AND source = ?')
      .get(itemId, source) as { id: string } | undefined
    if (!existing) return false
    this.userDb.prepare('DELETE FROM favorites WHERE id = ?').run(existing.id)
    return true
  }

  /** @deprecated 使用 addFavorite / removeFavorite */
  toggleFavorite(itemId: string, source: string): boolean {
    if (this.isFavorite(itemId, source)) return !this.removeFavorite(itemId, source)
    return this.addFavorite(itemId, source, DEFAULT_FAVORITE_GROUP_ID)
  }

  isLiked(itemId: string, source: string): boolean {
    const row = this.userDb
      .prepare('SELECT 1 FROM likes WHERE item_id = ? AND source = ?')
      .get(itemId, source)
    return Boolean(row)
  }

  addLike(itemId: string, source: string): boolean {
    if (this.isLiked(itemId, source)) return true
    this.userDb
      .prepare('INSERT INTO likes (id, item_id, source, created_at) VALUES (?, ?, ?, ?)')
      .run(randomUUID(), itemId, source, new Date().toISOString())
    return true
  }

  removeLike(itemId: string, source: string): boolean {
    const existing = this.userDb
      .prepare('SELECT id FROM likes WHERE item_id = ? AND source = ?')
      .get(itemId, source) as { id: string } | undefined
    if (!existing) return false
    this.userDb.prepare('DELETE FROM likes WHERE id = ?').run(existing.id)
    return true
  }

  close(): void {
    this.userDb.close()
    this.rssDb.close()
    this.libraryDbs.forEach((db) => db.close())
  }
}

export { LIBRARY_CATEGORIES }
