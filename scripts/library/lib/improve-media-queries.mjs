import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs'
import { join } from 'path'
import { itemsRoot } from './items.mjs'
import { pipelineBuild } from './pipeline-build.mjs'
import { clearMediaManifestCache } from './media-config.mjs'

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
      return 'transformers robot toy action figure'
    case 'supercar':
      return `${en} supercar`
    case 'motorcycle':
      return `${en} motorcycle`
    case 'anime': {
      const sub = raw.subCategoryId ?? ''
      if (sub === 'anime-ghibli') return 'anime forest spirit girl illustration'
      if (sub === 'anime-isekai') return 'fantasy anime landscape illustration'
      if (sub === 'anime-seinen') return 'dark anime city night illustration'
      if (sub === 'anime-slice') return 'cozy anime countryside illustration'
      return 'japanese anime character illustration'
    }
    case 'movie':
      if (raw.subCategoryId === 'movie-scifi') return 'cyberpunk city night rain cinematic'
      if (raw.subCategoryId === 'movie-fantasy') return 'fantasy animated film scene'
      return `${en || primaryName} cinema film still`
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
    case 'bird': {
      const slug = (raw.slug ?? '').replace(/^bird-/, '').replace(/-/g, ' ')
      return `${slug || en || 'eagle'} bird wildlife photo`
    }
    case 'watch':
      return 'luxury wristwatch macro dial leather strap'
    case 'game': {
      const sub = raw.subCategoryId ?? ''
      if (sub === 'game-rpg') return 'fantasy video game landscape screenshot'
      if (sub === 'game-strategy') return 'strategy game map board digital'
      if (sub === 'game-indie') return 'pixel art indie game screenshot'
      return 'action adventure video game screenshot'
    }
    case 'food':
      return `${en || primaryName} food dish plate`
    case 'architecture': {
      const slug = (raw.slug ?? '').replace(/^arch-/, '').replace(/^architecture-/, '')
      const map = {
        'sydney-opera': 'sydney opera house australia',
        'eiffel': 'eiffel tower paris',
        'taj-mahal': 'taj mahal india',
        'golden-gate': 'golden gate bridge san francisco',
        'burj-khalifa': 'burj khalifa dubai skyline',
        'sagrada-familia': 'sagrada familia barcelona church',
        'notre-dame': 'notre dame cathedral paris'
      }
      return map[slug] ?? `${en || primaryName} landmark architecture`
    }
    case 'music-inst':
      return `${en || primaryName} musical instrument`
    case 'insect':
      return `${en || primaryName} insect macro`
    case 'book':
      if (raw.subCategoryId === 'book-children') return 'children picture book illustration'
      if (raw.subCategoryId === 'book-art') return 'design book stack desk'
      return 'open books reading library desk'
    case 'camera':
      return `${en || primaryName} camera photography`
    case 'fish':
      return `${en || primaryName} fish aquarium`
    case 'reptile':
      return `${en || primaryName} reptile animal`
    case 'coffee-tea':
      if (raw.subCategoryId === 'ct-tea') return 'tea cup teapot ceremony'
      if (raw.subCategoryId === 'ct-culture') return 'coffee shop interior cozy'
      return 'coffee cup espresso latte art'
    case 'sport':
      return `${en || primaryName} sport equipment`
    case 'jewelry':
      return `${en || primaryName} jewelry luxury`
    case 'train':
      return `${en || primaryName} train railway`
    case 'ship':
      return `${en || primaryName} ship ocean`
    case 'footwear':
      return `${en || primaryName} shoes footwear`
    case 'pottery':
      return `${en || primaryName} ceramic pottery`
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
  if (categoryId === 'bird') tags.push('bird', 'wildlife')
  if (categoryId === 'insect') tags.push('insect', 'macro')
  if (categoryId === 'fish') tags.push('fish')
  if (categoryId === 'reptile') tags.push('reptile')
  if (categoryId === 'watch') tags.push('watch')
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
      const noRequired =
        ['anime', 'game', 'movie', 'book', 'architecture', 'food', 'watch', 'ui-design', 'industrial-design', 'interior', 'history', 'illustration', 'transformers', 'superhero', 'coffee-tea', 'sport', 'jewelry', 'train', 'ship', 'footwear', 'pottery', 'bird', 'insect', 'fish', 'reptile'].includes(
          categoryId
        )
      const enQuery = query.replace(/[\u4e00-\u9fff]/g, '').replace(/\s+/g, ' ').trim()
      raw.media = {
        provider: 'pixabay',
        ...(raw.media ?? {}),
        query: enQuery.length >= 3 ? enQuery : query,
        matchTags,
        requiredTags: noRequired ? [] : (raw.media?.requiredTags ?? []),
        minMatchScore: ['cat', 'dog'].includes(categoryId)
          ? 2
          : ['bird', 'insect', 'fish', 'reptile'].includes(categoryId)
            ? 0
            : ['superhero', 'transformers', 'anime', 'game', 'movie', 'book'].includes(categoryId)
              ? 0
              : 1,
        imageCount: ['superhero', 'transformers', 'motorcycle', 'anime', 'game'].includes(categoryId) ? 6 : 5,
        category:
          categoryId === 'bird' || categoryId === 'insect' || categoryId === 'fish' || categoryId === 'reptile'
            ? 'animals'
            : raw.media?.category ?? 'all'
      }
      writeFileSync(p, JSON.stringify(raw, null, 2) + '\n', 'utf-8')
      updated++
    }
  }
  console.log(`已优化 ${updated} 条 media.query / matchTags`)
  clearMediaManifestCache()
  pipelineBuild(root)
}
