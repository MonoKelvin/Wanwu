import { sleep } from './media-shared.mjs'

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'

function decodeHtml(s) {
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * @param {string} html
 * @returns {string[]}
 */
function extractParagraphs(html) {
  const parts = []
  const patterns = [
    /<div[^>]*class="[^"]*para[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi,
    /<span[^>]*class="[^"]*text[^"]*"[^>]*>([\s\S]*?)<\/span>/gi
  ]
  for (const re of patterns) {
    let m
    while ((m = re.exec(html))) {
      const text = decodeHtml(m[1])
      if (text.length > 30) parts.push(text)
    }
    if (parts.length >= 3) break
  }
  return [...new Set(parts)].slice(0, 10)
}

function extractSummary(html) {
  const m =
    html.match(/class="lemmaSummary[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/i) ||
    html.match(/"lemmaDesc":"([^"]+)"/) ||
    html.match(/"lemmaSummary":"([^"]+)"/)
  if (!m) return ''
  return decodeHtml(m[1].replace(/\\n/g, '\n'))
}

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, 'Accept-Language': 'zh-CN,zh;q=0.9' },
    redirect: 'follow',
    signal: AbortSignal.timeout(25_000)
  })
  if (!res.ok) return null
  return res.text()
}

function buildMarkdown(title, summary, paragraphs, sourceUrl) {
  const lines = [`# ${title}`, '']
  if (summary) lines.push(summary, '')
  if (paragraphs.length) {
    lines.push('## 详情', '')
    for (const p of paragraphs) lines.push(p, '')
  }
  lines.push('---', '', `> 来源：[百度百科](${sourceUrl})`, '')
  const md = lines.join('\n').trim()
  return md.length > 120 ? md : null
}

async function fetchBaikeItemPage(keyword) {
  const itemUrl = `https://baike.baidu.com/item/${encodeURIComponent(keyword)}`
  const html = await fetchHtml(itemUrl)
  if (!html || html.includes('百度百科尚未收录')) return null

  const title =
    decodeHtml(html.match(/<title>([^<]+)<\/title>/i)?.[1] ?? keyword).replace(
      /_百度百科.*$/,
      ''
    ) || keyword

  const summary = extractSummary(html)
  const paragraphs = extractParagraphs(html)
  return buildMarkdown(title, summary, paragraphs, itemUrl)
}

async function fetchZhWikiMarkdown(keyword) {
  const url = `https://zh.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(keyword)}`
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA },
      signal: AbortSignal.timeout(15_000)
    })
    if (!res.ok) return null
    const data = await res.json()
    if (!data.extract) return null
    const page = data.content_urls?.desktop?.page ?? data.content_urls?.mobile?.page
    return `# ${data.title}\n\n${data.extract}\n\n---\n\n> 来源：[维基百科](${page})\n`
  } catch {
    return null
  }
}

/**
 * @param {string} keyword
 * @returns {Promise<string|null>}
 */
export async function fetchBaikeMarkdown(keyword) {
  const q = keyword.trim()
  if (!q) return null

  let md = await fetchBaikeItemPage(q)
  if (md) return md

  await sleep(350)

  const searchUrl = `https://baike.baidu.com/search?word=${encodeURIComponent(q)}`
  const searchHtml = await fetchHtml(searchUrl)
  if (searchHtml) {
    const itemPath = searchHtml.match(/href="(\/item\/[^"?#]+)"/)?.[1]
    if (itemPath) {
      const itemUrl = `https://baike.baidu.com${itemPath}`
      const html = await fetchHtml(itemUrl)
      if (html) {
        const title = decodeHtml(q)
        const summary = extractSummary(html)
        const paragraphs = extractParagraphs(html)
        md = buildMarkdown(title, summary, paragraphs, itemUrl)
        if (md) return md
      }
    }
  }

  md = await fetchZhWikiMarkdown(q)
  return md
}

/**
 * @param {string} name 条目名称
 */
export function baikeKeywordsFromName(name) {
  const primary = name.split(/[（(]/)[0].trim()
  const paren = name.match(/[（(]([^）)]+)[）)]/)?.[1]?.trim()
  const en = name.match(/[A-Za-z][A-Za-z0-9\s.:&'-]+/)?.[0]?.trim()
  const keys = [primary, paren, en, name.trim()].filter(Boolean)
  if (primary && !/电影|影片/.test(primary)) {
    keys.push(`${primary}电影`, `${primary}（电影）`)
  }
  const noSpace = primary.replace(/\s+/g, '')
  if (noSpace !== primary) keys.push(noSpace)
  const zhOnly = primary.replace(/[A-Za-z0-9\s.:&'-]+/g, '').trim()
  if (zhOnly && zhOnly !== primary) keys.push(zhOnly, `${zhOnly}电影`)
  return [...new Set(keys.filter(Boolean))].slice(0, 10)
}
