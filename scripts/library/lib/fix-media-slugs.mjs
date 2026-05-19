/**
 * 修正种子 slug 与 assets/library 目录不一致（历史配图目录为短 slug）
 */
import { existsSync, readFileSync, writeFileSync, renameSync, unlinkSync } from 'fs'
import { join } from 'path'
import { itemsRoot } from './items.mjs'

/** @param {string} root */
export function fixMediaSlugs(root) {
  const catalogPath = join(root, 'assets', 'seed', 'library', 'catalog.json')
  const catalog = JSON.parse(readFileSync(catalogPath, 'utf-8'))
  const itemsDir = itemsRoot(root)
  let fixed = 0
  let alreadyOk = 0

  for (const item of catalog.items) {
    const mediaDir = join(root, 'assets', 'library', item.categoryId, item.slug)
    if (existsSync(join(mediaDir, 'cover.jpg'))) {
      alreadyOk++
      continue
    }

    const short =
      item.slug.startsWith(`${item.categoryId}-`) ?
        item.slug.slice(item.categoryId.length + 1)
      : item.slug
    const altDir = join(root, 'assets', 'library', item.categoryId, short)
    if (!existsSync(join(altDir, 'cover.jpg'))) continue

    const categoryDir = join(itemsDir, item.categoryId)
    const oldFile = join(categoryDir, `${item.slug}.json`)
    const newFile = join(categoryDir, `${short}.json`)

    if (!existsSync(oldFile)) {
      console.warn(`  跳过 ${item.slug}：未找到 ${oldFile}`)
      continue
    }

    const data = JSON.parse(readFileSync(oldFile, 'utf-8'))
    data.slug = short
    writeFileSync(newFile, JSON.stringify(data, null, 2) + '\n', 'utf-8')
    if (oldFile !== newFile) {
      if (existsSync(oldFile) && oldFile !== newFile) unlinkSync(oldFile)
    }

    fixed++
    console.log(`  ${item.categoryId}/${item.slug} → ${short}`)
  }

  console.log(`\n已修正 ${fixed} 条 slug（原本正确 ${alreadyOk} 条）`)
  console.log('请执行: npm run seed:library -- build && npm run seed:library:reimport -- --full')
}
