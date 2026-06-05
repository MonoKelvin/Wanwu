import type Database from 'better-sqlite3'
import { randomUUID } from 'crypto'
import {
  RSS_GROUP_ANIME_ID,
  RSS_GROUP_BLOG_ID,
  RSS_GROUP_COMMUNITY_ID,
  RSS_GROUP_LITERATURE_ID,
  RSS_GROUP_LIFE_ID,
  RSS_GROUP_OTHER_ID,
  RSS_GROUP_PHYSICS_ID,
  RSS_GROUP_SCIENCE_ID,
  RSS_GROUP_TECH_ID,
  RSS_GROUP_VIDEO_ID
} from '../../../src/shared/types/rss'
import { ensureRssSchema } from './schema'
import { faviconUrlFromSite } from './entryMedia'

export interface DefaultRssFeed {
  title: string
  url: string
  groupId: string
  sortOrder: number
  accessWarning?: string
  accessWarningLocked?: boolean
}

/**
 * 已从预置列表移除（启动时从库中删除对应默认源）。
 * 含历史失效源及「其他」分组中不可达源（经 scripts/probe-rss-feeds*.mjs 探测）。
 */
export const REMOVED_DEFAULT_FEED_URLS = [
  'https://zh.wikipedia.org/w/api.php?action=featuredfeed&feed=featured&feedformat=atom',
  'https://www.pingwest.com/feed',
  'https://www.guokr.com/rss/',
  'https://www.leiphone.com/feed',
  'https://www.geekpark.net/rss',
  'https://36kr.com/feed',
  'https://www.v2ex.com/index.xml',
  'https://www.gcores.com/rss/home',
  'https://www.huxiu.com/rss/0.xml',
  'https://feeds.feedburner.com/TEDTalks_video',
  'https://www.animenewsnetwork.com/news/rss.xml',
  'https://book.douban.com/feed/latest',
  'https://www.jianshu.com/rss',
  'https://linux.cn/rss.xml',
  'https://dig.chouti.com/rss.xml',
  'https://www.liaoxuefeng.com/feed.xml',
  'https://www.zhangxinxu.com/wordpress/feed/',
  'https://jandan.net/feed',
  'https://www.engadget.com/rss.xml'
]

