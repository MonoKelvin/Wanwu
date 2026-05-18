/**
 * 将 catalog / 品种查询合并进 assets/seed/library/media.json
 * 用法: node scripts/sync-library-media-manifest.mjs [--category=cat]
 */
import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { catMediaManifestEntries } from './library-cat-media-queries.mjs'
import { dogMediaManifestEntries } from './library-dog-media-queries.mjs'
import { worldMediaManifestEntries } from './library-media-queries-world.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const mediaPath = join(root, 'assets', 'seed', 'library', 'media.json')
const catalogPath = join(root, 'assets', 'seed', 'library', 'catalog.json')

const categoryArg = process.argv.find((a) => a.startsWith('--category='))
const onlyCategory = categoryArg ? categoryArg.split('=')[1] : null

const manifest = JSON.parse(readFileSync(mediaPath, 'utf-8'))
const catalog = JSON.parse(readFileSync(catalogPath, 'utf-8'))

manifest.defaults = { ...manifest.defaults, provider: 'pixabay' }
manifest.items = manifest.items ?? {}

let merged = 0

const categoryManifestLoaders = {
  cat: catMediaManifestEntries,
  dog: dogMediaManifestEntries
}

const worldEntries = worldMediaManifestEntries()

if (!onlyCategory || categoryManifestLoaders[onlyCategory]) {
  const loader = onlyCategory ? categoryManifestLoaders[onlyCategory] : null
  const entries = loader
    ? loader()
    : {
        ...catMediaManifestEntries(),
        ...dogMediaManifestEntries(),
        ...worldEntries
      }
  for (const [slug, entry] of Object.entries(entries)) {
    if (onlyCategory && !slug.startsWith(`${onlyCategory}-`)) continue
    manifest.items[slug] = { ...manifest.items[slug], ...entry }
    merged++
  }
}

const SLUG_PREFIX_BY_CATEGORY = {
  superhero: 'hero-',
  supercar: 'supercar-',
  plant: 'plant-',
  anime: 'anime-',
  transformers: ['transformers-', 'tf-'],
  motorcycle: 'motorcycle-',
  movie: 'movie-',
  illustration: 'illustration-',
  'ui-design': 'ui-',
  interior: 'interior-',
  'industrial-design': 'industrial-',
  history: 'history-'
}

if (onlyCategory && !categoryManifestLoaders[onlyCategory]) {
  const prefixes = SLUG_PREFIX_BY_CATEGORY[onlyCategory]
  const list = prefixes ? (Array.isArray(prefixes) ? prefixes : [prefixes]) : []
  for (const [slug, entry] of Object.entries(worldEntries)) {
    if (!list.some((p) => slug.startsWith(p))) continue
    manifest.items[slug] = { ...manifest.items[slug], ...entry }
    merged++
  }
}

// 确保 catalog 中该分类条目在 manifest 至少有查询词
if (onlyCategory) {
  const requiredTag = onlyCategory === 'cat' ? 'cat' : onlyCategory === 'dog' ? 'dog' : null
  for (const item of catalog.items ?? []) {
    if (item.categoryId !== onlyCategory) continue
    if (manifest.items[item.slug]?.query) continue
    const tail = item.slug.replace(new RegExp(`^${onlyCategory}-`), '').replace(/-/g, ' ')
    const nameHint = (item.name ?? '').replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, ' ').split(/\s+/)[0]
    manifest.items[item.slug] = {
      provider: 'pixabay',
      category: requiredTag ? 'animals' : undefined,
      requiredTags: requiredTag ? [requiredTag] : [],
      query: worldEntries[item.slug]?.query ?? `${tail} ${nameHint}`.trim(),
      matchTags: worldEntries[item.slug]?.matchTags ?? tail.split(' ').filter(Boolean).slice(0, 3)
    }
    merged++
  }
}

// 为 catalog 中仍缺 query 的条目生成兜底搜索词
for (const item of catalog.items ?? []) {
  if (manifest.items[item.slug]?.query) continue
  const tail = item.slug.replace(/^[^-]+-/, '').replace(/-/g, ' ')
  const nameWords = (item.name ?? '')
    .replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .join(' ')
  manifest.items[item.slug] = {
    provider: 'pixabay',
    query: `${nameWords || tail} ${item.tags?.[0] ?? ''}`.trim(),
    matchTags: [...new Set([...(item.tags ?? []).slice(0, 3), ...tail.split(' ').slice(0, 2)])].filter(Boolean)
  }
  merged++
}

writeFileSync(mediaPath, JSON.stringify(manifest, null, 2) + '\n', 'utf-8')
console.log(`media.json 已更新 · 合并 ${merged} 条 · 默认 provider=pixabay`)
