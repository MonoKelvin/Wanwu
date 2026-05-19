import { createHash } from 'crypto'
import { existsSync, readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { libraryRelDirFromItem } from './media-path.mjs'
import { isValidMediaFile } from './disk-media.mjs'

/** @param {string} root */
export function pipelineMediaQuality(root) {
  const catalogPath = join(root, 'assets', 'seed', 'library', 'catalog.json')
  const assetsLib = join(root, 'assets', 'library')
  const catalog = JSON.parse(readFileSync(catalogPath, 'utf-8'))

  let noCover = 0
  let crossDup = 0
  const hashToPaths = new Map()

  for (const item of catalog.items) {
    const { categoryId, mediaDir } = libraryRelDirFromItem(item)
    const dir = join(assetsLib, categoryId, mediaDir)
    const cover = join(dir, 'cover.jpg')

    if (!isValidMediaFile(cover)) {
      noCover++
      console.log(`✗ ${item.slug} — 无有效封面`)
      continue
    }

    for (const name of ['cover.jpg', ...readdirSyncSafe(dir).filter((f) => /^gallery-/.test(f))]) {
      const p = join(dir, name)
      if (!isValidMediaFile(p)) continue
      const h = createHash('md5').update(readFileSync(p)).digest('hex')
      if (!hashToPaths.has(h)) hashToPaths.set(h, [])
      hashToPaths.get(h).push(`${categoryId}/${mediaDir}/${name}`)
    }
  }

  for (const paths of hashToPaths.values()) {
    if (paths.length < 2) continue
    const slugs = new Set(paths.map((p) => p.split('/').slice(0, 2).join('/')))
    if (slugs.size < 2) continue
    crossDup++
  }

  console.log('\n配图质量摘要')
  console.log(`  条目: ${catalog.items.length}`)
  console.log(`  无有效封面: ${noCover}`)
  console.log(`  跨条目重复图组: ${crossDup}`)
}

function readdirSyncSafe(dir) {
  try {
    return existsSync(dir) ? readdirSync(dir) : []
  } catch {
    return []
  }
}
