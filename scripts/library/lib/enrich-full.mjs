import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { itemsRoot, libraryMediaDir } from './items.mjs'
import { defaultContentFile, readContentFile } from './item-content.mjs'
import { runPool } from './parallel-pool.mjs'
import { createFetchCache } from './fetch-cache.mjs'
import {
  fetchItemReferenceFast,
  fetchSupplementaryParallel,
  countMdChars
} from './enrich-fetch-fast.mjs'
import { appendSupplementaryMarkdown } from './enrich-supplementary.mjs'
import { aliasesForSlug } from './enrich-search-aliases.mjs'
import { inferSchemaSpecs, pruneSpecs, isValidSpecValue } from './enrich-specs.mjs'
import { composeArticleMarkdown, descriptionHasInlineSpecs } from './enrich-prose.mjs'

const MIN_DESC_CHARS = 2200
const MIN_MD_CHARS = 2800
const ITEM_TIMEOUT_MS = 55_000
const DEFAULT_CONCURRENCY = 8

/** @param {Promise<T>} promise @param {number} ms @param {string} label */
async function withTimeout(promise, ms, label) {
  let timer
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} 超时 (${ms / 1000}s)`)), ms)
  })
  try {
    return await Promise.race([promise, timeout])
  } finally {
    clearTimeout(timer)
  }
}

/** 百度百科字段名 → 全库规格字段 */
const SPEC_ALIASES = {
  '作 者': '作者',
  作者: '作者',
  导演: '导演',
  主演: '主演',
  文学体裁: '体裁',
  体裁: '体裁',
  '类 别': '体裁',
  首版时间: '首发年份',
  出版时间: '首发年份',
  上映时间: '上映年份',
  上映日期: '上映年份',
  出版社: '首版出版社',
  制片公司: '制片公司',
  中译本字数: '篇幅',
  '页 数': '篇幅',
  片长: '片长',
  制片国家: '国家/地区',
  制片国家地区: '国家/地区',
  产地: '产地',
  制造商: '制造商',
  开发商: '开发商',
  发行商: '发行商'
}

function countChars(s) {
  return (s ?? '').replace(/\s/g, '').length
}

function cleanProse(text) {
  return (text ?? '')
    .replace(/\[\d+[\s\-]*\d*\]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/^[\s。，、]+/, '')
    .trim()
}

function normalizeFetchedSpecs(fetched) {
  const out = {}
  for (const [k, v] of Object.entries(fetched ?? {})) {
    const key = SPEC_ALIASES[k] ?? k.replace(/\s+/g, ' ').trim()
    const val = cleanProse(String(v))
    if (!key || !isValidSpecValue(val)) continue
    if (!out[key]) out[key] = val
  }
  return out
}

function mergeSpecs(categoryId, existing, fetched, summary) {
  const normalized = normalizeFetchedSpecs({ ...existing, ...fetched })
  const inferred = inferSchemaSpecs(normalized, categoryId)
  if (summary && !inferred['摘要']) {
    inferred['摘要'] = cleanProse(summary).slice(0, 120)
  }
  return pruneSpecs(inferred)
}

function splitParagraphs(text) {
  return text
    .split(/\n{2,}/)
    .map((p) => cleanProse(p.replace(/^##\s+.+$/gm, '').trim()))
    .filter((p) => p.length > 50 && !/^[\d\s]+$/.test(p))
}

function resolveContentFile(raw, categoryId) {
  const mediaDir = libraryMediaDir(categoryId, raw.slug)
  return raw.contentFile ?? defaultContentFile(categoryId, mediaDir)
}

function needsEnrich(raw, categoryId, root) {
  const body = readContentFile(root, resolveContentFile(raw, categoryId)) || (raw.description ?? '')
  const d = countChars(body)
  const specs = raw.specs ?? {}
  const hasPending =
    Object.values(specs).some((v) => v === '待补充') || body.includes('：待补充')
  const specCount = Object.values(specs).filter((v) => isValidSpecValue(v)).length
  if (d < MIN_DESC_CHARS) return true
  if (hasPending) return true
  if (specCount < 3) return true
  if (descriptionHasInlineSpecs(body)) return true
  if (body.includes('在本分类中作为代表性条目')) return true
  if (!raw.contentFile && (raw.description ?? '').length > 200) return true
  return false
}

/**
 * @param {object} item catalog item shape
 * @param {string} categoryId
 * @param {string} root
 */
async function enrichOneItem(item, categoryId, root, runOpts = {}) {
  const cache = runOpts.cache
  const extra = aliasesForSlug(item.slug)
  const keywords = [...new Set([...extra, item.name])]

  const refPromise = fetchItemReferenceFast(item.name, extra, cache)
  const supPromise = refPromise.then((ref) =>
    fetchSupplementaryParallel(item.name, keywords, categoryId, cache, {
      skipBody:
        runOpts.lightSupplementary === true ||
        !!(ref && countMdChars(ref.markdown) >= MIN_MD_CHARS)
    })
  )

  const [ref, sup] = await Promise.all([refPromise, supPromise])

  if (ref && sup.sections.length) {
    ref.markdown = appendSupplementaryMarkdown(ref.markdown, sup)
    ref.source = `${ref.source}+web`
  }

  const specs = mergeSpecs(
    categoryId,
    item.specs ?? {},
    { ...(ref?.specs ?? {}), ...sup.specs },
    ref?.markdown ?? ''
  )
  let article = composeArticleMarkdown(item, ref, sup)

  if (countChars(article) < MIN_DESC_CHARS && ref?.markdown) {
    const extra = splitParagraphs(ref.markdown).slice(0, 12).join('\n\n')
    if (extra.length > 400) {
      article += `\n\n## 资料汇编\n\n${extra}\n`
    }
  }

  if (!ref) {
    throw new Error('未获取到百科/维基资料')
  }

  const summary =
    ref?.markdown?.split('\n\n').find((p) => p.length > 20 && !p.startsWith('#') && !p.startsWith('>'))?.slice(0, 160) ??
    item.summary ??
    article.split('\n').find((l) => l.trim() && !l.startsWith('#'))?.slice(0, 120) ??
    ''

  const tags = [...new Set([...(item.tags ?? []), ...Object.values(specs).slice(0, 3).filter(isValidSpecValue)])].slice(
    0,
    8
  )

  const contentFile = resolveContentFile({ slug: item.slug }, categoryId)
  const assetsDir = join(root, 'assets', dirname(contentFile))
  mkdirSync(assetsDir, { recursive: true })
  writeFileSync(join(root, 'assets', contentFile), `${article.trim()}\n`, 'utf-8')

  return {
    contentFile,
    summary: summary.slice(0, 200),
    specs,
    tags,
    source: ref?.source ?? 'none',
    chars: countChars(article)
  }
}

