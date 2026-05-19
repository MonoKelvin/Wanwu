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
import { listItemCategories, itemsRoot } from './lib/items.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

function printHelp() {
  console.log(`
全库种子流水线

  build       items/ → catalog.json + media.json
  media       下载配图到 assets/library/
  retry       缺图按 retryQuery 重试
  audit       缺图检查
  fix-slugs   修正 slug 与 assets/library 目录不一致
  import      入库（仅新增 id）
  update      按 --id= 强制更新
  all         build → media
  info        统计

选项: --force --slug= --category= --id= --full

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
