import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import { resolveMediaConfig, providerEnvKey, clearMediaManifestCache } from './media-config.mjs'
import { downloadItemMedia } from './media-providers.mjs'
import { loadEnvFileSync, removeSvgsInLibrary } from './media-shared.mjs'
import { runPool } from './parallel-pool.mjs'
import { scanValidMediaFiles } from './disk-media.mjs'
import { libraryRelDirFromItem } from './media-path.mjs'

function catalogFromDisk(item, assetsLib) {
  const { categoryId, mediaDir } = libraryRelDirFromItem(item)
  const dir = join(assetsLib, categoryId, mediaDir)
  return scanValidMediaFiles(categoryId, mediaDir, dir)
}

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
    items = items.filter((item) => {
      const disk = catalogFromDisk(item, assetsLib)
      return !disk?.coverFile
    })
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
    throw new Error('请配置 .env 中的 PIXABAY_API_KEY')
  }

  const concurrency = opts.concurrency || 10
  console.log(
    `配图下载 · 并发 ${concurrency} · --force=${opts.force}${mode.retryMissing ? ' · retry' : ''}\n`
  )
  removeSvgsInLibrary(assetsLib)

  const updatedMap = new Map()
  let ok = 0
  let skip = 0
  let fail = 0

  await runPool(items, concurrency, async (item) => {
    const config = resolveMediaConfig(item.slug, item)
    const provider = opts.provider ?? config.provider
    const envKey = providerEnvKey(provider)
    if (provider !== 'manual' && envKey && !apiKeys[provider === 'pixabay' ? 'pixabay' : 'unsplash']) {
      console.warn(`▸ ${item.name} — 跳过（未配置 ${envKey}）`)
      fail++
      return
    }

    try {
      const media = await downloadItemMedia({
        assetsLib,
        item,
        config: { ...config, provider, imageCount: config.imageCount ?? item.mediaImageCount },
        provider,
        apiKeys,
        force: opts.force
      })

      if (media?.skipped && media.fromDisk) {
        const disk = catalogFromDisk(item, assetsLib)
        if (disk) {
          skip++
          updatedMap.set(item.slug, {
            ...item,
            coverFile: disk.coverFile,
            galleryFiles: disk.galleryFiles,
            contentFile: disk.contentFile
          })
        }
        return
      }

      updatedMap.set(item.slug, {
        ...item,
        coverFile: media.coverFile,
        galleryFiles: media.galleryFiles,
        coverAttribution: media.coverAttribution,
        galleryAttributions: media.galleryAttributions,
        mediaImageCount: media.imageCount,
        mediaProvider: provider
      })
      console.log(`  ✓ ${item.name} (${media.imageCount} 张)`)
      ok++
    } catch (e) {
      const disk = catalogFromDisk(item, assetsLib)
      if (disk) {
        updatedMap.set(item.slug, {
          ...item,
          coverFile: disk.coverFile,
          galleryFiles: disk.galleryFiles
        })
        console.warn(`  ~ ${item.name} — ${e.message}（保留已有 ${disk.galleryFiles.length + 1} 张）`)
        skip++
      } else {
        console.warn(`  ✗ ${item.name} — ${e.message}`)
        fail++
      }
    }
  })

  const touched = new Set(items.map((i) => i.slug))
  catalog.items = catalog.items.map((i) => (touched.has(i.slug) ? (updatedMap.get(i.slug) ?? i) : i))
  catalog.version = catalog.version ?? 7
  catalog.mediaProvider =
    opts.provider ?? [...updatedMap.values()].find((i) => i.mediaProvider)?.mediaProvider ?? defaultProvider

  writeFileSync(catalogPath, JSON.stringify(catalog, null, 2), 'utf-8')
  console.log(`\n完成: 更新 ${ok} · 跳过 ${skip} · 失败 ${fail}`)
  console.log('建议: npm run seed:library -- build && npm run seed:library:reimport -- --full')
}