/** 系统预置订阅（入库前经脚本探测可访问且有条目） */
export const DEFAULT_RSS_FEEDS: DefaultRssFeed[] = [
  // 博客专栏
  { title: '阮一峰的网络日志', url: 'https://www.ruanyifeng.com/blog/atom.xml', groupId: RSS_GROUP_BLOG_ID, sortOrder: 1 },
  { title: '酷壳 CoolShell', url: 'https://coolshell.cn/feed', groupId: RSS_GROUP_BLOG_ID, sortOrder: 2 },
  { title: '异次元软件世界', url: 'https://www.iplaysoft.com/feed', groupId: RSS_GROUP_BLOG_ID, sortOrder: 3 },
  { title: '谢益辉博客', url: 'https://yihui.org/cn/index.xml', groupId: RSS_GROUP_BLOG_ID, sortOrder: 4 },
  { title: '美团技术团队', url: 'https://tech.meituan.com/feed/', groupId: RSS_GROUP_BLOG_ID, sortOrder: 5 },

  // 科技资讯
  { title: 'IT之家', url: 'https://www.ithome.com/rss/', groupId: RSS_GROUP_TECH_ID, sortOrder: 1 },
  { title: '量子位', url: 'https://www.qbitai.com/feed', groupId: RSS_GROUP_TECH_ID, sortOrder: 2 },
  { title: '少数派', url: 'https://sspai.com/feed', groupId: RSS_GROUP_TECH_ID, sortOrder: 3 },
  { title: '爱范儿', url: 'https://www.ifanr.com/feed', groupId: RSS_GROUP_TECH_ID, sortOrder: 4 },
  { title: '开源中国', url: 'https://www.oschina.net/news/rss', groupId: RSS_GROUP_TECH_ID, sortOrder: 5 },
  { title: 'Solidot', url: 'https://www.solidot.org/index.rss', groupId: RSS_GROUP_TECH_ID, sortOrder: 6 },
  { title: '新浪科技', url: 'https://rss.sina.com.cn/tech/rollnews.xml', groupId: RSS_GROUP_TECH_ID, sortOrder: 7 },
  { title: '虎嗅', url: 'https://rss.huxiu.com/', groupId: RSS_GROUP_TECH_ID, sortOrder: 8 },
  { title: 'HelloGitHub', url: 'https://hellogithub.com/rss', groupId: RSS_GROUP_TECH_ID, sortOrder: 9 },

  // 社区
  { title: '掘金', url: 'https://juejin.cn/rss', groupId: RSS_GROUP_COMMUNITY_ID, sortOrder: 1 },

  // 视频（B 站 / 豆瓣电影，经 RSSHub 聚合，国内可访问）
  { title: 'B站 · 综合热门', url: 'https://rsshub.rssforever.com/bilibili/popular/all', groupId: RSS_GROUP_VIDEO_ID, sortOrder: 1 },
  { title: 'B站 · 每周必看', url: 'https://rsshub.rssforever.com/bilibili/weekly', groupId: RSS_GROUP_VIDEO_ID, sortOrder: 2 },
  { title: 'B站 · 电影', url: 'https://rsshub.rssforever.com/bilibili/partion/23', groupId: RSS_GROUP_VIDEO_ID, sortOrder: 3 },
  { title: 'B站 · 纪录片', url: 'https://rsshub.rssforever.com/bilibili/partion/177', groupId: RSS_GROUP_VIDEO_ID, sortOrder: 4 },
  { title: 'B站 · 影视杂谈', url: 'https://rsshub.rssforever.com/bilibili/partion/182', groupId: RSS_GROUP_VIDEO_ID, sortOrder: 5 },
  { title: '豆瓣 · 正在热映', url: 'https://rsshub.rssforever.com/douban/movie/playing', groupId: RSS_GROUP_VIDEO_ID, sortOrder: 6 },
  { title: '豆瓣 · 一周口碑榜', url: 'https://rsshub.rssforever.com/douban/movie/weekly', groupId: RSS_GROUP_VIDEO_ID, sortOrder: 7 },
  { title: '豆瓣 · 最受关注', url: 'https://rsshub.rssforever.com/douban/movie/coming', groupId: RSS_GROUP_VIDEO_ID, sortOrder: 8 },

  // 二次元
  { title: 'B站 · 动画', url: 'https://rsshub.rssforever.com/bilibili/partion/33', groupId: RSS_GROUP_ANIME_ID, sortOrder: 1 },
  { title: 'Anime1 · 新番', url: 'https://rsshub.rssforever.com/anime1/anime/1/0', groupId: RSS_GROUP_ANIME_ID, sortOrder: 2 },
  { title: '哔哩轻小说 · 月榜', url: 'https://lnovel.animes.garden/bili/top/monthvisit/feed.xml', groupId: RSS_GROUP_ANIME_ID, sortOrder: 3 },
  { title: 'B站 · 手办模玩', url: 'https://rsshub.rssforever.com/bilibili/partion/210', groupId: RSS_GROUP_ANIME_ID, sortOrder: 4 },
  { title: 'B站 · 鬼畜', url: 'https://rsshub.rssforever.com/bilibili/partion/119', groupId: RSS_GROUP_ANIME_ID, sortOrder: 5 },

  // 文学
  { title: '豆瓣 · 新书速递', url: 'https://rsshub.rssforever.com/douban/book/latest', groupId: RSS_GROUP_LITERATURE_ID, sortOrder: 1 },
  { title: '简书 · 热门', url: 'https://rsshub.rssforever.com/jianshu/home', groupId: RSS_GROUP_LITERATURE_ID, sortOrder: 2 },
  { title: '澎湃新闻', url: 'https://rsshub.rssforever.com/thepaper/featured', groupId: RSS_GROUP_LITERATURE_ID, sortOrder: 3 },

  // 科学（非计算机向）
  { title: '果壳 · 科学', url: 'https://rsshub.rssforever.com/guokr/scientific', groupId: RSS_GROUP_SCIENCE_ID, sortOrder: 1 },
  { title: 'B站 · 知识', url: 'https://rsshub.rssforever.com/bilibili/partion/36', groupId: RSS_GROUP_SCIENCE_ID, sortOrder: 2 },

  // 物理
  { title: 'B站 · 科学科普', url: 'https://rsshub.rssforever.com/bilibili/partion/188', groupId: RSS_GROUP_PHYSICS_ID, sortOrder: 1 },

  // 生活
  { title: '理想生活实验室', url: 'https://www.toodaylab.com/feed', groupId: RSS_GROUP_LIFE_ID, sortOrder: 1 },
  { title: 'B站 · 生活', url: 'https://rsshub.rssforever.com/bilibili/partion/160', groupId: RSS_GROUP_LIFE_ID, sortOrder: 2 },
  { title: 'B站 · 美食', url: 'https://rsshub.rssforever.com/bilibili/partion/211', groupId: RSS_GROUP_LIFE_ID, sortOrder: 3 },
  { title: 'B站 · 时尚', url: 'https://rsshub.rssforever.com/bilibili/partion/155', groupId: RSS_GROUP_LIFE_ID, sortOrder: 4 },
  { title: '知乎 · 日报', url: 'https://rsshub.rssforever.com/zhihu/daily', groupId: RSS_GROUP_LIFE_ID, sortOrder: 5 },

  // 其他：以配图为主的源（启动时会探测，无正文且无配图则自动删除）
  { title: 'NASA 每日一图', url: 'https://apod.nasa.gov/apod.rss', groupId: RSS_GROUP_OTHER_ID, sortOrder: 1 },
  { title: 'PetaPixel 摄影', url: 'https://petapixel.com/feed/', groupId: RSS_GROUP_OTHER_ID, sortOrder: 2 },
  { title: 'Colossal 艺术', url: 'https://www.thisiscolossal.com/feed/', groupId: RSS_GROUP_OTHER_ID, sortOrder: 3 }
]

