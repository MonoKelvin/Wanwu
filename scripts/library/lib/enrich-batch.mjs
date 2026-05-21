import { readFileSync, readdirSync, existsSync } from 'fs'
import { join } from 'path'
import { itemsRoot, libraryMediaDir } from './items.mjs'
import { defaultContentFile, readContentFile } from './item-content.mjs'
import { enrichFull } from './enrich-full.mjs'
import { isValidSpecValue } from './enrich-specs.mjs'
import { descriptionHasInlineSpecs } from './enrich-prose.mjs'

const MIN_DESC_CHARS = 2200

/**
 * @param {string} root
 * @returns {Array<{ id: string, total: number, need: number }>}
 */
export function listPendingCategories(root) {
  const idir = itemsRoot(root)
  const rows = []

  for (const categoryId of readdirSync(idir).filter((c) => !c.startsWith('_')).sort()) {
    const categoryDir = join(idir, categoryId)
    if (!existsSync(categoryDir)) continue
    let need = 0
    let total = 0
    for (const file of readdirSync(categoryDir).filter((f) => f.endsWith('.json') && !f.startsWith('_'))) {
      total++
      const raw = JSON.parse(readFileSync(join(categoryDir, file), 'utf-8'))
      const contentFile =
        raw.contentFile ?? defaultContentFile(categoryId, libraryMediaDir(categoryId, raw.slug))
      const body = readContentFile(root, contentFile) || (raw.description ?? '')
      const d = body.replace(/\s/g, '').length
      const hasPending =
        Object.values(raw.specs ?? {}).some((v) => v === '待补充') || body.includes('：待补充')
      const tpl = body.includes('在本分类中作为代表性条目')
      const specCount = Object.values(raw.specs ?? {}).filter((v) => isValidSpecValue(v)).length
      if (
        d < MIN_DESC_CHARS ||
        hasPending ||
        tpl ||
        specCount < 3 ||
        descriptionHasInlineSpecs(body) ||
        (!raw.contentFile && (raw.description ?? '').length > 200)
      )
        need++
    }
    if (need > 0) rows.push({ id: categoryId, total, need })
  }

  return rows.sort((a, b) => a.need - b.need)
}

/**
 * @param {string} root
 * @param {{ skip?: string[], only?: string[], force?: boolean, limit?: number }} opts
 */
export async function enrichBatch(root, opts = {}) {
  let categories = listPendingCategories(root)
  if (opts.only?.length) {
    categories = categories.filter((c) => opts.only.includes(c.id))
  }
  if (opts.skip?.length) {
    categories = categories.filter((c) => !opts.skip.includes(c.id))
  }

  console.log(`批量补全 · ${categories.length} 个分类待处理\n`)
  for (const cat of categories) {
    console.log(`\n========== ${cat.id} (${cat.need}/${cat.total}) ==========\n`)
    await enrichFull(root, {
      category: cat.id,
      force: opts.force,
      limit: opts.limit,
      concurrency: opts.concurrency > 0 ? opts.concurrency : 8,
      lightSupplementary: opts.lightSupplementary !== false
    })
  }
  console.log('\n批量补全全部完成')
}
