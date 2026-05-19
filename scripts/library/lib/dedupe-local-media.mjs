import { createHash } from 'crypto'
import { existsSync, readFileSync, unlinkSync, readdirSync } from 'fs'
import { join } from 'path'
import { libraryRelDirFromItem } from './media-path.mjs'
import { isValidMediaFile } from './disk-media.mjs'

/** 删除条内 MD5 重复图（保留封面优先） */
export function dedupeLocalMedia(root) {
  const catalog = JSON.parse(
    readFileSync(join(root, 'assets', 'seed', 'library', 'catalog.json'), 'utf-8')
  )
  const assetsLib = join(root, 'assets', 'library')
  let removed = 0

  for (const item of catalog.items) {
    const { categoryId, mediaDir } = libraryRelDirFromItem(item)
    const dir = join(assetsLib, categoryId, mediaDir)
    if (!existsSync(dir)) continue

    const hashes = new Map()
    for (const f of readdirSync(dir)) {
      if (!/\.(jpg|jpeg|png|webp)$/i.test(f)) continue
      const p = join(dir, f)
      if (!isValidMediaFile(p)) continue
      const h = createHash('md5').update(readFileSync(p)).digest('hex')
      if (hashes.has(h) && f !== 'cover.jpg') {
        unlinkSync(p)
        removed++
      } else if (!hashes.has(h)) {
        hashes.set(h, f)
      }
    }
  }

  console.log(`条内去重：删除 ${removed} 个重复文件`)
}
