import type { AppSettings } from '@shared/types/settings'
import type { MainProcessInitContext } from '@shared/module-bridge/mainProcessRegistry'
import { getModuleRuntimeService } from '@shared/module-bridge/mainProcessRegistry'
import { RSS_MODULE_ID } from '@modules/rss/domain/moduleId'
import { RSS_RECYCLE_GROUP_ID } from '@modules/rss/domain/types'
import type { DatabaseService } from '../../../../electron/services/core/database'
import { normalizeAppSettings } from '@shared/settings/normalizeAppSettings'
import { readRssModuleSettings } from '@modules/rss/domain/settings'
import type { RssService } from './service/service'

let timer: ReturnType<typeof setInterval> | null = null
let running = false
let ctxRef: MainProcessInitContext | null = null

function getService(): RssService | null {
  if (!ctxRef) return null
  return getModuleRuntimeService<RssService>(ctxRef, RSS_MODULE_ID)
}

async function runRefresh(): Promise<void> {
  const rss = getService()
  const db = ctxRef?.services.db as DatabaseService | null
  if (running || !rss || !db) return
  running = true
  try {
    const settings = normalizeAppSettings(db.getAppSettings() ?? {})
    const rssSettings = readRssModuleSettings(settings)
    const feeds = rss
      .listFeeds()
      .filter((f) => f.groupId !== RSS_RECYCLE_GROUP_ID && !f.deletedAt && f.enabled)
    for (const feed of feeds) {
      try {
        await rss.fetchFeed(feed.id, rssSettings.fetchLimit)
      } catch (err) {
        console.warn('[wanwu] rss auto-refresh failed', feed.id, err)
      }
    }
  } finally {
    running = false
  }
}

export function bindRssSchedulerContext(ctx: MainProcessInitContext): void {
  ctxRef = ctx
}

export function applyRssAutoRefreshSchedule(settings: AppSettings): void {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
  const rssSettings = readRssModuleSettings(settings)
  const minutes = rssSettings.autoRefreshMinutes
  if (!minutes || !getService()) return
  const ms = minutes * 60 * 1000
  timer = setInterval(() => {
    void runRefresh()
  }, ms)
}

export function stopRssAutoRefreshSchedule(): void {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}
