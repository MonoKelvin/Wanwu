import { existsSync, copyFileSync, readdirSync, readFileSync } from 'fs'
import { join } from 'path'
import { libraryRelDirFromItem } from './media-path.mjs'
import { isValidMediaFile } from './disk-media.mjs'

/** 无 cover 但有 gallery 时，用 gallery-01 补封面 */
export function fixMissingCovers(root) {
  const catalog = JSON.parse(
    readFileSync(join(root, 'assets', 'seed', 'library', 'catalog.json'), 'utf-8')
  )
  const assetsLib = join(root, 'assets', 'library')
  let fixed = 0

  for (const item of catalog.items) {
    const { categoryId, mediaDir } = libraryRelDirFromItem(item)
    const dir = join(assetsLib, categoryId, mediaDir)
    if (!existsSync(dir)) continue
    const cover = join(dir, 'cover.jpg')
    if (isValidMediaFile(cover)) continue
    const g1 = join(dir, 'gallery-01.jpg')
    if (isValidMediaFile(g1)) {
      copyFileSync(g1, cover)
      fixed++
      continue
    }
    const any = readdirSync(dir).find((f) => /^gallery-/.test(f) && isValidMediaFile(join(dir, f)))
    if (any) {
      copyFileSync(join(dir, any), cover)
      fixed++
    }
  }
  console.log(`补封面：${fixed} 条`)
  return fixed
}
