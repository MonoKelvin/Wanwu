import { randomUUID } from 'crypto'
import type Database from 'better-sqlite3'
import type { LeisureReadFavoriteKind } from '@modules/library/leisure-read/domain/favoriteMeta'
import { SNIPPET_GROUP_PREFIX } from '@modules/library/leisure-read/domain/favoriteMeta'
import {
  findSnippetRange,
  mergeIncomingSnippetRange,
  mergeSnippetRanges,
  resolveSnippetRanges,
  serializeSnippetRanges
} from '@modules/library/leisure-read/domain/snippetRanges'
import type {
  LeisureReadFavorite,
  LeisureReadFavoriteInput,
  LeisureReadSnippetRange,
  LeisureReadTabId,
  LeisureReadUpdateArticleSnippetsInput
} from '@modules/library/leisure-read/domain/types'
import {
  deriveArticleId,
  snippetGroupContentId
} from '@modules/library/leisure-read/main/favoriteArticleId'

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
  article_id: string | null
  kind: string | null
  snippets_json: string | null
}

function mapRow(row: FavoriteRow): LeisureReadFavorite {
  const kind = (row.kind ?? 'full') as LeisureReadFavoriteKind
  const snippetRanges =
    kind === 'snippet' ? resolveSnippetRanges(row.body, row.snippets_json) : undefined
  return {
    id: row.id,
    tab: row.tab as LeisureReadTabId,
    contentId: row.content_id,
    title: row.title,
    body: row.body,
    subtitle: row.subtitle,
    footer: row.footer,
    providerId: row.provider_id,
    createdAt: row.created_at,
    articleId: row.article_id,
    kind,
    snippetRanges,
    snippets: snippetRanges?.map((range) => range.text ?? row.body.slice(range.start, range.end))
  }
}

function resolveIncomingSnippetRange(input: LeisureReadFavoriteInput): LeisureReadSnippetRange | null {
  if (input.snippetRange && input.snippetRange.end > input.snippetRange.start) {
    return input.snippetRange
  }
  if (!input.snippet?.trim()) return null
  return findSnippetRange(input.body, input.snippet)
}

export class LeisureReadFavoriteStorage {
  private migratedLegacy = false

  constructor(private readonly db: Database.Database) {}

  listFavorites(tab?: LeisureReadTabId): LeisureReadFavorite[] {
    this.migrateLegacyArticleFavorites()
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
    if (input.tab === 'article' && input.kind === 'snippet' && input.snippet?.trim()) {
      return this.addArticleSnippetFavorite(input)
    }
    if (input.tab === 'article') {
      return this.addArticleFullFavorite(input)
    }
    return this.addGenericFavorite(input)
  }

  removeFavorite(id: string): boolean {
    const result = this.db.prepare('DELETE FROM leisure_read_favorites WHERE id = ?').run(id)
    return result.changes > 0
  }

  updateArticleSnippetRanges(
    input: LeisureReadUpdateArticleSnippetsInput
  ): LeisureReadFavorite | null {
    const groupId = snippetGroupContentId(input.articleId)
    const existing = this.db
      .prepare(`SELECT * FROM leisure_read_favorites WHERE tab = 'article' AND content_id = ?`)
      .get(groupId) as FavoriteRow | undefined

    if (!existing) return null

    const body = input.body.length > existing.body.length ? input.body : existing.body
    const mergedRanges = mergeSnippetRanges(input.ranges)

    if (!mergedRanges.length) {
      this.db.prepare('DELETE FROM leisure_read_favorites WHERE id = ?').run(existing.id)
      if (!this.isArticleFavorited(input.articleId)) {
        return this.addArticleFullFavorite({
          tab: 'article',
          kind: 'full',
          contentId: input.articleId,
          articleId: input.articleId,
          title: input.title ?? existing.title ?? undefined,
          body,
          subtitle: input.subtitle ?? existing.subtitle ?? undefined,
          footer: input.footer ?? existing.footer ?? undefined,
          providerId: input.providerId ?? existing.provider_id ?? undefined
        })
      }
      const full = this.db
        .prepare(
          `SELECT * FROM leisure_read_favorites
           WHERE tab = 'article' AND kind = 'full' AND (content_id = ? OR article_id = ?)`
        )
        .get(input.articleId, input.articleId) as FavoriteRow | undefined
      return full ? mapRow(full) : null
    }

    this.db
      .prepare(
        `UPDATE leisure_read_favorites
         SET snippets_json = ?, body = ?, title = COALESCE(?, title), subtitle = COALESCE(?, subtitle),
             footer = COALESCE(?, footer), provider_id = COALESCE(?, provider_id), article_id = ?
         WHERE id = ?`
      )
      .run(
        serializeSnippetRanges(mergedRanges),
        body,
        input.title ?? null,
        input.subtitle ?? null,
        input.footer ?? null,
        input.providerId ?? null,
        input.articleId,
        existing.id
      )
    return this.getById(existing.id)!
  }

