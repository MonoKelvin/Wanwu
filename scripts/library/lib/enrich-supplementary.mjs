import { fetchUrlAsMarkdown } from './fetch-mcp-markdown.mjs'

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 WanwuLibrarySeed/1.0'

function cleanText(s) {
  return (s ?? '')
    .replace(/\[\d+[\s\-]*\d*\]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

async function fetchJson(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'application/json' },
      signal: AbortSignal.timeout(35_000)
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

async function fetchText(url, timeoutMs = 25_000) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'text/html,text/plain,*/*' },
      signal: AbortSignal.timeout(timeoutMs)
    })
    if (!res.ok) return null
    return res.text()
  } catch {
    return null
  }
}

const BLOCK_HOSTS =
  /baike\.baidu|baidu\.com\/link|google\.|gstatic|facebook|twitter\.com\/intent|javascript:/i

const PREFERRED_HOSTS =
  /wikipedia\.org|wikidata\.org|moegirl|zhihu\.com|douban\.com|britannica|nationalgeographic|smithsonian|nature\.com|arxiv|gov\.cn|edu\.|museum|fandom\.com/i

/**
 * @param {string} keyword
 * @param {string} [lang] zh|en
 */
export async function fetchWikiFullExtract(keyword, lang = 'zh') {
  const host = lang === 'en' ? 'en.wikipedia.org' : 'zh.wikipedia.org'
  const searchUrl =
    `https://${host}/w/api.php?action=opensearch&search=${encodeURIComponent(keyword)}` +
    `&limit=2&namespace=0&format=json&origin=*`
  const search = await fetchJson(searchUrl)
  const title = search?.[1]?.[0] ?? keyword
  const extractUrl =
    `https://${host}/w/api.php?action=query&format=json&origin=*&utf8=1` +
    `&prop=extracts&explaintext=1&exsectionformat=plain` +
    `&titles=${encodeURIComponent(title)}`
  const data = await fetchJson(extractUrl)
  const page = Object.values(data?.query?.pages ?? {})[0]
  if (!page || page.missing !== undefined) return null
  const extract = (page.extract ?? '').trim()
  if (extract.length < 100) return null
  return {
    title: page.title ?? title,
    extract,
    url: `https://${host}/wiki/${encodeURIComponent(page.title ?? title)}`,
    lang
  }
}

/** @param {string} keyword */
export async function fetchMoegirlArticle(keyword) {
  const api =
    `https://zh.moegirl.org.cn/api.php?action=parse&format=json&prop=text|displaytitle` +
    `&page=${encodeURIComponent(keyword)}&redirects=1&origin=*`
  const data = await fetchJson(api)
  const parsed = data?.parse
  if (!parsed?.text?.['*']) return null
  const html = parsed.text['*']
  const paras = []
  const re = /<p[^>]*>([\s\S]*?)<\/p>/gi
  let m
  while ((m = re.exec(html))) {
    const t = cleanText(m[1].replace(/<[^>]+>/g, ' '))
    if (t.length > 60) paras.push(t)
  }
  if (paras.length < 2) return null
  const title = cleanText(parsed.displaytitle?.replace(/<[^>]+>/g, '') ?? keyword)
  return {
    title,
    paragraphs: paras.slice(0, 16),
    url: `https://zh.moegirl.org.cn/${encodeURIComponent(title)}`
  }
}

const WIKIDATA_PROPS = {
  作者: 'P50',
  导演: 'P57',
  开发商: 'P178',
  发行商: 'P123',
  产地: 'P495',
  制造商: 'P176',
  首播: 'P577',
  上映年份: 'P577',
  首发年份: 'P577',
  首版时间: 'P577',
  语言: 'P364',
  体裁: 'P136',
  类型: 'P31'
}

function entityLabel(entity, lang = 'zh') {
  if (!entity) return ''
  return entity.labels?.[lang]?.value ?? entity.labels?.en?.value ?? ''
}

/**
 * @param {string} keyword
 * @returns {Promise<Record<string, string>>}
 */
export async function fetchWikidataSpecs(keyword) {
  const searchUrl =
    `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(keyword)}` +
    `&language=zh&format=json&origin=*&limit=3`
  const search = await fetchJson(searchUrl)
  const id = search?.search?.[0]?.id
  if (!id) return {}

  const entityUrl =
    `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${id}` +
    `&props=claims&languages=zh|en&format=json&origin=*`
  const data = await fetchJson(entityUrl)
  const entity = data?.entities?.[id]
  if (!entity?.claims) return {}

  const specs = {}
  /** @type {Array<{ label: string, subId: string }>} */
  const entityFetches = []

  for (const [label, pid] of Object.entries(WIKIDATA_PROPS)) {
    const claim = entity.claims[pid]?.[0]
    if (!claim) continue
    const snak = claim.mainsnak
    if (snak.datavalue?.type === 'time') {
      const t = snak.datavalue.value.time?.replace(/^\+/, '').slice(0, 4)
      if (t) specs[label] = t
    } else if (snak.datavalue?.type === 'wikibase-entityid') {
      entityFetches.push({ label, subId: snak.datavalue.value.id })
    } else if (snak.datavalue?.value?.text) {
      specs[label] = snak.datavalue.value.text
    }
  }

  if (entityFetches.length) {
    const ids = [...new Set(entityFetches.map((e) => e.subId))].join('|')
    const batchUrl =
      `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${ids}` +
      `&props=labels&languages=zh|en&format=json&origin=*`
    const batch = await fetchJson(batchUrl)
    for (const { label, subId } of entityFetches) {
      const lbl = entityLabel(batch?.entities?.[subId])
      if (lbl) specs[label] = lbl
    }
  }

  return specs
}