/**
 * @param {string} root
 * @param {{ category?: string|null, slug?: string|null, limit?: number, force?: boolean, concurrency?: number }} opts
 */
export async function enrichFull(root, opts = { lightSupplementary: false }) {
  const idir = itemsRoot(root)
  const catalogPath = join(root, 'assets', 'seed', 'library', 'catalog.json')
  const catalog = existsSync(catalogPath) ? JSON.parse(readFileSync(catalogPath, 'utf-8')) : null
  const catalogBySlug = new Map((catalog?.items ?? []).map((i) => [i.slug, i]))

  /** @type {Array<{ categoryId: string, path: string, raw: object }>} */
  const queue = []

  for (const categoryId of readdirSync(idir)) {
    if (opts.category && categoryId !== opts.category) continue
    const categoryDir = join(idir, categoryId)
    if (!existsSync(categoryDir) || categoryId.startsWith('_')) continue

    for (const file of readdirSync(categoryDir).filter((f) => f.endsWith('.json') && !f.startsWith('_'))) {
      const path = join(categoryDir, file)
      const raw = JSON.parse(readFileSync(path, 'utf-8'))
      if (opts.slug && raw.slug !== opts.slug) continue
      if (!opts.force && !needsEnrich(raw, categoryId, root)) continue
      queue.push({ categoryId, path, raw })
    }
  }

  const limit = opts.limit > 0 ? opts.limit : queue.length
  const work = queue.slice(0, limit)
  const concurrency = opts.concurrency > 0 ? opts.concurrency : DEFAULT_CONCURRENCY
  const cache = createFetchCache()

  console.log(`全库详情补全 · 待处理 ${work.length}/${queue.length} 条 · 条目并发 ${concurrency}\n`)

  let ok = 0
  let fail = 0

  await runPool(work, concurrency, async (job) => {
    const catItem = catalogBySlug.get(job.raw.slug) ?? {
      slug: job.raw.slug,
      name: job.raw.name,
      summary: job.raw.summary,
      categoryId: job.categoryId,
      subCategoryId: job.raw.subCategoryId
    }

    try {
      const result = await withTimeout(
        enrichOneItem(
          { ...catItem, specs: job.raw.specs, tags: job.raw.tags },
          job.categoryId,
          root,
          {
            lightSupplementary: opts.lightSupplementary === true,
            cache
          }
        ),
        ITEM_TIMEOUT_MS,
        job.raw.name
      )
      job.raw.contentFile = result.contentFile
      delete job.raw.description
      job.raw.summary = result.summary
      job.raw.specs = result.specs
      job.raw.tags = result.tags
      writeFileSync(job.path, JSON.stringify(job.raw, null, 2) + '\n', 'utf-8')
      console.log(`  ✓ ${job.raw.name} · ${result.source} · ${result.chars} 字 · specs ${Object.keys(result.specs).length}`)
      ok++
    } catch (e) {
      console.warn(`  ✗ ${job.raw.name} — ${e instanceof Error ? e.message : e}`)
      fail++
    }
  })

  console.log(`\n完成: 成功 ${ok} · 失败 ${fail}`)
  return { ok, fail, total: work.length }
}
