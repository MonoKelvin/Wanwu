import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import { resolveMediaConfig, providerEnvKey, clearMediaManifestCache } from './media-config.mjs'
import { downloadItemMedia } from './media-providers.mjs'
import { loadEnvFileSync, removeSvgsInLibrary } from './media-shared.mjs'

/**
 * @param {string} root
 * @param {import('./parse-args.mjs').parseArgs extends () => infer R ? R : never} opts
 * @param {{ retryMissing?: boolean }} [mode]
 */
export async function pipelineMedia(root, opts, mode = {}) {
  loadEnvFileSync(root)
  const catalogPath = join(root, 'assets', 'seed', 'library', 'catalog.json')
  const mediaPath = join(root, 'assets', 'seed', 'library', 'media.json')
  const assetsLib = join(root, 'assets', 'library')

  if (!existsSync(catalogPath)) {
    throw new Error('未找到 catalog.json，请先运行: npm run seed:library -- build')
  }

  const apiKeys = {
    pixabay: process.env.PIXABAY_API_KEY?.trim() || '',
    unsplash: process.env.UNSPLASH_ACCESS_KEY?.trim() || ''
  }

  let catalog = JSON.parse(readFileSync(catalogPath, 'utf-8'))
  let items = catalog.items ?? []

  if (mode.retryMissing) {
    items = items.filter((item) => !existsSync(join(root, 'assets', item.coverFile)))
    if (!items.length) {
      console.log('无缺图条目')
      return
    }
    const media = JSON.parse(readFileSync(mediaPath, 'utf-8'))
    for (const item of items) {
      const entry = media.items?.[item.slug]
      if (entry?.retryQuery) {
        media.items[item.slug] = { ...entry, query: entry.retryQuery, minMatchScore: 0 }
      }
    }
    writeFileSync(mediaPath, JSON.stringify(media, null, 2) + '\n', 'utf-8')
    clearMediaManifestCache()
    opts = { ...opts, force: true }
    console.log(`缺图重试: ${items.length} 条\n`)
  }

  if (opts.slug) items = items.filter((i) => i.slug === opts.slug)
  else if (opts.category) items = items.filter((i) => i.categoryId === opts.category)
  else if (opts.pack) items = items.filter((i) => i.categoryId === opts.pack)
  if (opts.limit > 0) items = items.slice(0, opts.limit)

  const defaultProvider = opts.provider ?? 'pixabay'
  if (!opts.provider && defaultProvider !== 'manual' && !apiKeys.pixabay && !apiKeys.unsplash) {
    throw new Error('请配置 .env 中的 PIXABAY_API_KEY（见 assets/seed/library/media.json）')
  }

  console.log(`配图下载 · --force=${opts.force}${mode.retryMissing ? ' · retry' : ''}\n`)
  removeSvgsInLibrary(assetsLib)

  const updatedMap = new Map()
  let ok = 0
  let skip = 0
  let fail = 0

  for (const item of items) {
    const config = resolveMediaConfig(item.slug, item)
    const provider = opts.provider ?? config.provider
    const envKey = providerEnvKey(provider)
    if (provider !== 'manual' && envKey && !apiKeys[provider === 'pixabay' ? 'pixabay' : 'unsplash']) {
      console.warn(`▸ ${item.name} — 跳过（未配置 ${envKey}）`)
      fail++
      continue
    }

    console.log(`▸ ${item.name} [${provider}] — ${config.query}`)
    try {
      const media = await downloadItemMedia({
        assetsLib,
        item,
        config: { ...config, provider },
        provider,
        apiKeys,
        force: opts.force
      })

      if (media?.skipped) {
        skip++
        updatedMap.set(item.slug, {
          ...item,
          ...(media.coverAttribution
            ? {
                coverAttribution: media.coverAttribution,
                galleryAttributions: media.galleryAttributions
              }
            : {})
        })
        continue
      }

      updatedMap.set(item.slug, {
        ...item,
        coverFile: media.coverFile,
        galleryFiles: media.galleryFiles,
        coverAttribution: media.coverAttribution,
        galleryAttributions: media.galleryAttributions,
        mediaProvider: provider
      })
      ok++
    } catch (e) {
      console.warn(`  ✗ ${e.message}`)
      fail++
      updatedMap.set(item.slug, item)
    }
  }

  const touched = new Set(items.map((i) => i.slug))
  catalog.items = catalog.items.map((i) => (touched.has(i.slug) ? (updatedMap.get(i.slug) ?? i) : i))
  catalog.version = catalog.version ?? 7
  catalog.mediaProvider =
    opts.provider ?? [...updatedMap.values()].find((i) => i.mediaProvider)?.mediaProvider ?? defaultProvider

  writeFileSync(catalogPath, JSON.stringify(catalog, null, 2), 'utf-8')
  console.log(`\n完成: 更新 ${ok} · 跳过 ${skip} · 失败 ${fail}`)
  console.log('入库: npm run seed:library:reimport 或重启应用')
}
