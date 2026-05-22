import { RSS_RECYCLE_GROUP_ID } from '../../../src/shared/types/rss'
import type { AppSettings } from '../../../src/shared/types/settings'
import type { DatabaseService } from '../core/database'
import type { RssService } from './service'
import { normalizeAppSettings } from '../data/settings'

export interface RssSchedulerServices {
  db: DatabaseService | null
  rss: RssService | null
}

let timer: ReturnType<typeof setInterval> | null = null
let running = false

function getSettings(services: RssSchedulerServices): AppSettings {
  const raw = services.db?.getAppSettings()
  return normalizeAppSettings(raw ?? {})
}

async function runRefresh(services: RssSchedulerServices): Promise<void> {
  if (running || !services.rss || !services.db) return
  running = true
  try {
    const settings = getSettings(services)
    const feeds = services.rss
      .listFeeds()
      .filter((f) => f.groupId !== RSS_RECYCLE_GROUP_ID && !f.deletedAt && f.enabled)
    for (const feed of feeds) {
      try {
        await services.rss.fetchFeed(feed.id, settings.rssFetchLimit)
      } catch (err) {
        console.warn('[wanwu] rss auto-refresh failed', feed.id, err)
      }
    }
  } finally {
    running = false
  }
}

export function applyRssAutoRefreshSchedule(services: RssSchedulerServices): void {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
  const minutes = getSettings(services).rssAutoRefreshMinutes
  if (!minutes || !services.rss) return
  const ms = minutes * 60 * 1000
  timer = setInterval(() => {
    void runRefresh(services)
  }, ms)
}

export function stopRssAutoRefreshSchedule(): void {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}
