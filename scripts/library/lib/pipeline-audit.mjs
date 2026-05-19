import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { resolveMediaConfig } from './media-config.mjs'

const FILES = ['cover.jpg', 'gallery-01.jpg', 'gallery-02.jpg', 'gallery-03.jpg']

/** @param {string} root */
export function pipelineAudit(root) {
  const catalogPath = join(root, 'assets', 'seed', 'library', 'catalog.json')
  const assetsLib = join(root, 'assets', 'library')
  const catalog = JSON.parse(readFileSync(catalogPath, 'utf-8'))

  let missing = 0
  let stale = 0

  console.log('全库配图审计\n')

  for (const item of catalog.items) {
    const dir = join(assetsLib, item.categoryId, item.slug)
    const config = resolveMediaConfig(item.slug, item)
    const absent = FILES.filter((f) => !existsSync(join(dir, f)))
    const catalogProvider = item.mediaProvider ?? catalog.mediaProvider ?? '(未标注)'

    if (absent.length) {
      missing++
      console.log(`✗ ${item.slug} — 缺少 ${absent.join(', ')} [${config.provider}]`)
      continue
    }
    if (catalogProvider !== config.provider && catalogProvider !== '(未标注)') {
      stale++
      console.log(`? ${item.slug} — catalog=${catalogProvider} media=${config.provider}`)
    }
  }

  console.log(`\n共 ${catalog.items.length} 条 · 缺图 ${missing} · 来源不一致 ${stale}`)
  if (missing > 0) {
    console.log('\n修复: npm run seed:library -- media --force')
    console.log('或: npm run seed:library -- retry')
  }
}
