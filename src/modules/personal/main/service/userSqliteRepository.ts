import type Database from 'better-sqlite3'
import { randomUUID } from 'crypto'
import type { DatabaseService } from '../../../../../electron/services/core/database'
import { DEFAULT_FAVORITE_GROUP_ID } from '../constants'

function normalizeFavoriteSource(source: string): string {
  const trimmed = source?.trim()
  if (trimmed === 'rss') return 'rss'
  return 'library'
}

export function registerPersonalUserSchema(db: Database.Database): void {
  db.exec(`
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
    CREATE TABLE IF NOT EXISTS favorite_groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );
  `)

  const cols = db.prepare('PRAGMA table_info(profiles)').all() as Array<{ name: string }>
  const names = new Set(cols.map((c) => c.name))
  if (!names.has('background_path')) {
    db.exec('ALTER TABLE profiles ADD COLUMN background_path TEXT')
  }
  if (!names.has('background_config')) {
    db.exec('ALTER TABLE profiles ADD COLUMN background_config TEXT')
  }

  const favCols = db.prepare('PRAGMA table_info(favorites)').all() as Array<{ name: string }>
  if (!favCols.some((c) => c.name === 'group_id')) {
    db.exec('ALTER TABLE favorites ADD COLUMN group_id TEXT')
  }

  const hasDefault = db
    .prepare('SELECT id FROM favorite_groups WHERE id = ?')
    .get(DEFAULT_FAVORITE_GROUP_ID)
  if (!hasDefault) {
    db.prepare(
      'INSERT INTO favorite_groups (id, name, sort_order, created_at) VALUES (?, ?, 0, ?)'
    ).run(DEFAULT_FAVORITE_GROUP_ID, '默认收藏', new Date().toISOString())
  }
  db.prepare("UPDATE favorites SET group_id = ? WHERE group_id IS NULL OR group_id = ''").run(
    DEFAULT_FAVORITE_GROUP_ID
  )
  db.prepare(
    "UPDATE favorites SET source = 'library' WHERE source IS NULL OR TRIM(source) = '' OR source = 'undefined'"
  ).run()

  const row = db.prepare('SELECT id FROM profiles LIMIT 1').get()
  if (!row) {
    db.prepare('INSERT INTO profiles (id, nickname, bio, updated_at) VALUES (?, ?, ?, ?)').run(
      randomUUID(),
      '万物探索者',
      '记录世间万物',
      new Date().toISOString()
    )
  }
}

export class PersonalUserSqliteRepository {
  private readonly userDb: Database.Database

  constructor(dbService: DatabaseService) {
    let userDb!: Database.Database
    dbService.withUserDatabase((db) => {
      userDb = db
    })
    this.userDb = userDb
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
    const avatarPath =
      profile.avatarPath !== undefined ? profile.avatarPath : (current?.avatarPath ?? null)
    const backgroundPath =
      profile.backgroundPath !== undefined
        ? profile.backgroundPath
        : (current?.backgroundPath ?? null)
    const backgroundConfig =
      profile.backgroundConfig !== undefined
        ? profile.backgroundConfig
        : (current?.backgroundConfig ?? null)

    const result = this.userDb
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

    if (result.changes === 0) {
      this.userDb
        .prepare(
          `INSERT INTO profiles (id, nickname, bio, avatar_path, background_path, background_config, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          randomUUID(),
          profile.nickname,
          profile.bio,
          avatarPath,
          backgroundPath,
          backgroundConfig ? JSON.stringify(backgroundConfig) : null,
          new Date().toISOString()
        )
    }
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
      .prepare('INSERT INTO favorite_groups (id, name, sort_order, created_at) VALUES (?, ?, ?, ?)')
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
    const normalized = normalizeFavoriteSource(source)
    const row = this.userDb
      .prepare('SELECT 1 FROM favorites WHERE item_id = ? AND source = ?')
      .get(itemId, normalized)
    return Boolean(row)
  }

  addFavorite(itemId: string, source: string, groupId: string): boolean {
    const normalized = normalizeFavoriteSource(source)
    if (this.isFavorite(itemId, normalized)) return true
    const groupExists = this.userDb
      .prepare('SELECT id FROM favorite_groups WHERE id = ?')
      .get(groupId) as { id: string } | undefined
    const gid = groupExists?.id ?? DEFAULT_FAVORITE_GROUP_ID
    this.userDb
      .prepare(
        'INSERT INTO favorites (id, item_id, source, group_id, created_at) VALUES (?, ?, ?, ?, ?)'
      )
      .run(randomUUID(), itemId, normalized, gid, new Date().toISOString())
    return true
  }

  removeFavorite(itemId: string, source: string): boolean {
    const normalized = normalizeFavoriteSource(source)
    const existing = this.userDb
      .prepare('SELECT id FROM favorites WHERE item_id = ? AND source = ?')
      .get(itemId, normalized) as { id: string } | undefined
    if (!existing) return false
    this.userDb.prepare('DELETE FROM favorites WHERE id = ?').run(existing.id)
    return true
  }

  toggleFavorite(itemId: string, source: string): boolean {
    const normalized = normalizeFavoriteSource(source)
    if (this.isFavorite(itemId, normalized)) return !this.removeFavorite(itemId, normalized)
    return this.addFavorite(itemId, normalized, DEFAULT_FAVORITE_GROUP_ID)
  }

  isLiked(itemId: string, source: string): boolean {
    const normalized = normalizeFavoriteSource(source)
    const row = this.userDb
      .prepare('SELECT 1 FROM likes WHERE item_id = ? AND source = ?')
      .get(itemId, normalized)
    return Boolean(row)
  }

  addLike(itemId: string, source: string): boolean {
    const normalized = normalizeFavoriteSource(source)
    if (this.isLiked(itemId, normalized)) return true
    this.userDb
      .prepare('INSERT INTO likes (id, item_id, source, created_at) VALUES (?, ?, ?, ?)')
      .run(randomUUID(), itemId, normalized, new Date().toISOString())
    return true
  }

  removeLike(itemId: string, source: string): boolean {
    const normalized = normalizeFavoriteSource(source)
    const existing = this.userDb
      .prepare('SELECT id FROM likes WHERE item_id = ? AND source = ?')
      .get(itemId, normalized) as { id: string } | undefined
    if (!existing) return false
    this.userDb.prepare('DELETE FROM likes WHERE id = ?').run(existing.id)
    return true
  }
}
