import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'
import { libraryRelDirFromItem } from './media-path.mjs'
import { runPool } from './parallel-pool.mjs'
import { loadEnvFileSync, sleep } from './media-shared.mjs'
import { baikeKeywordsFromName, fetchBaikeMarkdown } from './baike-fetch.mjs'
import { formatDescription } from './seed-utils.mjs'

/**
 * @param {string} root
 * @param {ReturnType<import('./parse-args.mjs').parseArgs>} opts
 */
export async function pipelineContent(root, opts) {
  loadEnvFileSync(root)
  const catalogPath = join(root, 'assets', 'seed', 'library', 'catalog.json')
  if (!existsSync(catalogPath)) {
    throw new Error('未找到 catalog.json，请先 build')
  }
  const catalog = JSON.parse(readFileSync(catalogPath, 'utf-8'))
  let items = catalog.items ?? []

  if (opts.slug) items = items.filter((i) => i.slug === opts.slug)
  else if (opts.category) items = items.filter((i) => i.categoryId === opts.category)
  if (opts.limit > 0) items = items.slice(0, opts.limit)

  const concurrency = opts.concurrency || 4
  const assetsLib = join(root, 'assets', 'library')
  let ok = 0
  let skip = 0
  let fail = 0

  console.log(`抓取详情 Markdown · ${items.length} 条 · 并发 ${concurrency}\n`)

  await runPool(items, concurrency, async (item) => {
    const { categoryId, mediaDir } = libraryRelDirFromItem(item)
    const dir = join(assetsLib, categoryId, mediaDir)
    const mdPath = join(dir, 'content.md')

    if (!opts.force && existsSync(mdPath)) {
      const existing = readFileSync(mdPath, 'utf-8').trim()
      if (existing.length > 100) {
        skip++
        return
      }
    }

    mkdirSync(dir, { recursive: true })

    let md = null
    for (const kw of baikeKeywordsFromName(item.name)) {
      try {
        md = await fetchBaikeMarkdown(kw)
        if (md) break
      } catch {
        /* try next keyword */
      }
      await sleep(300)
    }

    if (!md && item.description) {
      md = `# ${item.name}\n\n${formatDescription(item.description)}\n`
    }

    if (!md) {
      console.warn(`  ✗ ${item.name} — 未获取到百科内容`)
      fail++
      return
    }

    writeFileSync(mdPath, md + '\n', 'utf-8')
    console.log(`  ✓ ${item.name}`)
    ok++
  })

  console.log(`\n完成: 写入 ${ok} · 跳过 ${skip} · 失败 ${fail}`)
}
