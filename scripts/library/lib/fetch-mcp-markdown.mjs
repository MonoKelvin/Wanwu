/**
 * 与 user-fetch MCP 类似：抓取 URL 并转为 Markdown 正文
 * 批量脚本使用 Jina Reader（稳定、免 API Key）
 */
import { withRateLimit } from './fetch-rate-limiter.mjs'

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 WanwuLibrarySeed/1.0'

/**
 * @param {string} url
 * @param {number} [maxLength]
 * @returns {Promise<{ title: string, markdown: string, url: string }|null>}
 */
export async function fetchUrlAsMarkdown(url, maxLength = 12_000) {
  const target = url.trim()
  if (!target.startsWith('http')) return null

  return withRateLimit('web', async () => {
    try {
      const readerUrl = `https://r.jina.ai/${target}`
      const res = await fetch(readerUrl, {
        headers: { 'User-Agent': UA, Accept: 'text/plain,text/markdown,*/*' },
        signal: AbortSignal.timeout(28_000)
      })
      if (!res.ok) return null
      let text = await res.text()
      if (!text || text.length < 120) return null

      const title = text.match(/^Title:\s*(.+)$/m)?.[1]?.trim() ?? ''
      text = text
        .replace(/^Title:.*$/m, '')
        .replace(/^URL Source:.*$/m, '')
        .replace(/^Markdown Content:\s*/m, '')
        .trim()

      if (text.length > maxLength) text = `${text.slice(0, maxLength)}\n\n…（下文已截断）`
      return { title: title || target, markdown: text, url: target }
    } catch {
      return null
    }
  })
}
