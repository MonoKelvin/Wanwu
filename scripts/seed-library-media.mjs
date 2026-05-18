/**
 * 全库配图统一下载（读取 assets/seed/library/media.json）
 *
 * 用法:
 *   npm run seed:library:media              # 默认 pixabay，仅处理需更新的条目
 *   npm run seed:library:media -- --force   # 覆盖全部 JPG
 *   npm run seed:library:media -- --slug=cat-british-shorthair
 *   npm run seed:library:media -- --provider=manual
 *   npm run seed:library:media -- --limit=3
 *
 * 环境变量见 media.json → providers（PIXABAY_API_KEY / UNSPLASH_ACCESS_KEY）
 */
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { resolveMediaConfig, providerEnvKey } from './library-media-config.mjs'
import { downloadItemMedia } from './library-media-providers.mjs'
import { loadEnvFileSync, removeSvgsInLibrary } from './library-media-shared.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const assetsLib = join(root, 'assets', 'library')
const catalogPath = join(root, 'assets', 'seed', 'library', 'catalog.json')

function parseArgs() {
  const argv = process.argv.slice(2)
  const force = argv.includes('--force')
  const limitArg = argv.find((a) => a.startsWith('--limit='))
  const limit = limitArg ? Number(limitArg.split('=')[1]) : 0
  const slugArg = argv.find((a) => a.startsWith('--slug='))
  const slug = slugArg ? slugArg.split('=')[1] : null
  const providerArg = argv.find((a) => a.startsWith('--provider='))
  const providerOverride = providerArg ? providerArg.split('=')[1] : null
  return { force, limit, slug, providerOverride }
}

async function main() {
  loadEnvFileSync(root)
  const { force, limit, slug, providerOverride } = parseArgs()

  if (!existsSync(catalogPath)) {
    console.error(`未找到 ${catalogPath}`)
    process.exit(1)
  }

  const apiKeys = {
    pixabay: process.env.PIXABAY_API_KEY?.trim() || '',
    unsplash: process.env.UNSPLASH_ACCESS_KEY?.trim() || ''
  }

  const catalog = JSON.parse(readFileSync(catalogPath, 'utf-8'))
  let items = catalog.items ?? []
  if (slug) items = items.filter((i) => i.slug === slug)
  if (limit > 0) items = items.slice(0, limit)

  const defaultProvider = providerOverride ?? 'pixabay'
  if (!providerOverride && defaultProvider !== 'manual' && !apiKeys.pixabay && !apiKeys.unsplash) {
    console.error('请在 .env 配置 PIXABAY_API_KEY（推荐）或 UNSPLASH_ACCESS_KEY')
    console.error('配置说明见 assets/seed/library/media.json')
    process.exit(1)
  }

  console.log(`全库配图 · 配置 media.json · --force=${force}\n`)
  removeSvgsInLibrary(assetsLib)

  const updatedMap = new Map()
  let ok = 0
  let skip = 0
  let fail = 0

  for (const item of items) {
    const config = resolveMediaConfig(item.slug, item)
    const provider = providerOverride ?? config.provider
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
        force
      })

      if (media?.skipped) {
        console.log('  (跳过下载)')
        skip++
        updatedMap.set(item.slug, { ...item })
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

  if (slug) {
    catalog.items = catalog.items.map((i) => updatedMap.get(i.slug) ?? i)
  } else if (limit > 0) {
    const touched = new Set(items.map((i) => i.slug))
    catalog.items = catalog.items.map((i) =>
      touched.has(i.slug) ? (updatedMap.get(i.slug) ?? i) : i
    )
  } else {
    catalog.items = catalog.items.map((i) => updatedMap.get(i.slug) ?? i)
  }

  const usedProvider =
    providerOverride ??
    [...updatedMap.values()].find((i) => i.mediaProvider)?.mediaProvider ??
    defaultProvider

  catalog.version = 6
  catalog.mediaProvider = usedProvider
  catalog.mediaConfigVersion = 2

  writeFileSync(catalogPath, JSON.stringify(catalog, null, 2), 'utf-8')

  console.log(`\n完成: 更新 ${ok} · 跳过 ${skip} · 失败 ${fail}`)
  console.log(`catalog.json → version ${catalog.version}, mediaProvider=${catalog.mediaProvider}`)
  console.log('请运行 npm run seed:library:reimport 或完全重启应用以写入 SQLite。')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
