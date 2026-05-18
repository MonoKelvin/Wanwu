import Parser from 'rss-parser'
import { randomUUID } from 'crypto'
import type { DatabaseService } from './database'
import {
  RSS_DEFAULT_GROUP_ID,
  RSS_GROUP_TECH_ID,
  RSS_RECYCLE_GROUP_ID,
  SYSTEM_RSS_GROUP_IDS,
  AUTO_ACCESS_WARNING,
  DEFAULT_RSS_DISPLAY,
  type RssDisplayOptions
} from '../../src/shared/types/rss'
import { probeRssFeedUrl } from './rssProbe'
import { validateFeedTitle, validateFeedUrl } from './rssValidation'
import { ensureRssSchema } from './rssSchema'
import { extractEntryImageUrl, iconUrlFromFeedMeta } from './rssMedia'
import { assessFeedQuality, evaluateFeedHealth } from './rssFeedHealth'

const MAX_STORE_ITEMS = 500

function parseDisplay(json: string | null): RssDisplayOptions {
  if (!json) return { ...DEFAULT_RSS_DISPLAY }
  try {
    return { ...DEFAULT_RSS_DISPLAY, ...JSON.parse(json) }
  } catch {
    return { ...DEFAULT_RSS_DISPLAY }
  }
}

function serializeDisplay(display: Partial<RssDisplayOptions>): string {
  return JSON.stringify({ ...DEFAULT_RSS_DISPLAY, ...display })
}

const SYSTEM_GROUP_SET = new Set<string>(SYSTEM_RSS_GROUP_IDS)

export class RssService {
  private parser = new Parser({
    headers: { 'User-Agent': 'Wanwu/1.0 (Desktop; +https://github.com/MonoKelvin/Wanwu)' }
  })

  constructor(private readonly db: DatabaseService) {}

