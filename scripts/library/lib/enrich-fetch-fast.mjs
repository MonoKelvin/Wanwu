import { baikeKeywordsFromName, fetchBaikeMarkdown } from './baike-fetch.mjs'
import { fetchBaikeRich, fetchWikiLongExtract } from './enrich-from-web.mjs'
import { fetchWikiFullExtract, fetchMoegirlArticle, fetchWikidataSpecs } from './enrich-supplementary.mjs'
import { withRateLimit } from './fetch-rate-limiter.mjs'

const MIN_RICH_CHARS = 1800

function richToRef(rich) {
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

function wikiToRef(wiki) {
  return {
    markdown: `# ${wiki.title}\n\n${wiki.extract}\n\n---\n\n> 来源：[维基百科](${wiki.url})\n`,
    specs: {},
    source: 'wikipedia'
  }
}

function countMdChars(md) {
  return (md ?? '').replace(/\s/g, '').length
}

/**
 * 并行尝试百科 + 维基，取最先成功的优质结果
 * @param {string} name
 * @param {string[]} extraKeywords
 * @param {ReturnType<import('./fetch-cache.mjs').createFetchCache>} cache
 */
export async function fetchItemReferenceFast(name, extraKeywords, cache) {
  const keywords = [...new Set([...extraKeywords, ...baikeKeywordsFromName(name)])].slice(0, 6)
  const primary = keywords[0] ?? name

  const tryBaike = (kw) =>
    cache.get(`baike:${kw}`, () => withRateLimit('baike', () => fetchBaikeRich(kw)))

  const tryWiki = (kw) =>
    cache.get(`wiki:zh:${kw}`, () => withRateLimit('wiki', () => fetchWikiLongExtract(kw)))

  // 阶段 1：主关键词百科 + 中文维基并行；前 3 个别名百科并行
  const phase1 = await Promise.allSettled([
    ...keywords.slice(0, 3).map((kw) => tryBaike(kw)),
    tryWiki(primary)
  ])

  for (const r of phase1) {
    if (r.status !== 'fulfilled' || !r.value) continue
    const v = r.value
    if (v.paragraphs && (v.paragraphs.length >= 2 || v.summary?.length > 100)) {
      return richToRef(v)
    }
    if (v.extract && v.extract.length > 80) {
      return wikiToRef(v)
    }
  }

  // 阶段 2：剩余关键词并行（百科简版 + 维基）
  const rest = keywords.slice(3)
  if (rest.length) {
    const phase2 = await Promise.allSettled([
      ...rest.map((kw) => tryBaike(kw)),
      ...rest.slice(0, 2).map((kw) => tryWiki(kw))
    ])
    for (const r of phase2) {
      if (r.status !== 'fulfilled' || !r.value) continue
      const v = r.value
      if (v.paragraphs && (v.paragraphs.length >= 2 || v.summary?.length > 100)) {
        return richToRef(v)
      }
      if (v.extract && v.extract.length > 80) {
        return wikiToRef(v)
      }
    }
  }

  // 阶段 3：百科搜索页（仅主词）
  const md = await cache.get(`baike-md:${primary}`, () =>
    withRateLimit('baike', () => fetchBaikeMarkdown(primary))
  )
  if (md && md.length > 200) {
    return { markdown: md, specs: {}, source: 'baike-search' }
  }

  return null
}

/**
 * @param {string} name
 * @param {string[]} keywords
 * @param {string} categoryId
 * @param {ReturnType<import('./fetch-cache.mjs').createFetchCache>} cache
 * @param {{ skipBody?: boolean }} opts
 */
export async function fetchSupplementaryParallel(name, keywords, categoryId, cache, opts = {}) {
  const primary = keywords[0] ?? name.split(/[（(]/)[0].trim()
  const sections = []
  const specs = {}

  if (opts.skipBody) {
    const wd = await cache.get(`wd:${primary}`, () =>
      withRateLimit('wikidata', () => fetchWikidataSpecs(primary))
    )
    return { sections, specs: wd }
  }

  const tasks = [
    cache.get(`wd:${primary}`, () => withRateLimit('wikidata', () => fetchWikidataSpecs(primary))).then(
      (s) => {
        Object.assign(specs, s)
      }
    ),
    cache.get(`wiki:en:${primary}`, () => withRateLimit('wiki', () => fetchWikiFullExtract(primary, 'en'))).then(
      (en) => {
        if (en?.extract?.length > 120) {
          sections.push({
            heading: '英文维基百科补充',
            paragraphs: en.extract.split(/\n\n+/).filter((p) => p.length > 80).slice(0, 5),
            source: `[${en.title}](${en.url})`
          })
        }
      }
    )
  ]

  if (categoryId === 'anime' || categoryId === 'game') {
    for (const kw of keywords.slice(0, 2)) {
      tasks.push(
        cache.get(`moegirl:${kw}`, () => withRateLimit('moegirl', () => fetchMoegirlArticle(kw))).then((m) => {
          if (m && !sections.some((s) => s.heading.includes('萌娘'))) {
            sections.push({
              heading: '萌娘百科 · 设定与背景',
              paragraphs: m.paragraphs,
              source: `[${m.title}](${m.url})`
            })
          }
        })
      )
    }
  }

  await Promise.allSettled(tasks)
  return { sections, specs }
}

export { countMdChars, MIN_RICH_CHARS }