const DEFAULT_URL_SET = new Set(DEFAULT_RSS_FEEDS.map((f) => f.url))

function purgeRemovedDefaultFeeds(rssDb: Database.Database): void {
  const findId = rssDb.prepare('SELECT id FROM rss_feeds WHERE url = ? AND is_default = 1')
  const delEntries = rssDb.prepare('DELETE FROM rss_entries WHERE feed_id = ?')
  const delFeed = rssDb.prepare('DELETE FROM rss_feeds WHERE id = ?')

  for (const url of REMOVED_DEFAULT_FEED_URLS) {
    const row = findId.get(url) as { id: string } | undefined
    if (!row) continue
    delEntries.run(row.id)
    delFeed.run(row.id)
  }
}

/** 删除不在当前预置表中的历史默认源 */
function purgeOrphanDefaultFeeds(rssDb: Database.Database): void {
  const rows = rssDb
    .prepare('SELECT id, url FROM rss_feeds WHERE is_default = 1')
    .all() as Array<{ id: string; url: string }>
  const delEntries = rssDb.prepare('DELETE FROM rss_entries WHERE feed_id = ?')
  const delFeed = rssDb.prepare('DELETE FROM rss_feeds WHERE id = ?')

  for (const row of rows) {
    if (DEFAULT_URL_SET.has(row.url) || REMOVED_DEFAULT_FEED_URLS.includes(row.url)) continue
    delEntries.run(row.id)
    delFeed.run(row.id)
  }
}

export function seedDefaultRssFeeds(rssDb: Database.Database): void {
  ensureRssSchema(rssDb)
  purgeRemovedDefaultFeeds(rssDb)
  purgeOrphanDefaultFeeds(rssDb)

  const countRow = rssDb.prepare('SELECT COUNT(*) as c FROM rss_feeds').get() as { c: number }
  const hasAny = countRow.c > 0
  const existsStmt = rssDb.prepare('SELECT id FROM rss_feeds WHERE url = ?')
  const insert = rssDb.prepare(
    `INSERT INTO rss_feeds (id, title, url, group_id, is_default, enabled, access_warning, access_warning_locked, sort_order, icon_url)
     VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?)`
  )
  const updateMeta = rssDb.prepare(
    `UPDATE rss_feeds SET title = ?, group_id = ?, sort_order = ?, access_warning = ?, access_warning_locked = ?, icon_url = ?
     WHERE url = ? AND is_default = 1`
  )

  let hasDefault = Boolean(rssDb.prepare('SELECT id FROM rss_feeds WHERE is_default = 1').get())

  for (const feed of DEFAULT_RSS_FEEDS) {
    const iconUrl = faviconUrlFromSite(feed.url)
    if (!existsStmt.get(feed.url)) {
      const isDefault = !hasAny && !hasDefault ? 1 : 0
      insert.run(
        randomUUID(),
        feed.title,
        feed.url,
        feed.groupId,
        isDefault,
        feed.accessWarning ?? null,
        feed.accessWarningLocked ? 1 : 0,
        feed.sortOrder,
        iconUrl || null
      )
      if (isDefault) hasDefault = true
    } else {
      updateMeta.run(
        feed.title,
        feed.groupId,
        feed.sortOrder,
        feed.accessWarning ?? null,
        feed.accessWarningLocked ? 1 : 0,
        iconUrl || null,
        feed.url
      )
    }
  }

  const patchIcon = rssDb.prepare(
    `UPDATE rss_feeds SET icon_url = ? WHERE url = ? AND is_default = 1 AND (icon_url IS NULL OR icon_url = '')`
  )
  for (const feed of DEFAULT_RSS_FEEDS) {
    const iconUrl = faviconUrlFromSite(feed.url)
    if (iconUrl) patchIcon.run(iconUrl, feed.url)
  }
}