/**
 * @param {string} query
 * @returns {Promise<string[]>}
 */
async function searchDuckDuckGoUrls(query) {
  const html = await fetchText(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`)
  if (!html) return []
  const urls = []
  const re = /uddg=([^&"]+)/g
  let m
  while ((m = re.exec(html))) {
    try {
      const url = decodeURIComponent(m[1])
      if (BLOCK_HOSTS.test(url)) continue
      if (!/^https?:\/\//i.test(url)) continue
      urls.push(url)
    } catch {
      /* skip */
    }
  }
  const ranked = [...new Set(urls)].sort((a, b) => {
    const pa = PREFERRED_HOSTS.test(a) ? 1 : 0
    const pb = PREFERRED_HOSTS.test(b) ? 1 : 0
    return pb - pa
  })
  return ranked.slice(0, 4)
}

/**
 * @param {string} url
 */
async function fetchJinaMarkdown(url) {
  const readerUrl = `https://r.jina.ai/${url}`
  const text = await fetchText(readerUrl)
  if (!text || text.length < 200) return null
  const title = text.match(/^Title:\s*(.+)$/m)?.[1]?.trim() ?? ''
  const body = text
    .replace(/^Title:.*$/m, '')
    .replace(/^URL Source:.*$/m, '')
    .replace(/^Markdown Content:\s*/m, '')
    .trim()
  const paras = body
    .split(/\n{2,}/)
    .map((p) => cleanText(p))
    .filter((p) => p.length > 80 && p.length < 2000)
  if (paras.length < 2) return null
  return { title: title || url, paragraphs: paras.slice(0, 8), url }
}

/**
 * @param {string} name
 * @param {string[]} keywords
 * @param {string} [categoryId]
 * @returns {Promise<{ sections: Array<{ heading: string, paragraphs: string[], source: string }>, specs: Record<string, string> }>}
 */
/**
 * @param {string} name
 * @param {string[]} keywords
 * @param {string} [categoryId]
 * @param {{ light?: boolean }} [opts] light=true 时跳过 DuckDuckGo/Jina（避免批量任务卡死）
 */
export async function fetchSupplementarySources(name, keywords, categoryId, opts = {}) {
  const sections = []
  const specs = {}
  const primary = keywords[0] ?? name.split(/[（(]/)[0].trim()

  const wd = await fetchWikidataSpecs(primary)
  Object.assign(specs, wd)
  await sleep(300)

  const enWiki = await fetchWikiFullExtract(primary, 'en')
  if (enWiki && enWiki.extract.length > 150) {
    sections.push({
      heading: '英文维基百科补充',
      paragraphs: enWiki.extract.split(/\n\n+/).filter((p) => p.length > 80).slice(0, 6),
      source: `[${enWiki.title}](${enWiki.url})`
    })
  }
  await sleep(300)

  if (categoryId === 'anime' || categoryId === 'game') {
    for (const kw of keywords.slice(0, 2)) {
      const moegirl = await fetchMoegirlArticle(kw)
      if (moegirl) {
        sections.push({
          heading: '萌娘百科 · 设定与背景',
          paragraphs: moegirl.paragraphs,
          source: `[${moegirl.title}](${moegirl.url})`
        })
        break
      }
      await sleep(400)
    }
  }

  if (!opts.light) {
    const urls = await searchDuckDuckGoUrls(`${primary} 历史 背景`)
    const url = urls[0]
    if (url) {
      const mcp = await fetchUrlAsMarkdown(url)
      if (mcp?.markdown) {
        const paras = mcp.markdown
          .split(/\n{2,}/)
          .map((p) => cleanText(p))
          .filter((p) => p.length > 80 && p.length < 1800)
        if (paras.length >= 2) {
          sections.push({
            heading: `专栏 · ${mcp.title.slice(0, 36)}`,
            paragraphs: paras.slice(0, 4),
            source: `[${mcp.title}](${mcp.url})`
          })
        }
      }
    }
  }

  return { sections, specs }
}

/**
 * @param {string} baseMarkdown
 * @param {{ sections: Array<{ heading: string, paragraphs: string[], source: string }> }} sup
 */
export function appendSupplementaryMarkdown(baseMarkdown, sup) {
  if (!sup.sections.length) return baseMarkdown
  const lines = [baseMarkdown.trim(), '']
  for (const sec of sup.sections) {
    lines.push(`## ${sec.heading}`, '')
    for (const p of sec.paragraphs) lines.push(p, '')
    lines.push(`> 参考：${sec.source}`, '')
  }
  return lines.join('\n').trim()
}
