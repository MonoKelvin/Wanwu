/**
 * 检查全库本地配图是否齐全、是否与 media.json 配置一致
 * 用法: node scripts/audit-library-media.mjs
 */
import { existsSync, statSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { readFileSync } from 'fs'
import { resolveMediaConfig } from './library-media-config.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const catalogPath = join(root, 'assets', 'seed', 'library', 'catalog.json')
const assetsLib = join(root, 'assets', 'library')

const FILES = ['cover.jpg', 'gallery-01.jpg', 'gallery-02.jpg', 'gallery-03.jpg']

function main() {
  const catalog = JSON.parse(readFileSync(catalogPath, 'utf-8'))
  let missing = 0
  let stale = 0

  console.log('全库配图审计\n')

  for (const item of catalog.items) {
    const dir = join(assetsLib, item.categoryId, item.slug)
    const config = resolveMediaConfig(item.slug, item)
    const absent = FILES.filter((f) => !existsSync(join(dir, f)))

    const catalogProvider = item.mediaProvider ?? catalog.mediaProvider ?? '(未标注)'
    const expectProvider = config.provider

    if (absent.length) {
      missing++
      console.log(`✗ ${item.slug} — 缺少 ${absent.join(', ')} [期望 ${expectProvider}]`)
      continue
    }

    if (catalogProvider !== expectProvider && catalogProvider !== '(未标注)') {
      stale++
      console.log(`? ${item.slug} — catalog=${catalogProvider} 但 media.json=${expectProvider}`)
    }
  }

  console.log(`\n共 ${catalog.items.length} 条 · 缺图 ${missing} · 来源不一致 ${stale}`)
  if (missing > 0) {
    console.log('\n修复: npm run seed:library:media -- --force')
  }
}

main()
