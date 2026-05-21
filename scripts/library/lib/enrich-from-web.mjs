import { sleep } from './media-shared.mjs'
import { baikeKeywordsFromName, fetchBaikeMarkdown } from './baike-fetch.mjs'

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 WanwuLibrarySeed/1.0'

function decodeHtml(s) {
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

async function fetchJson(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, 'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.5' },
      signal: AbortSignal.timeout(22_000)
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

async function fetchHtml(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, 'Accept-Language': 'zh-CN,zh;q=0.9' },
      redirect: 'follow',
      signal: AbortSignal.timeout(22_000)
    })
    if (!res.ok) return null
    return res.text()
  } catch {
    return null
  }
}

/**
 * @param {string} keyword
 * @returns {Promise<{ title: string, extract: string, url: string }|null>}
 */
export async function fetchWikiLongExtract(keyword) {
  const q = keyword.trim()
  if (!q) return null

  const searchUrl =
    `https://zh.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(q)}` +
    `&limit=3&namespace=0&format=json&origin=*`
  const search = await fetchJson(searchUrl)
  const titles = search?.[1] ?? []
  const title = titles[0] ?? q

  const extractUrl =
    `https://zh.wikipedia.org/w/api.php?action=query&format=json&origin=*&utf8=1` +
    `&prop=extracts&explaintext=1&exsectionformat=plain` +
    `&titles=${encodeURIComponent(title)}`
  const data = await fetchJson(extractUrl)
  const pages = data?.query?.pages ?? {}
  const page = Object.values(pages)[0]
  if (!page || page.missing !== undefined) return null
  const extract = (page.extract ?? '').trim()
  if (extract.length < 80) return null

  const pageUrl = `https://zh.wikipedia.org/wiki/${encodeURIComponent(page.title ?? title)}`
  return { title: page.title ?? title, extract, url: pageUrl }
}

/**
 * @param {string} html
 * @returns {Record<string, string>}
 */
export function extractBaikeSpecs(html) {
  const specs = {}
  const patterns = [
    /<dt[^>]*class="[^"]*basicInfo-item-name[^"]*"[^>]*>([^<]+)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/gi,
    /<dt[^>]*>([^<]+)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/gi
  ]
  for (const re of patterns) {
    let m
    while ((m = re.exec(html))) {
      const key = decodeHtml(m[1]).replace(/\[编辑\]/g, '').trim()
      const val = decodeHtml(m[2]).replace(/\[编辑\]/g, '').trim()
      if (key && val && key.length < 24 && val.length < 200) specs[key] = val
    }
    if (Object.keys(specs).length >= 4) break
  }
  return specs
}

/**
 * @param {string} keyword
 */
export async function fetchBaikeRich(keyword) {
  const itemUrl = `https://baike.baidu.com/item/${encodeURIComponent(keyword)}`
  const html = await fetchHtml(itemUrl)
  if (!html || html.includes('百度百科尚未收录')) return null

  const title =
    decodeHtml(html.match(/<title>([^<]+)<\/title>/i)?.[1] ?? keyword).replace(
      /_百度百科.*$/,
      ''
    ) || keyword

  const summaryMatch =
    html.match(/class="lemmaSummary[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/i) ||
    html.match(/"lemmaDesc":"([^"]+)"/)
  const summary = summaryMatch ? decodeHtml(summaryMatch[1].replace(/\\n/g, '\n')) : ''

  const paragraphs = []
  const paraRe =
    /<div[^>]*class="[^"]*para[^"]*"[^>]*title="([^"]*)"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi
  let m
  while ((m = paraRe.exec(html))) {
    const heading = decodeHtml(m[1])
    const body = decodeHtml(m[2])
    if (body.length > 40) paragraphs.push({ heading, body })
  }
  if (paragraphs.length < 2) {
    const spanRe = /<span[^>]*class="[^"]*text[^"]*"[^>]*>([\s\S]*?)<\/span>/gi
    while ((m = spanRe.exec(html))) {
      const body = decodeHtml(m[1])
      if (body.length > 60) paragraphs.push({ heading: '', body })
    }
  }

  const specs = extractBaikeSpecs(html)
  return { title, summary, paragraphs: paragraphs.slice(0, 24), specs, url: itemUrl }
}

/**
 * @param {string} name
 * @returns {Promise<{ markdown: string, specs: Record<string, string>, source: string }|null>}
 */
/**
 * @param {string} name
 * @param {string[]} [extraKeywords]
 */
export async function fetchItemReference(name, extraKeywords = []) {
  const keywords = [...new Set([...extraKeywords, ...baikeKeywordsFromName(name)])]

  for (const kw of keywords) {
    const rich = await fetchBaikeRich(kw)
    if (rich && (rich.paragraphs.length >= 2 || rich.summary.length > 100)) {
      const lines = [`# ${rich.title}`, '']
      if (rich.summary) lines.push(rich.summary, '')
      for (const p of rich.paragraphs) {
        if (p.heading) lines.push(`## ${p.heading}`, '')
        lines.push(p.body, '')
      }
      lines.push('---', '', `> 来源：[百度百科](${rich.url})`, '')
      return {
        markdown: lines.join('\n').trim(),
        specs: rich.specs,
        source: 'baike'
      }
    }
    const md = await fetchBaikeMarkdown(kw)
    if (md && md.length > 200) {
      return { markdown: md, specs: {}, source: 'baike-search' }
    }
    await sleep(700)
  }

  for (const kw of keywords) {
    const wiki = await fetchWikiLongExtract(kw)
    if (wiki) {
      const lines = [`# ${wiki.title}`, '', wiki.extract, '', '---', '', `> 来源：[维基百科](${wiki.url})`, '']
      return {
        markdown: lines.join('\n').trim(),
        specs: {},
        source: 'wikipedia'
      }
    }
    await sleep(500)
  }

  const fallback = await fetchBaikeMarkdown(name)
  if (fallback) return { markdown: fallback, specs: {}, source: 'baike-fallback' }

  return null
}
