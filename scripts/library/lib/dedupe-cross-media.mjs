/**
 * 跨条目重复配图：删除非封面重复文件，并标记需重新下载的 slug
 */
import { createHash } from 'crypto'
import { existsSync, readFileSync, unlinkSync, readdirSync, writeFileSync } from 'fs'
import { join } from 'path'
import { libraryRelDirFromItem } from './media-path.mjs'
import { isValidMediaFile } from './disk-media.mjs'

/** @param {string} root @param {{ dryRun?: boolean }} [opts] */
export function dedupeCrossMedia(root, opts = {}) {
  const dryRun = !!opts.dryRun
  const catalog = JSON.parse(
    readFileSync(join(root, 'assets', 'seed', 'library', 'catalog.json'), 'utf-8')
  )
  const assetsLib = join(root, 'assets', 'library')
  const hashToRefs = new Map()

  for (const item of catalog.items) {
    const { categoryId, mediaDir } = libraryRelDirFromItem(item)
    const dir = join(assetsLib, categoryId, mediaDir)
    if (!existsSync(dir)) continue
    for (const f of readdirSync(dir)) {
      if (!/\.(jpg|jpeg|png|webp)$/i.test(f)) continue
      const p = join(dir, f)
      if (!isValidMediaFile(p)) continue
      const h = createHash('md5').update(readFileSync(p)).digest('hex')
      if (!hashToRefs.has(h)) hashToRefs.set(h, [])
      hashToRefs.get(h).push({ slug: item.slug, categoryId, mediaDir, file: f, path: p })
    }
  }

  let removed = 0
  const needRedownload = new Set()

  for (const refs of hashToRefs.values()) {
    if (refs.length < 2) continue
    const slugs = new Set(refs.map((r) => r.slug))
    if (slugs.size < 2) continue

    refs.sort((a, b) => {
      if (a.file === 'cover.jpg' && b.file !== 'cover.jpg') return -1
      if (b.file === 'cover.jpg' && a.file !== 'cover.jpg') return 1
      return a.slug.localeCompare(b.slug)
    })

    const keeper = refs[0]
    for (const ref of refs.slice(1)) {
      if (ref.slug === keeper.slug && ref.file === keeper.file) continue
      if (!dryRun) {
        unlinkSync(ref.path)
        removed++
      }
      if (ref.file === 'cover.jpg') needRedownload.add(ref.slug)
    }
  }

  const reportPath = join(root, 'assets', 'seed', 'library', '_cross-dedupe-report.json')
  if (!dryRun) {
    writeFileSync(
      reportPath,
      JSON.stringify({ removed, needRedownload: [...needRedownload] }, null, 2) + '\n',
      'utf-8'
    )
  }

  console.log(`跨条目去重：删除 ${removed} 个重复文件${dryRun ? '（dry-run）' : ''}`)
  console.log(`需重下封面: ${needRedownload.size} 条`)
  if (needRedownload.size && !dryRun) {
    console.log('执行: npm run seed:library -- retry')
  }
  return { removed, needRedownload: [...needRedownload] }
}
