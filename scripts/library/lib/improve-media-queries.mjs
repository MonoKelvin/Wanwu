import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs'
import { join } from 'path'
import { itemsRoot } from './items.mjs'

/** @param {object} raw @param {string} categoryId */
export function suggestMediaQuery(raw, categoryId) {
  const primaryName = (raw.name ?? '').split(/[（(]/)[0].trim()
  const en = (raw.name ?? '').match(/[A-Za-z][A-Za-z0-9\s.-]+/)?.[0]?.trim() ?? primaryName

  switch (categoryId) {
    case 'cat':
      return `${en} cat breed portrait`
    case 'dog':
      return `${en} dog breed portrait`
    case 'superhero':
      return `${en} action figure toy collectible`
    case 'transformers':
      return `${en} transformers toy robot`
    case 'supercar':
      return `${en} supercar`
    case 'motorcycle':
      return `${en} motorcycle`
    case 'anime': {
      const slug = raw.slug ?? ''
      const key = slug.replace(/^anime-/, '').replace(/-/g, ' ')
      return `${key || en} anime screenshot fan art`
    }
    case 'movie':
      return `${primaryName} film cinema scene`
    case 'plant':
      return `${primaryName} houseplant`
    case 'illustration':
      if (raw.subCategoryId === 'ill-classic') {
        const painting = (en || primaryName).replace(/mona lisa/i, 'mona lisa painting')
        return `${painting} museum artwork`
      }
      return `${en || primaryName} digital illustration artwork`
    case 'ui-design':
      if (raw.subCategoryId === 'ui-mobile') return `${primaryName} mobile app ui screenshot`
      if (raw.subCategoryId === 'ui-design-tool') return `${primaryName} design system ui`
      return `${primaryName} web interface ui design`
    case 'interior':
      return `${primaryName} interior design room`
    case 'industrial-design':
      return `${primaryName} product design`
    case 'history':
      return `${primaryName} landmark architecture`
    default:
      return `${primaryName} ${raw.tags?.[0] ?? ''}`.trim()
  }
}

/** @param {string} categoryId @param {object} raw */
export function suggestMatchTags(raw, categoryId) {
  const tags = [...(raw.tags ?? [])]
  const en = (raw.name ?? '').match(/[A-Za-z][A-Za-z0-9]+/)?.[0]?.toLowerCase()
  if (en) tags.push(en.toLowerCase())
  if (categoryId === 'cat') tags.push('cat')
  if (categoryId === 'dog') tags.push('dog')
  return [...new Set(tags.map((t) => String(t).toLowerCase()).filter((t) => t.length > 2))].slice(0, 6)
}

/** @param {string} root */
export function improveMediaQueries(root) {
  const idir = itemsRoot(root)
  let updated = 0
  for (const categoryId of readdirSync(idir)) {
    const categoryDir = join(idir, categoryId)
    if (!existsSync(categoryDir) || categoryId.startsWith('_')) continue
    for (const file of readdirSync(categoryDir).filter((f) => f.endsWith('.json') && !f.startsWith('_'))) {
      const p = join(categoryDir, file)
      const raw = JSON.parse(readFileSync(p, 'utf-8'))
      const query = suggestMediaQuery(raw, categoryId)
      const matchTags = suggestMatchTags(raw, categoryId)
      raw.media = {
        provider: 'pixabay',
        ...(raw.media ?? {}),
        query,
        matchTags,
        minMatchScore: ['cat', 'dog', 'superhero', 'transformers', 'motorcycle', 'supercar'].includes(
          categoryId
        )
          ? 2
          : 1,
        imageCount: ['superhero', 'transformers', 'motorcycle', 'anime'].includes(categoryId) ? 6 : 5
      }
      writeFileSync(p, JSON.stringify(raw, null, 2) + '\n', 'utf-8')
      updated++
    }
  }
  console.log(`已优化 ${updated} 条 media.query / matchTags`)
}
