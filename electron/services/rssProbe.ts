import Parser from 'rss-parser'

const PROBE_TIMEOUT_MS = 12_000
const USER_AGENT = 'Wanwu/1.0 (Desktop; +https://github.com/MonoKelvin/Wanwu)'

const parser = new Parser({
  timeout: PROBE_TIMEOUT_MS,
  headers: { 'User-Agent': USER_AGENT }
})

/** 探测 Feed 是否可拉取（与刷新逻辑一致，避免仅 HEAD 被 CDN 拒绝） */
export async function probeRssFeedUrl(url: string): Promise<{ ok: boolean; error?: string }> {
  const trimmed = url.trim()
  if (!trimmed) return { ok: false, error: '地址为空' }
  try {
    const parsed = await parser.parseURL(trimmed)
    if (!parsed.items?.length) {
      return { ok: false, error: 'Feed 无文章条目' }
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : '连接失败' }
  }
}