  isFavorite(tab: LeisureReadTabId, contentId: string): boolean {
    const row = this.db
      .prepare('SELECT 1 FROM leisure_read_favorites WHERE tab = ? AND content_id = ?')
      .get(tab, contentId)
    return Boolean(row)
  }

  isArticleFavorited(articleId: string): boolean {
    const row = this.db
      .prepare(
        `SELECT 1 FROM leisure_read_favorites
         WHERE tab = 'article' AND kind = 'full' AND (content_id = ? OR article_id = ?)`
      )
      .get(articleId, articleId)
    return Boolean(row)
  }

  searchFavorites(query: string, limit = 8): LeisureReadFavorite[] {
    const term = `%${query.trim()}%`
    const rows = this.db
      .prepare(
        `SELECT * FROM leisure_read_favorites
         WHERE title LIKE ? OR body LIKE ? OR subtitle LIKE ? OR footer LIKE ? OR snippets_json LIKE ?
         ORDER BY created_at DESC LIMIT ?`
      )
      .all(term, term, term, term, term, limit) as FavoriteRow[]
    return rows.map(mapRow)
  }

  private addGenericFavorite(input: LeisureReadFavoriteInput): LeisureReadFavorite {
    const existing = this.db
      .prepare('SELECT id FROM leisure_read_favorites WHERE tab = ? AND content_id = ?')
      .get(input.tab, input.contentId) as { id: string } | undefined
    if (existing) return this.getById(existing.id)!

    const id = randomUUID()
    const createdAt = Date.now()
    this.db
      .prepare(
        `INSERT INTO leisure_read_favorites
         (id, tab, content_id, title, body, subtitle, footer, provider_id, created_at, article_id, kind, snippets_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
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
        createdAt,
        input.articleId ?? null,
        input.kind ?? 'full',
        null
      )
    return this.getById(id)!
  }

  private addArticleFullFavorite(input: LeisureReadFavoriteInput): LeisureReadFavorite {
    const articleId =
      input.articleId ??
      deriveArticleId({ contentId: input.contentId, title: input.title, body: input.body })
    const existing = this.db
      .prepare(
        `SELECT id FROM leisure_read_favorites
         WHERE tab = 'article' AND kind = 'full' AND (content_id = ? OR article_id = ?)`
      )
      .get(articleId, articleId) as { id: string } | undefined
    if (existing) return this.getById(existing.id)!

    const id = randomUUID()
    const createdAt = Date.now()
    this.db
      .prepare(
        `INSERT INTO leisure_read_favorites
         (id, tab, content_id, title, body, subtitle, footer, provider_id, created_at, article_id, kind, snippets_json)
         VALUES (?, 'article', ?, ?, ?, ?, ?, ?, ?, ?, 'full', NULL)`
      )
      .run(
        id,
        articleId,
        input.title ?? null,
        input.body,
        input.subtitle ?? null,
        input.footer ?? null,
        input.providerId ?? null,
        createdAt,
        articleId
      )
    return this.getById(id)!
  }

  private addArticleSnippetFavorite(input: LeisureReadFavoriteInput): LeisureReadFavorite {
    const articleId =
      input.articleId ??
      deriveArticleId({ contentId: input.contentId, title: input.title, body: input.body })
    const groupId = snippetGroupContentId(articleId)
    const incomingRange = resolveIncomingSnippetRange(input)
    if (!incomingRange) return this.addArticleFullFavorite(input)

    const existing = this.db
      .prepare(
        `SELECT * FROM leisure_read_favorites
         WHERE tab = 'article' AND content_id = ?`
      )
      .get(groupId) as FavoriteRow | undefined

    if (existing) {
      const body = input.body.length > existing.body.length ? input.body : existing.body
      const merged = mergeIncomingSnippetRange(
        resolveSnippetRanges(body, existing.snippets_json),
        incomingRange
      )
      this.db
        .prepare(
          `UPDATE leisure_read_favorites
           SET snippets_json = ?, body = ?, title = COALESCE(?, title), subtitle = COALESCE(?, subtitle),
               footer = COALESCE(?, footer), provider_id = COALESCE(?, provider_id), article_id = ?
           WHERE id = ?`
        )
        .run(
          serializeSnippetRanges(merged),
          body,
          input.title ?? null,
          input.subtitle ?? null,
          input.footer ?? null,
          input.providerId ?? null,
          articleId,
          existing.id
        )
      return this.getById(existing.id)!
    }

    const id = randomUUID()
    const createdAt = Date.now()
    this.db
      .prepare(
        `INSERT INTO leisure_read_favorites
         (id, tab, content_id, title, body, subtitle, footer, provider_id, created_at, article_id, kind, snippets_json)
         VALUES (?, 'article', ?, ?, ?, ?, ?, ?, ?, ?, 'snippet', ?)`
      )
      .run(
        id,
        groupId,
        input.title ?? null,
        input.body,
        input.subtitle ?? null,
        input.footer ?? null,
        input.providerId ?? null,
        createdAt,
        articleId,
        serializeSnippetRanges([incomingRange])
      )
    return this.getById(id)!
  }

  private migrateLegacyArticleFavorites() {
    if (this.migratedLegacy) return
    this.migratedLegacy = true

    const legacyRows = this.db
      .prepare(
        `SELECT * FROM leisure_read_favorites
         WHERE tab = 'article'
           AND content_id LIKE '%:%'
           AND content_id NOT LIKE ?`
      )
      .all(`${SNIPPET_GROUP_PREFIX}%`) as FavoriteRow[]

    if (!legacyRows.length) return

    const grouped = new Map<
      string,
      { ranges: LeisureReadSnippetRange[]; row: FavoriteRow; articleBody: string }
    >()

    for (const row of legacyRows) {
      const parts = row.content_id.split(':')
      const articleId = parts[0]
      if (!articleId) continue
      const bucket = grouped.get(articleId) ?? {
        ranges: [],
        row,
        articleBody: row.body
      }
      const range = findSnippetRange(bucket.articleBody, row.body)
      if (range) {
        bucket.ranges = mergeIncomingSnippetRange(bucket.ranges, range)
      }
      if (row.body.length > bucket.articleBody.length) bucket.articleBody = row.body
      grouped.set(articleId, bucket)
    }

    for (const [articleId, bucket] of grouped) {
      const groupId = snippetGroupContentId(articleId)
      const existing = this.db
        .prepare(`SELECT * FROM leisure_read_favorites WHERE tab = 'article' AND content_id = ?`)
        .get(groupId) as FavoriteRow | undefined

      const body = bucket.articleBody

      if (existing) {
        let merged = resolveSnippetRanges(body, existing.snippets_json)
        for (const range of bucket.ranges) {
          merged = mergeIncomingSnippetRange(merged, range)
        }
        this.db
          .prepare(
            `UPDATE leisure_read_favorites SET snippets_json = ?, article_id = ?, kind = 'snippet',
             body = CASE WHEN length(?) > length(body) THEN ? ELSE body END WHERE id = ?`
          )
          .run(serializeSnippetRanges(merged), articleId, body, body, existing.id)
      } else {
        const id = randomUUID()
        this.db
          .prepare(
            `INSERT INTO leisure_read_favorites
             (id, tab, content_id, title, body, subtitle, footer, provider_id, created_at, article_id, kind, snippets_json)
             VALUES (?, 'article', ?, ?, ?, ?, ?, ?, ?, ?, 'snippet', ?)`
          )
          .run(
            id,
            groupId,
            bucket.row.title,
            body,
            bucket.row.subtitle,
            bucket.row.footer,
            bucket.row.provider_id,
            bucket.row.created_at,
            articleId,
            serializeSnippetRanges(bucket.ranges)
          )
      }
    }

    for (const row of legacyRows) {
      this.db.prepare('DELETE FROM leisure_read_favorites WHERE id = ?').run(row.id)
    }
  }

  private getById(id: string): LeisureReadFavorite | null {
    const row = this.db
      .prepare('SELECT * FROM leisure_read_favorites WHERE id = ?')
      .get(id) as FavoriteRow | undefined
    return row ? mapRow(row) : null
  }
}