  listGroups(): Array<{
    id: string
    name: string
    sortOrder: number
    isRecycleBin: boolean
  }> {
    const rows = this.db.getRssDb()
      .prepare(
        `SELECT id, name, sort_order as sortOrder, kind FROM rss_groups ORDER BY sort_order, name`
      )
      .all() as Array<{ id: string; name: string; sortOrder: number; kind: string }>
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      sortOrder: r.sortOrder,
      isRecycleBin: r.kind === 'recycle',
      isSystem: SYSTEM_GROUP_SET.has(r.id) || r.id === RSS_RECYCLE_GROUP_ID
    }))
  }

  createGroup(name: string): { id: string; name: string; sortOrder: number; isRecycleBin: boolean } {
    const trimmed = name.trim()
    if (!trimmed) throw new Error('请填写分组名称')
    const rssDb = this.db.getRssDb()
    ensureRssSchema(rssDb)
    const max = rssDb
      .prepare(`SELECT COALESCE(MAX(sort_order), 0) as m FROM rss_groups WHERE kind = 'normal'`)
      .get() as { m: number }
    const id = randomUUID()
    const sortOrder = max.m + 1
    rssDb
      .prepare('INSERT INTO rss_groups (id, name, sort_order, kind) VALUES (?, ?, ?, ?)')
      .run(id, trimmed, sortOrder, 'normal')
    return {
      id: String(id),
      name: trimmed,
      sortOrder,
      isRecycleBin: false,
      isSystem: false
    }
  }

  renameGroup(groupId: string, name: string): void {
    if (groupId === RSS_RECYCLE_GROUP_ID || SYSTEM_GROUP_SET.has(groupId) || groupId === RSS_DEFAULT_GROUP_ID) {
      return
    }
    this.db
      .getRssDb()
      .prepare('UPDATE rss_groups SET name = ? WHERE id = ? AND kind = ?')
      .run(name.trim(), groupId, 'normal')
  }

  deleteGroup(groupId: string): void {
    if (groupId === RSS_RECYCLE_GROUP_ID || SYSTEM_GROUP_SET.has(groupId) || groupId === RSS_DEFAULT_GROUP_ID) {
      return
    }
    const rssDb = this.db.getRssDb()
    rssDb
      .prepare('UPDATE rss_feeds SET group_id = ? WHERE group_id = ? AND deleted_at IS NULL')
      .run(RSS_GROUP_TECH_ID, groupId)
    rssDb.prepare('DELETE FROM rss_groups WHERE id = ? AND kind = ?').run(groupId, 'normal')
  }

  listFeeds(): Array<{
    id: string
    title: string
    url: string
    groupId: string
    enabled: boolean
    isDefault: boolean
    lastFetchedAt: string | null
    accessWarning: string | null
    accessWarningLocked: boolean
    sortOrder: number
    display: RssDisplayOptions
    deletedAt: string | null
    previousGroupId: string | null
    iconUrl: string | null
  }> {
    ensureRssSchema(this.db.getRssDb())
    const rows = this.db.getRssDb()
      .prepare(
        `SELECT id, title, url, group_id, enabled, is_default as isDefault, last_fetched_at as lastFetchedAt,
                access_warning as accessWarning, access_warning_locked as accessWarningLocked,
                sort_order as sortOrder, display_options as displayOptions,
                deleted_at as deletedAt, previous_group_id as previousGroupId, icon_url as iconUrl
         FROM rss_feeds
         ORDER BY sort_order, title`
      )
      .all() as Array<{
      id: string
      title: string
      url: string
      group_id: string
      enabled: number
      isDefault: number
      lastFetchedAt: string | null
      accessWarning: string | null
      accessWarningLocked: number
      sortOrder: number
      displayOptions: string | null
      deletedAt: string | null
      previousGroupId: string | null
      iconUrl: string | null
    }>

    return rows.map((r) => this.mapFeedRow(r))
  }

  private mapFeedRow(r: {
    id: string
    title: string
    url: string
    group_id: string
    enabled: number
    isDefault: number
    lastFetchedAt: string | null
    accessWarning: string | null
    accessWarningLocked: number
    sortOrder: number
    displayOptions: string | null
    deletedAt: string | null
    previousGroupId: string | null
    iconUrl?: string | null
  }) {
    return {
      id: r.id,
      title: r.title,
      url: r.url,
      groupId: r.group_id ?? RSS_DEFAULT_GROUP_ID,
      enabled: Boolean(r.enabled),
      isDefault: Boolean(r.isDefault),
      lastFetchedAt: r.lastFetchedAt,
      accessWarning: r.accessWarning ?? null,
      accessWarningLocked: Boolean(r.accessWarningLocked),
      sortOrder: r.sortOrder ?? 0,
      display: parseDisplay(r.displayOptions),
      deletedAt: r.deletedAt,
      previousGroupId: r.previousGroupId,
      iconUrl: r.iconUrl ?? null
    }
  }

  createFeed(input: {
    title: string
    url: string
    groupId?: string
    display?: Partial<RssDisplayOptions>
  }) {
    const titleErr = validateFeedTitle(input.title)
    const urlErr = validateFeedUrl(input.url)
    if (titleErr) throw new Error(titleErr)
    if (urlErr) throw new Error(urlErr)

    const rssDb = this.db.getRssDb()
    ensureRssSchema(rssDb)
    const id = randomUUID()
    const groupId = input.groupId ?? RSS_DEFAULT_GROUP_ID
    const feedUrl = input.url.trim()
    const max = rssDb
      .prepare('SELECT COALESCE(MAX(sort_order), 0) as m FROM rss_feeds WHERE group_id = ?')
      .get(groupId) as { m: number }
    rssDb
      .prepare(
        `INSERT INTO rss_feeds (id, title, url, group_id, is_default, enabled, sort_order, display_options, access_warning, access_warning_locked, icon_url)
         VALUES (?, ?, ?, ?, 0, 1, ?, ?, NULL, 0, ?)`
      )
      .run(
        id,
        input.title.trim(),
        feedUrl,
        groupId,
        max.m + 1,
        serializeDisplay(input.display ?? {}),
        iconUrlFromFeedMeta(feedUrl, null)
      )
    return this.getFeed(id)!
  }

  updateFeed(input: {
    id: string
    title?: string
    url?: string
    groupId?: string
    display?: Partial<RssDisplayOptions>
  }) {
    const rssDb = this.db.getRssDb()
    const existing = this.getFeed(input.id)
    if (!existing) throw new Error('订阅不存在')

    const display = input.display ? serializeDisplay({ ...existing.display, ...input.display }) : null

    if (existing.isDefault) {
      if (input.title !== undefined && input.title.trim() !== existing.title) {
        throw new Error('系统订阅不可修改名称')
      }
      if (input.url !== undefined && input.url.trim() !== existing.url) {
        throw new Error('系统订阅不可修改链接')
      }
      rssDb
        .prepare(
          `UPDATE rss_feeds SET group_id = COALESCE(?, group_id), display_options = COALESCE(?, display_options) WHERE id = ?`
        )
        .run(input.groupId ?? null, display, input.id)
      return this.getFeed(input.id)!
    }

    if (input.title !== undefined) {
      const titleErr = validateFeedTitle(input.title)
      if (titleErr) throw new Error(titleErr)
    }
    if (input.url !== undefined) {
      const urlErr = validateFeedUrl(input.url)
      if (urlErr) throw new Error(urlErr)
    }

    const nextUrl = input.url?.trim() ?? existing.url
    const nextIcon =
      input.url !== undefined ? iconUrlFromFeedMeta(nextUrl, existing.iconUrl) : null

    rssDb
      .prepare(
        `UPDATE rss_feeds SET
          title = COALESCE(?, title),
          url = COALESCE(?, url),
          group_id = COALESCE(?, group_id),
          display_options = COALESCE(?, display_options),
          icon_url = COALESCE(?, icon_url)
         WHERE id = ?`
      )
      .run(
        input.title?.trim() ?? null,
        input.url?.trim() ?? null,
        input.groupId ?? null,
        display,
        nextIcon,
        input.id
      )
    return this.getFeed(input.id)!
  }

  async probeFeed(feedId: string): Promise<{
    feedId: string
    reachable: boolean
    accessWarning: string | null
  }> {
    const existing = this.getFeed(feedId)
    if (!existing) {
      return { feedId, reachable: false, accessWarning: '订阅不存在' }
    }

    const probe = await probeRssFeedUrl(existing.url)
    let accessWarning: string | null

    if (existing.accessWarningLocked) {
      accessWarning = existing.accessWarning ?? AUTO_ACCESS_WARNING
    } else if (!probe.ok) {
      accessWarning = AUTO_ACCESS_WARNING
    } else {
      accessWarning = null
    }

    this.db
      .getRssDb()
      .prepare('UPDATE rss_feeds SET access_warning = ? WHERE id = ?')
      .run(accessWarning, feedId)

    return { feedId, reachable: probe.ok, accessWarning }
  }

  getFeed(id: string) {
    const row = this.db.getRssDb().prepare(
      `SELECT id, title, url, group_id, enabled, is_default as isDefault, last_fetched_at as lastFetchedAt,
              access_warning as accessWarning, access_warning_locked as accessWarningLocked,
              sort_order as sortOrder, display_options as displayOptions,
              deleted_at as deletedAt, previous_group_id as previousGroupId, icon_url as iconUrl
       FROM rss_feeds WHERE id = ?`
    ).get(id) as {
      id: string
      title: string
      url: string
      group_id: string
      enabled: number
      isDefault: number
      lastFetchedAt: string | null
      accessWarning: string | null
      accessWarningLocked: number
      sortOrder: number
      iconUrl: string | null
      displayOptions: string | null
      deletedAt: string | null
      previousGroupId: string | null
    } | undefined
    if (!row) return null
    return this.mapFeedRow(row)
  }

  moveFeed(feedId: string, groupId: string, sortOrder?: number): void {
    const rssDb = this.db.getRssDb()
    if (groupId === RSS_RECYCLE_GROUP_ID) return
    const order =
      sortOrder ??
      (rssDb
        .prepare('SELECT COALESCE(MAX(sort_order), 0) + 1 as m FROM rss_feeds WHERE group_id = ?')
        .get(groupId) as { m: number }).m
    rssDb
      .prepare(
        'UPDATE rss_feeds SET group_id = ?, sort_order = ?, deleted_at = NULL, previous_group_id = NULL WHERE id = ?'
      )
      .run(groupId, order, feedId)
  }

  softDeleteFeed(feedId: string): void {
    const rssDb = this.db.getRssDb()
    const feed = rssDb.prepare('SELECT group_id FROM rss_feeds WHERE id = ?').get(feedId) as
      | { group_id: string }
      | undefined
    if (!feed) return
    rssDb
      .prepare(
        `UPDATE rss_feeds SET previous_group_id = ?, group_id = ?, deleted_at = ?, sort_order = 0 WHERE id = ?`
      )
      .run(feed.group_id, RSS_RECYCLE_GROUP_ID, new Date().toISOString(), feedId)
  }

  restoreFeed(feedId: string): void {
    const rssDb = this.db.getRssDb()
    const feed = rssDb.prepare('SELECT previous_group_id FROM rss_feeds WHERE id = ?').get(feedId) as
      | { previous_group_id: string | null }
      | undefined
    if (!feed) return
    const target = feed.previous_group_id
    const validGroup =
      target && target !== RSS_RECYCLE_GROUP_ID ? target : RSS_GROUP_TECH_ID
    this.moveFeed(feedId, validGroup)
  }

  permanentDeleteFeed(feedId: string): void {
    const rssDb = this.db.getRssDb()
    const feed = rssDb.prepare('SELECT group_id FROM rss_feeds WHERE id = ?').get(feedId) as
      | { group_id: string }
      | undefined
    if (!feed || feed.group_id !== RSS_RECYCLE_GROUP_ID) return
    rssDb.prepare('DELETE FROM rss_entries WHERE feed_id = ?').run(feedId)
    rssDb.prepare('DELETE FROM rss_feeds WHERE id = ?').run(feedId)
  }

  /** 彻底删除预置订阅（用于健康检查清理） */
  deleteDefaultFeed(feedId: string): boolean {
    const rssDb = this.db.getRssDb()
    const row = rssDb.prepare('SELECT is_default FROM rss_feeds WHERE id = ?').get(feedId) as
      | { is_default: number }
      | undefined
    if (!row?.is_default) return false
    rssDb.prepare('DELETE FROM rss_entries WHERE feed_id = ?').run(feedId)
    rssDb.prepare('DELETE FROM rss_feeds WHERE id = ?').run(feedId)
    return true
  }

  /**
   * 检测预置源：无法拉取或「无正文且无配图」的予以删除。
   */
  async pruneUnhealthyDefaultFeeds(): Promise<
    Array<{ feedId: string; url: string; title: string; reason: string }>
  > {
    const rssDb = this.db.getRssDb()
    const rows = rssDb
      .prepare(
        `SELECT id, url, title FROM rss_feeds
         WHERE is_default = 1 AND group_id != ?`
      )
      .all(RSS_RECYCLE_GROUP_ID) as Array<{ id: string; url: string; title: string }>

    const removed: Array<{ feedId: string; url: string; title: string; reason: string }> = []

    for (const row of rows) {
      const health = await evaluateFeedHealth(row.url)
      if (!health.shouldRemove) continue
      if (this.deleteDefaultFeed(row.id)) {
        removed.push({
          feedId: row.id,
          url: row.url,
          title: row.title,
          reason: health.error ?? '无正文且无配图'
        })
      }
    }

    return removed
  }

  emptyRecycleBin(): void {
    const rssDb = this.db.getRssDb()
    const ids = rssDb
      .prepare('SELECT id FROM rss_feeds WHERE group_id = ?')
      .all(RSS_RECYCLE_GROUP_ID) as Array<{ id: string }>
    for (const { id } of ids) {
      rssDb.prepare('DELETE FROM rss_entries WHERE feed_id = ?').run(id)
      rssDb.prepare('DELETE FROM rss_feeds WHERE id = ?').run(id)
    }
  }

  async fetchFeed(
    feedId: string,
    fetchLimit = 20
  ): Promise<{ ok: boolean; count: number; total: number; error?: string }> {
    const rssDb = this.db.getRssDb()
    const feed = rssDb.prepare('SELECT id, url, is_default as isDefault FROM rss_feeds WHERE id = ?').get(
      feedId
    ) as { id: string; url: string; isDefault: number } | undefined
    if (!feed) return { ok: false, count: 0, total: 0, error: '订阅不存在' }

    try {
      ensureRssSchema(rssDb)
      const parsed = await this.parser.parseURL(feed.url)
      const quality = assessFeedQuality(parsed)
      if (feed.isDefault && !quality.hasContent && !quality.hasThumbnail) {
        this.deleteDefaultFeed(feed.id)
        return { ok: false, count: 0, total: 0, error: '该源无正文且无配图，已自动移除' }
      }
      const feedIcon = iconUrlFromFeedMeta(feed.url, parsed.image?.url ?? null)
      rssDb.prepare('UPDATE rss_feeds SET icon_url = ? WHERE id = ?').run(feedIcon, feed.id)

      const upsert = rssDb.prepare(
        `INSERT INTO rss_entries (id, feed_id, guid, title, summary, link, published_at, raw, image_url)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(feed_id, guid) DO UPDATE SET
           title = excluded.title,
           summary = excluded.summary,
           link = excluded.link,
           published_at = excluded.published_at,
           raw = excluded.raw,
           image_url = CASE
             WHEN excluded.image_url IS NOT NULL AND excluded.image_url != ''
             THEN excluded.image_url
             ELSE rss_entries.image_url
           END`
      )
      const items = parsed.items.slice(0, MAX_STORE_ITEMS)
      for (const item of items) {
        const guid = item.guid ?? item.link ?? item.title ?? randomUUID()
        const id = `${feed.id}::${guid}`.slice(0, 120)
        const imageUrl = extractEntryImageUrl(item)
        upsert.run(
          id,
          feed.id,
          guid,
          item.title ?? '无标题',
          item.contentSnippet ?? item.summary ?? '',
          item.link ?? '',
          item.isoDate ?? new Date().toISOString(),
          JSON.stringify(item),
          imageUrl
        )
      }
      rssDb.prepare('UPDATE rss_feeds SET last_fetched_at = ? WHERE id = ?').run(new Date().toISOString(), feed.id)
      const total = (
        rssDb.prepare('SELECT COUNT(*) as c FROM rss_entries WHERE feed_id = ?').get(feed.id) as { c: number }
      ).c
      return { ok: true, count: Math.min(fetchLimit, items.length), total }
    } catch (e) {
      if (feed.isDefault) {
        const health = await evaluateFeedHealth(feed.url)
        if (health.shouldRemove) {
          this.deleteDefaultFeed(feed.id)
          return { ok: false, count: 0, total: 0, error: '该源不可用，已自动移除' }
        }
      }
      return { ok: false, count: 0, total: 0, error: e instanceof Error ? e.message : '拉取失败' }
    }
  }

  listEntries(
    feedId: string,
    limit = 20,
    offset = 0
  ): { items: Array<{
    id: string
    feedId: string
    title: string
    summary: string
    link: string
    publishedAt: string
    imageUrl: string | null
  }>; total: number } {
    ensureRssSchema(this.db.getRssDb())
    const rssDb = this.db.getRssDb()
    const total = (
      rssDb.prepare('SELECT COUNT(*) as c FROM rss_entries WHERE feed_id = ?').get(feedId) as { c: number }
    ).c
    const items = rssDb
      .prepare(
        `SELECT id, feed_id as feedId, title, summary, link, published_at as publishedAt, image_url as imageUrl
         FROM rss_entries WHERE feed_id = ? ORDER BY published_at DESC LIMIT ? OFFSET ?`
      )
      .all(feedId, limit, offset) as Array<{
      id: string
      feedId: string
      title: string
      summary: string
      link: string
      publishedAt: string
      imageUrl: string | null
    }>
    return {
      items: items.map((row) => ({
        ...row,
        imageUrl: row.imageUrl ?? null
      })),
      total
    }
  }
}
