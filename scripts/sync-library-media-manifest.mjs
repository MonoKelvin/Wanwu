/**
 * 将 catalog / 品种查询合并进 assets/seed/library/media.json
 * 用法: node scripts/sync-library-media-manifest.mjs [--category=cat]
 */
import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { catMediaManifestEntries } from './library-cat-media-queries.mjs'
import { dogMediaManifestEntries } from './library-dog-media-queries.mjs'

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

if (!onlyCategory || categoryManifestLoaders[onlyCategory]) {
  const loader = onlyCategory ? categoryManifestLoaders[onlyCategory] : null
  const entries = loader
    ? loader()
    : {
        ...catMediaManifestEntries(),
        ...dogMediaManifestEntries()
      }
  for (const [slug, entry] of Object.entries(entries)) {
    if (onlyCategory && !slug.startsWith(`${onlyCategory}-`)) continue
    manifest.items[slug] = { ...manifest.items[slug], ...entry }
    merged++
  }
}

// 确保 catalog 中该分类条目在 manifest 至少有 animals + 物种标签
if (onlyCategory) {
  const requiredTag = onlyCategory === 'cat' ? 'cat' : onlyCategory === 'dog' ? 'dog' : null
  for (const item of catalog.items ?? []) {
    if (item.categoryId !== onlyCategory) continue
    if (manifest.items[item.slug]?.query) continue
    const tail = item.slug.replace(new RegExp(`^${onlyCategory}-`), '').replace(/-/g, ' ')
    manifest.items[item.slug] = {
      provider: 'pixabay',
      category: 'animals',
      requiredTags: requiredTag ? [requiredTag] : [],
      query: `${tail} ${requiredTag ?? ''}`.trim(),
      matchTags: [requiredTag, ...tail.split(' ').filter(Boolean).slice(0, 3)].filter(Boolean)
    }
    merged++
  }
}

writeFileSync(mediaPath, JSON.stringify(manifest, null, 2) + '\n', 'utf-8')
console.log(`media.json 已更新 · 合并 ${merged} 条 · 默认 provider=pixabay`)
