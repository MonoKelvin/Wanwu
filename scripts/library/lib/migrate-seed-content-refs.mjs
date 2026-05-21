import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs'
import { join } from 'path'
import { itemsRoot, libraryMediaDir } from './items.mjs'
import { normalizeSeedItemContent } from './item-content.mjs'

/**
 * 将种子 JSON 内联 description 迁到 content.md，JSON 仅保留 contentFile
 * @param {string} root
 * @param {{ category?: string }} opts
 */
export function migrateSeedContentRefs(root, opts = {}) {
  const idir = itemsRoot(root)
  let n = 0

  for (const categoryId of readdirSync(idir)) {
    if (opts.category && categoryId !== opts.category) continue
    const categoryDir = join(idir, categoryId)
    if (!existsSync(categoryDir) || categoryId.startsWith('_')) continue

    for (const file of readdirSync(categoryDir).filter((f) => f.endsWith('.json') && !f.startsWith('_'))) {
      const path = join(categoryDir, file)
      const raw = JSON.parse(readFileSync(path, 'utf-8'))
      const mediaDir = libraryMediaDir(categoryId, raw.slug ?? file.replace(/\.json$/, ''))
      const { contentFile } = normalizeSeedItemContent(raw, categoryId, mediaDir, root)

      const next = { ...raw, contentFile }
      delete next.description
      writeFileSync(path, JSON.stringify(next, null, 2) + '\n', 'utf-8')
      n++
    }
  }

  return n
}
