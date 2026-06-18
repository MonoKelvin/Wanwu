import { randomUUID } from 'crypto'
import type Database from 'better-sqlite3'
import type {
  LeisureReadFavorite,
  LeisureReadFavoriteInput,
  LeisureReadTabId
} from '@modules/library/leisure-read/domain/types'

type FavoriteRow = {
  id: string
  tab: string
  content_id: string
  title: string | null
  body: string
  subtitle: string | null
  footer: string | null
  provider_id: string | null
  created_at: number
}

function mapRow(row: FavoriteRow): LeisureReadFavorite {
  return {
    id: row.id,
    tab: row.tab as LeisureReadTabId,
    contentId: row.content_id,
    title: row.title,
    body: row.body,
    subtitle: row.subtitle,
    footer: row.footer,
    providerId: row.provider_id,
    createdAt: row.created_at
  }
}

export class LeisureReadFavoriteStorage {
  constructor(private readonly db: Database.Database) {}

  listFavorites(tab?: LeisureReadTabId): LeisureReadFavorite[] {
    const rows = tab
      ? (this.db
          .prepare(
            'SELECT * FROM leisure_read_favorites WHERE tab = ? ORDER BY created_at DESC'
          )
          .all(tab) as FavoriteRow[])
      : (this.db
          .prepare('SELECT * FROM leisure_read_favorites ORDER BY created_at DESC')
          .all() as FavoriteRow[])
    return rows.map(mapRow)
  }

  addFavorite(input: LeisureReadFavoriteInput): LeisureReadFavorite {
    const existing = this.db
      .prepare('SELECT id FROM leisure_read_favorites WHERE tab = ? AND content_id = ?')
      .get(input.tab, input.contentId) as { id: string } | undefined
    if (existing) {
      return this.getById(existing.id)!
    }

    const id = randomUUID()
    const createdAt = Date.now()
    this.db
      .prepare(
        `INSERT INTO leisure_read_favorites
         (id, tab, content_id, title, body, subtitle, footer, provider_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        id,
        input.tab,
        input.contentId,
        input.title ?? null,
        input.body,
        input.subtitle ?? null,
        input.footer ?? null,
        input.providerId ?? null,
        createdAt
      )
    return this.getById(id)!
  }

  removeFavorite(id: string): boolean {
    const result = this.db.prepare('DELETE FROM leisure_read_favorites WHERE id = ?').run(id)
    return result.changes > 0
  }

  isFavorite(tab: LeisureReadTabId, contentId: string): boolean {
    const row = this.db
      .prepare('SELECT 1 FROM leisure_read_favorites WHERE tab = ? AND content_id = ?')
      .get(tab, contentId)
    return Boolean(row)
  }

  searchFavorites(query: string, limit = 8): LeisureReadFavorite[] {
    const term = `%${query.trim()}%`
    const rows = this.db
      .prepare(
        `SELECT * FROM leisure_read_favorites
         WHERE title LIKE ? OR body LIKE ? OR subtitle LIKE ? OR footer LIKE ?
         ORDER BY created_at DESC LIMIT ?`
      )
      .all(term, term, term, term, limit) as FavoriteRow[]
    return rows.map(mapRow)
  }

  private getById(id: string): LeisureReadFavorite | null {
    const row = this.db
      .prepare('SELECT * FROM leisure_read_favorites WHERE id = ?')
      .get(id) as FavoriteRow | undefined
    return row ? mapRow(row) : null
  }
}
