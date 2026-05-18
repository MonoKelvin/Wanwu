/**
 * 为缺少封面的条目应用备用搜索词并重新下载
 */
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { RETRY_MEDIA_QUERIES } from './library-media-queries-retry.mjs'
import { downloadItemMedia } from './library-media-providers.mjs'
import { resolveMediaConfig, clearMediaManifestCache } from './library-media-config.mjs'
import { loadEnvFileSync } from './library-media-shared.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const assetsLib = join(root, 'assets', 'library')
const catalogPath = join(root, 'assets', 'seed', 'library', 'catalog.json')
const mediaPath = join(root, 'assets', 'seed', 'library', 'media.json')

loadEnvFileSync(root)
const apiKey = process.env.PIXABAY_API_KEY?.trim()
if (!apiKey) {
  console.error('需要 PIXABAY_API_KEY')
  process.exit(1)
}

const catalog = JSON.parse(readFileSync(catalogPath, 'utf-8'))
const media = JSON.parse(readFileSync(mediaPath, 'utf-8'))

const missing = catalog.items.filter((item) => {
  const cover = join(root, 'assets', item.coverFile)
  return !existsSync(cover)
})

console.log(`缺少封面: ${missing.length} 条\n`)

let ok = 0
let fail = 0
const updatedMap = new Map(catalog.items.map((i) => [i.slug, i]))

for (const item of missing) {
  const retry = RETRY_MEDIA_QUERIES[item.slug]
  if (retry) {
    media.items[item.slug] = {
      provider: 'pixabay',
      minMatchScore: 0,
      ...media.items[item.slug],
      ...retry
    }
  }
  writeFileSync(mediaPath, JSON.stringify(media, null, 2) + '\n', 'utf-8')
  clearMediaManifestCache()

  const config = resolveMediaConfig(item.slug, item)
  console.log(`▸ ${item.name} — ${config.query}`)
  try {
    const result = await downloadItemMedia({
      assetsLib,
      item,
      config: { ...config, provider: 'pixabay' },
      provider: 'pixabay',
      apiKeys: { pixabay: apiKey, unsplash: '' },
      force: true
    })
    if (result?.coverAttribution) {
      updatedMap.set(item.slug, {
        ...item,
        coverFile: result.coverFile,
        galleryFiles: result.galleryFiles,
        coverAttribution: result.coverAttribution,
        galleryAttributions: result.galleryAttributions,
        mediaProvider: 'pixabay'
      })
    }
    ok++
  } catch (e) {
    console.warn(`  ✗ ${e.message}`)
    fail++
  }
}

catalog.items = catalog.items.map((i) => updatedMap.get(i.slug) ?? i)
writeFileSync(catalogPath, JSON.stringify(catalog, null, 2), 'utf-8')
console.log(`\n完成: 成功 ${ok} · 失败 ${fail}`)
