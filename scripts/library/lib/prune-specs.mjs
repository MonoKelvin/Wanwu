import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs'
import { join } from 'path'
import { itemsRoot, libraryMediaDir } from './items.mjs'
import { defaultContentFile, readContentFile } from './item-content.mjs'
import { inferSchemaSpecs, pruneSpecs } from './enrich-specs.mjs'
import { stripSpecSectionFromMarkdown, descriptionHasInlineSpecs } from './enrich-prose.mjs'

/**
 * @param {string} root
 * @param {{ category?: string, slug?: string }} opts
 */
export function pruneAllSpecs(root, opts = {}) {
  const idir = itemsRoot(root)
  let n = 0

  for (const categoryId of readdirSync(idir)) {
    if (opts.category && categoryId !== opts.category) continue
    const categoryDir = join(idir, categoryId)
    if (!existsSync(categoryDir) || categoryId.startsWith('_')) continue

    for (const file of readdirSync(categoryDir).filter((f) => f.endsWith('.json') && !f.startsWith('_'))) {
      const path = join(categoryDir, file)
      const raw = JSON.parse(readFileSync(path, 'utf-8'))
      if (opts.slug && raw.slug !== opts.slug) continue

      const before = JSON.stringify(raw.specs ?? {})
      raw.specs = inferSchemaSpecs(pruneSpecs(raw.specs ?? {}), categoryId)

      const contentFile =
        raw.contentFile ?? defaultContentFile(categoryId, libraryMediaDir(categoryId, raw.slug))
      let body = readContentFile(root, contentFile)
      let mdChanged = false
      if (body && descriptionHasInlineSpecs(body)) {
        body = stripSpecSectionFromMarkdown(body)
        const abs = join(root, 'assets', contentFile.replace(/\\/g, '/'))
        writeFileSync(abs, `${body.trim()}\n`, 'utf-8')
        mdChanged = true
      }

      const after = JSON.stringify(raw.specs)
      if (before !== after || mdChanged) {
        writeFileSync(path, JSON.stringify(raw, null, 2) + '\n', 'utf-8')
        n++
      }
    }
  }

  return n
}
