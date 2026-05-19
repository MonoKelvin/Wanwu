import { writeFileSync, readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { buildItemsFromSeed } from './items.mjs'
import { mergeExistingAttributions, fillMissingMediaQueries } from './seed-utils.mjs'

const PROVIDERS = {
  pixabay: { envKey: 'PIXABAY_API_KEY', docs: 'https://pixabay.com/api/docs/' },
  unsplash: { envKey: 'UNSPLASH_ACCESS_KEY', docs: 'https://unsplash.com/developers' },
  manual: { note: '将 cover.jpg、gallery-01~03.jpg 放入 assets/library/{categoryId}/{slug}/' }
}

/**
 * @param {string} root
 * @param {{ pack?: string|null, category?: string|null }} opts
 */
export function pipelineBuild(root, opts = {}) {
  const seedDir = join(root, 'assets', 'seed', 'library')
  const catalogPath = join(seedDir, 'catalog.json')
  const mediaPath = join(seedDir, 'media.json')

  const filter = {}
  if (opts.pack) filter.pack = opts.pack
  if (opts.category) filter.category = opts.category

  const built = buildItemsFromSeed(root, filter)
  let items = mergeExistingAttributions(built.catalogItems, catalogPath)
  const mediaItems = fillMissingMediaQueries(built.mediaItems, items, {
    provider: 'pixabay',
    imageType: 'photo',
    orientation: 'all',
    minMatchScore: 1,
    perPage: 24
  })

  const prevMedia = existsSync(mediaPath)
    ? JSON.parse(readFileSync(mediaPath, 'utf-8'))
    : { providers: PROVIDERS }

  const slugSet = new Set(items.map((i) => i.slug))
  const prunedPrev = Object.fromEntries(
    Object.entries(prevMedia.items ?? {}).filter(([slug]) => slugSet.has(slug))
  )

  const catalog = {
    schema: 3,
    mediaProvider: 'pixabay',
    mediaConfigVersion: 2,
    items
  }

  const media = {
    version: 2,
    defaults: prevMedia.defaults ?? {
      provider: 'pixabay',
      imageType: 'photo',
      orientation: 'all',
      minMatchScore: 1,
      perPage: 24
    },
    providers: prevMedia.providers ?? PROVIDERS,
    items: { ...prunedPrev, ...mediaItems }
  }

  writeFileSync(catalogPath, JSON.stringify(catalog, null, 2), 'utf-8')
  writeFileSync(mediaPath, JSON.stringify(media, null, 2) + '\n', 'utf-8')

  console.log(
    `已生成 catalog.json（${items.length} 条，${built.categoryCount} 个分类 / ${built.fileCount} 个物品文件）与 media.json（${Object.keys(media.items).length} 条）`
  )
}
