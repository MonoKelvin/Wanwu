#!/usr/bin/env node
/**
 * 全库种子流水线
 *
 *   node scripts/library/run.mjs <step> [options]
 *
 * 数据: assets/seed/library/items/{category}/{slug}.json
 */
import { existsSync, readFileSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { parseArgs } from './lib/parse-args.mjs'
import { pipelineBuild } from './lib/pipeline-build.mjs'
import { pipelineMedia } from './lib/pipeline-media.mjs'
import { pipelineAudit } from './lib/pipeline-audit.mjs'
import { fixMediaSlugs } from './lib/fix-media-slugs.mjs'
import { assignSubcategories } from './lib/assign-subcategories.mjs'
import { improveMediaQueries } from './lib/improve-media-queries.mjs'
import { pipelineMediaQuality } from './lib/pipeline-media-quality.mjs'
import { pipelineCurate } from './lib/pipeline-curate.mjs'
import { dedupeLocalMedia } from './lib/dedupe-local-media.mjs'
import { dedupeCrossMedia } from './lib/dedupe-cross-media.mjs'
import { enrichDescriptions } from './lib/enrich-descriptions.mjs'
import { fixMissingCovers } from './lib/fix-missing-covers.mjs'
import { cleanupPlaceholders } from './lib/cleanup-placeholders.mjs'
import { pipelineContent } from './lib/pipeline-content.mjs'
import { applyExpansion } from './lib/apply-expansion.mjs'
import { listItemCategories, itemsRoot } from './lib/items.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

function printHelp() {
  console.log(`
全库种子流水线

  build       items/ → catalog.json + media.json
  media       并行下载配图（--concurrency=10）
  fetch-content  抓取百度百科写入 content.md
  cleanup     删除占位小图与 mediaTodo
  retry       缺图按 retryQuery 重试
  audit       缺图检查
  fix-slugs   修正 slug 与 assets/library 目录不一致
  assign-subs 按规则细化二级分类
  improve-queries  优化各条目的 Pixabay 搜索词
  media-quality    配图质量摘要
  curate      同 media --force
  dedupe-local  删除条内 MD5 重复配图
  dedupe-cross  跨条目重复配图去重（非封面）
  enrich-desc   补全条目 description 结构化长文
  fix-covers    用 gallery-01 补缺失的 cover.jpg
  import      入库（仅新增 id）
  update      按 --id= 强制更新
  all         build → media
  info        统计

选项: --force --slug= --category= --concurrency= --limit= --id= --full

示例:
  npm run seed:library -- build
  npm run seed:library -- media --force
  npm run seed:library:reimport
  npm run seed:library -- update --id=<uuid>
`)
}

function cmdInfo() {
  const catalogPath = join(root, 'assets', 'seed', 'library', 'catalog.json')
  const categories = listItemCategories(root)

  console.log(`分类: ${categories.length ? categories.join(', ') : '（无 items/ 目录）'}`)

  if (existsSync(catalogPath)) {
    const data = JSON.parse(readFileSync(catalogPath, 'utf-8'))
    console.log(`catalog: ${data.items?.length ?? 0} 条 (schema ${data.schema ?? '?'})`)
  } else {
    console.log('catalog: 未生成 → npm run seed:library -- build')
  }

  const idir = itemsRoot(root)
  if (existsSync(idir)) {
    for (const cat of categories) {
      const n = readdirSync(join(idir, cat)).filter(
        (f) => f.endsWith('.json') && !f.startsWith('_')
      ).length
      console.log(`  items/${cat}/: ${n}`)
    }
  }

  console.log('\n编辑 items/{分类}/{slug}.json → build → media → reimport')
}

async function runImport(opts) {
  const { spawnSync } = await import('child_process')
  const args = ['scripts/library/reimport-catalog.ts']
  if (opts.full) args.push('--full')
  for (const id of opts.ids) args.push(`--id=${id}`)

  const r = spawnSync('npx', ['tsx', ...args], { cwd: root, stdio: 'inherit', shell: true })
  process.exit(r.status ?? 1)
}

async function main() {
  const [step, ...rest] = process.argv.slice(2)
  const opts = parseArgs(rest)

  if (!step || step === 'help' || step === '-h') {
    printHelp()
    return
  }

  if (step === 'info') {
    cmdInfo()
    return
  }

  if (step === 'build') {
    pipelineBuild(root, opts)
    return
  }

  if (step === 'audit') {
    pipelineAudit(root)
    return
  }

  if (step === 'fix-slugs') {
    fixMediaSlugs(root)
    return
  }

  if (step === 'assign-subs') {
    assignSubcategories(root)
    return
  }

  if (step === 'expand') {
    applyExpansion(root)
    return
  }

  if (step === 'improve-queries') {
    improveMediaQueries(root)
    return
  }

  if (step === 'cleanup') {
    cleanupPlaceholders(root)
    return
  }

  if (step === 'fetch-content') {
    await pipelineContent(root, opts)
    return
  }

  if (step === 'media-quality') {
    pipelineMediaQuality(root)
    return
  }

  if (step === 'curate') {
    await pipelineCurate(root, opts)
    return
  }

  if (step === 'dedupe-local') {
    dedupeLocalMedia(root)
    return
  }

  if (step === 'dedupe-cross') {
    dedupeCrossMedia(root, { dryRun: opts.argv?.includes('--dry-run') })
    return
  }

  if (step === 'enrich-desc') {
    const n = enrichDescriptions(root, { category: opts.category, slug: opts.slug, limit: opts.limit })
    console.log(`已 enrich ${n} 条 description`)
    return
  }

  if (step === 'fix-covers') {
    fixMissingCovers(root)
    return
  }

  if (step === 'media') {
    await pipelineMedia(root, opts)
    return
  }

  if (step === 'retry') {
    await pipelineMedia(root, opts, { retryMissing: true })
    return
  }

  if (step === 'import') {
    await runImport(opts)
    return
  }

  if (step === 'update') {
    if (!opts.ids.length) {
      console.error('update 需要至少一个 --id=<uuid>')
      process.exit(1)
    }
    await runImport({ ...opts, full: false })
    return
  }

  if (step === 'all') {
    pipelineBuild(root, opts)
    await pipelineMedia(root, opts)
    return
  }

  console.error(`未知步骤: ${step}\n`)
  printHelp()
  process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
