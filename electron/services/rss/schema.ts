import type Database from 'better-sqlite3'
import {
  RSS_DEFAULT_GROUP_ID,
  RSS_GROUP_BLOG_ID,
  RSS_GROUP_COMMUNITY_ID,
  RSS_GROUP_OTHER_ID,
  RSS_GROUP_TECH_ID,
  RSS_RECYCLE_GROUP_ID
} from '../../../src/shared/types/rss'

const SYSTEM_GROUPS = [
  { id: RSS_GROUP_BLOG_ID, name: '博客专栏', sortOrder: 1 },
  { id: RSS_GROUP_TECH_ID, name: '科技资讯', sortOrder: 2 },
  { id: RSS_GROUP_COMMUNITY_ID, name: '社区', sortOrder: 3 },
  { id: RSS_GROUP_OTHER_ID, name: '其他', sortOrder: 4 }
]

export function ensureRssSchema(rssDb: Database.Database): void {
  rssDb.exec(`
    CREATE TABLE IF NOT EXISTS rss_groups (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      kind TEXT NOT NULL DEFAULT 'normal'
    );
  `)

  const feedCols = rssDb.prepare('PRAGMA table_info(rss_feeds)').all() as Array<{ name: string }>
  const names = new Set(feedCols.map((c) => c.name))
  if (!names.has('group_id')) rssDb.exec('ALTER TABLE rss_feeds ADD COLUMN group_id TEXT')
  if (!names.has('deleted_at')) rssDb.exec('ALTER TABLE rss_feeds ADD COLUMN deleted_at TEXT')
  if (!names.has('previous_group_id')) rssDb.exec('ALTER TABLE rss_feeds ADD COLUMN previous_group_id TEXT')
  if (!names.has('sort_order')) rssDb.exec('ALTER TABLE rss_feeds ADD COLUMN sort_order INTEGER DEFAULT 0')
  if (!names.has('display_options')) rssDb.exec('ALTER TABLE rss_feeds ADD COLUMN display_options TEXT')
  if (!names.has('access_warning')) rssDb.exec('ALTER TABLE rss_feeds ADD COLUMN access_warning TEXT')
  if (!names.has('access_warning_locked')) rssDb.exec('ALTER TABLE rss_feeds ADD COLUMN access_warning_locked INTEGER DEFAULT 0')
  if (!names.has('icon_url')) rssDb.exec('ALTER TABLE rss_feeds ADD COLUMN icon_url TEXT')

  const entryCols = rssDb.prepare('PRAGMA table_info(rss_entries)').all() as Array<{ name: string }>
  const entryNames = new Set(entryCols.map((c) => c.name))
  if (!entryNames.has('image_url')) rssDb.exec('ALTER TABLE rss_entries ADD COLUMN image_url TEXT')

  try {
    rssDb.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_rss_entries_feed_guid ON rss_entries(feed_id, guid);
    `)
  } catch {
    /* 旧库若有重复 guid 则跳过 */
  }

  seedSystemGroups(rssDb)
  migrateLegacyDefaultGroup(rssDb)
}

function seedSystemGroups(rssDb: Database.Database): void {
  const insert = rssDb.prepare(
    'INSERT OR IGNORE INTO rss_groups (id, name, sort_order, kind) VALUES (?, ?, ?, ?)'
  )
  insert.run(RSS_RECYCLE_GROUP_ID, '回收站', 9999, 'recycle')

  for (const g of SYSTEM_GROUPS) {
    insert.run(g.id, g.name, g.sortOrder, 'normal')
  }

  // 旧版「默认」分组：将其中系统订阅迁出后删除空分组
  insert.run(RSS_DEFAULT_GROUP_ID, '默认', 0, 'normal')
}

function migrateLegacyDefaultGroup(rssDb: Database.Database): void {
  const orphan = rssDb
    .prepare(
      `SELECT id FROM rss_feeds WHERE is_default = 1 AND (group_id IS NULL OR group_id = '' OR group_id = ?)`
    )
    .all(RSS_DEFAULT_GROUP_ID) as Array<{ id: string }>
  if (orphan.length) {
    rssDb
      .prepare(`UPDATE rss_feeds SET group_id = ? WHERE is_default = 1 AND group_id IN ('', ?) OR group_id IS NULL`)
      .run(RSS_GROUP_TECH_ID, RSS_DEFAULT_GROUP_ID)
  }

  rssDb
    .prepare(
      `UPDATE rss_feeds SET group_id = ? WHERE group_id IS NULL OR group_id = ''`
    )
    .run(RSS_GROUP_TECH_ID)
}

const URL_PATTERN = /^https?:\/\/.+/i

export function validateFeedTitle(title: string): string | null {
  const t = title.trim()
  if (!t) return '请填写订阅名称'
  if (t.length > 120) return '名称过长（最多 120 字）'
  return null
}

export function validateFeedUrl(url: string): string | null {
  const u = url.trim()
  if (!u) return '请填写 Feed 地址'
  if (!URL_PATTERN.test(u)) return '请输入以 http:// 或 https:// 开头的地址'
  if (u.length > 2048) return '地址过长'
  return null
}
