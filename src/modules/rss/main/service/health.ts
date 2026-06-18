import type { Output } from 'rss-parser'
import { extractEntryImageUrl } from './entryMedia'
import { createRssParser } from './parser'

const PROBE_TIMEOUT_MS = 15_000
const SAMPLE_SIZE = 15
const parser = createRssParser(PROBE_TIMEOUT_MS)

export interface FeedHealthResult {
  ok: boolean
  hasContent: boolean
  hasThumbnail: boolean
  /** 既无正文条目也无任何缩略图/配图时可删除 */
  shouldRemove: boolean
  error?: string
}

export function assessFeedQuality(parsed: Output): { hasContent: boolean; hasThumbnail: boolean } {
  const items = parsed.items ?? []
  let hasContent = false
  let hasThumbnail = false

  for (const item of items.slice(0, SAMPLE_SIZE)) {
    const title = item.title?.trim()
    const link = item.link?.trim()
    const summary = String(item.contentSnippet ?? item.summary ?? '').trim()
    const content = String(item.content ?? item['content:encoded'] ?? '').trim()

    if (title || link) {
      if (link || summary || content) hasContent = true
    }
    if (extractEntryImageUrl(item)) hasThumbnail = true
  }

  return { hasContent, hasThumbnail }
}

/** 探测 Feed：能否拉取、是否有正文、是否有配图 */
export async function evaluateFeedHealth(url: string): Promise<FeedHealthResult> {
  const trimmed = url.trim()
  if (!trimmed) {
    return {
      ok: false,
      hasContent: false,
      hasThumbnail: false,
      shouldRemove: true,
      error: '地址为空'
    }
  }

  try {
    const parsed = await parser.parseURL(trimmed)
    if (!parsed.items?.length) {
      return {
        ok: false,
        hasContent: false,
        hasThumbnail: false,
        shouldRemove: true,
        error: 'Feed 无文章条目'
      }
    }
    const { hasContent, hasThumbnail } = assessFeedQuality(parsed)
    const shouldRemove = !hasContent && !hasThumbnail
    return {
      ok: true,
      hasContent,
      hasThumbnail,
      shouldRemove,
      error: shouldRemove ? '无正文且无配图' : undefined
    }
  } catch (e) {
    return {
      ok: false,
      hasContent: false,
      hasThumbnail: false,
      shouldRemove: true,
      error: e instanceof Error ? e.message : '连接失败'
    }
  }
}
