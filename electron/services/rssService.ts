import Parser from 'rss-parser'
import { randomUUID } from 'crypto'
import type { DatabaseService } from './database'

export class RssService {
  private parser = new Parser({
    headers: { 'User-Agent': 'Wanwu/1.0 (Desktop; +https://github.com/MonoKelvin/Wanwu)' }
  })

  constructor(private readonly db: DatabaseService) {}

  listFeeds(): Array<{
    id: string
    title: string
    url: string
    enabled: boolean
    isDefault: boolean
    lastFetchedAt: string | null
  }> {
    const rssDb = this.db.getRssDb()
    const rows = rssDb
      .prepare(
        `SELECT id, title, url, enabled, is_default as isDefault, last_fetched_at as lastFetchedAt FROM rss_feeds ORDER BY is_default DESC, title`
      )
      .all() as Array<{
      id: string
      title: string
      url: string
      enabled: number
      isDefault: number
      lastFetchedAt: string | null
    }>
    return rows.map((r) => ({
      ...r,
      enabled: Boolean(r.enabled),
      isDefault: Boolean(r.isDefault)
    }))
  }

  async fetchFeed(feedId: string): Promise<{ ok: boolean; count: number; error?: string }> {
    const rssDb = this.db.getRssDb()
    const feed = rssDb.prepare('SELECT id, url FROM rss_feeds WHERE id = ?').get(feedId) as
      | { id: string; url: string }
      | undefined
    if (!feed) return { ok: false, count: 0, error: '订阅不存在' }

    try {
      const parsed = await this.parser.parseURL(feed.url)
      const insert = rssDb.prepare(
        `INSERT OR REPLACE INTO rss_entries (id, feed_id, guid, title, summary, link, published_at, raw)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      let count = 0
      for (const item of parsed.items.slice(0, 50)) {
        const id = randomUUID()
        insert.run(
          id,
          feed.id,
          item.guid ?? item.link ?? id,
          item.title ?? '无标题',
          item.contentSnippet ?? item.summary ?? '',
          item.link ?? '',
          item.isoDate ?? new Date().toISOString(),
          JSON.stringify(item)
        )
        count++
      }
      rssDb.prepare('UPDATE rss_feeds SET last_fetched_at = ? WHERE id = ?').run(new Date().toISOString(), feed.id)
      return { ok: true, count }
    } catch (e) {
      return { ok: false, count: 0, error: e instanceof Error ? e.message : '拉取失败' }
    }
  }

  listEntries(feedId: string): Array<{
    id: string
    feedId: string
    title: string
    summary: string
    link: string
    publishedAt: string
  }> {
    return this.db.getRssDb()
      .prepare(
        `SELECT id, feed_id as feedId, title, summary, link, published_at as publishedAt
         FROM rss_entries WHERE feed_id = ? ORDER BY published_at DESC LIMIT 100`
      )
      .all(feedId) as Array<{
      id: string
      feedId: string
      title: string
      summary: string
      link: string
      publishedAt: string
    }>
  }
}
