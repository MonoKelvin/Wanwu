/**
 * 从 Unsplash 搜索并下载全库配图（封面 + 图库），更新 catalog.json
 *
 * 用法:
 *   1. 在 https://unsplash.com/developers 创建应用，获取 Access Key
 *   2. 在项目根目录创建 .env：UNSPLASH_ACCESS_KEY=你的密钥
 *   3. node scripts/seed-library.mjs
 *
 * 可选: --force  覆盖已有 JPG
 *       --limit N  仅处理前 N 条（调试）
 */
import {
  mkdirSync,
  writeFileSync,
  existsSync,
  unlinkSync,
  readFileSync,
  readdirSync,
  statSync
} from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { UNSPLASH_CURATED } from './library-unsplash-curated.mjs'
import { librarySearchQuery } from './library-image-queries.mjs'
import { attributionFromApiPhoto, attributionsFromCuratedUrls } from './unsplash-attribution-lib.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const assetsLib = join(root, 'assets', 'library')
const catalogPath = join(root, 'assets', 'seed', 'library', 'catalog.json')

const IMAGES_PER_ITEM = 4
const RATE_MS = 600

function loadEnv() {
  const envPath = join(root, '.env')
  if (!existsSync(envPath)) return
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const i = trimmed.indexOf('=')
    if (i < 1) continue
    const key = trimmed.slice(0, i).trim()
    const val = trimmed.slice(i + 1).trim().replace(/^["']|["']$/g, '')
    if (!process.env[key]) process.env[key] = val
  }
}

function relPath(categoryId, slug, filename) {
  return `library/${categoryId}/${slug}/${filename}`.replace(/\\/g, '/')
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

function removeSvgsInLibrary() {
  function walk(dir) {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name)
      if (statSync(p).isDirectory()) walk(p)
      else if (name.endsWith('.svg')) unlinkSync(p)
    }
  }
  if (existsSync(assetsLib)) walk(assetsLib)
}

async function downloadBinary(url, dest) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Wanwu/1.0 (Library Seed; +https://github.com/MonoKelvin/Wanwu)' },
    redirect: 'follow',
    signal: AbortSignal.timeout(120_000)
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  if (buf.length < 2000) throw new Error('文件过小')
  writeFileSync(dest, buf)
}

async function searchPhotos(accessKey, query, perPage) {
  const url = new URL('https://api.unsplash.com/search/photos')
  url.searchParams.set('query', query)
  url.searchParams.set('per_page', String(perPage))
  url.searchParams.set('orientation', 'squarish')

  const res = await fetch(url, {
    headers: {
      Authorization: `Client-ID ${accessKey}`,
      'Accept-Version': 'v1'
    },
    signal: AbortSignal.timeout(30_000)
  })
  if (res.status === 403 || res.status === 401) {
    throw new Error('Unsplash API 密钥无效或未授权，请检查 UNSPLASH_ACCESS_KEY')
  }
  if (!res.ok) throw new Error(`Unsplash 搜索失败 HTTP ${res.status}`)
  const data = await res.json()
  return data.results ?? []
}

async function triggerUnsplashDownload(accessKey, photo) {
  const url = `${photo.links.download_location}?client_id=${accessKey}`
  await fetch(url, { method: 'GET', signal: AbortSignal.timeout(15_000) })
}

function imageUrlFromPhoto(photo) {
  const base = photo.urls?.raw ?? photo.urls?.full ?? photo.urls?.regular
  if (!base) throw new Error('无图片地址')
  const u = new URL(base)
  u.searchParams.set('w', '1400')
  u.searchParams.set('q', '85')
  u.searchParams.set('fm', 'jpg')
  u.searchParams.set('auto', 'format')
  return u.toString()
}

/** 仅使用本物品精选 URL（已移除全局回退池，避免猫/狗条目错配风景图） */
function buildUrlPool(item) {
  const primary = UNSPLASH_CURATED[item.slug]
  if (!primary?.length) {
    throw new Error('无精选 Unsplash URL，请改用 npm run seed:library:media（Pixabay）')
  }
  return primary
}

async function downloadToFile(urlPool, dest, startIndex) {
  for (let i = startIndex; i < urlPool.length; i++) {
    try {
      await downloadBinary(urlPool[i], dest)
      return i + 1
    } catch {
      /* 尝试下一个 URL */
    }
  }
  throw new Error('所有候选图片均下载失败')
}

async function fetchItemImagesCurated(item, force) {
  const urlPool = buildUrlPool(item)
  const dir = join(assetsLib, item.categoryId, item.slug)
  mkdirSync(dir, { recursive: true })

  const targets = [
    { abs: join(dir, 'cover.jpg'), name: 'cover.jpg', rel: 'cover.jpg' },
    { abs: join(dir, 'gallery-01.jpg'), name: 'gallery-01.jpg', rel: 'gallery-01.jpg' },
    { abs: join(dir, 'gallery-02.jpg'), name: 'gallery-02.jpg', rel: 'gallery-02.jpg' },
    { abs: join(dir, 'gallery-03.jpg'), name: 'gallery-03.jpg', rel: 'gallery-03.jpg' }
  ]

  if (!force && targets.every((t) => existsSync(t.abs))) {
    return packMediaPaths(item, targets)
  }

  let poolIndex = 0
  for (const t of targets) {
    if (!force && existsSync(t.abs)) {
      console.log(`    ✓ ${t.name} (已有)`)
      continue
    }
    poolIndex = await downloadToFile(urlPool, t.abs, poolIndex)
    console.log(`    → ${t.name}`)
    await sleep(120)
  }

  const svgPath = join(dir, 'cover.svg')
  if (existsSync(svgPath)) unlinkSync(svgPath)

  return packMediaPaths(item, targets)
}

function tryPackPartialMedia(item) {
  const dir = join(assetsLib, item.categoryId, item.slug)
  const coverAbs = join(dir, 'cover.jpg')
  if (!existsSync(coverAbs)) return null
  const galleryFiles = []
  for (const name of ['gallery-01.jpg', 'gallery-02.jpg', 'gallery-03.jpg']) {
    const abs = join(dir, name)
    if (existsSync(abs)) galleryFiles.push(relPath(item.categoryId, item.slug, name))
  }
  return {
    ...item,
    coverFile: relPath(item.categoryId, item.slug, 'cover.jpg'),
    galleryFiles
  }
}

function packMediaPaths(item, targets, photos = []) {
  if (!existsSync(targets[0].abs)) throw new Error('缺少封面图')
  const galleryFiles = []
  for (const t of targets.slice(1)) {
    if (existsSync(t.abs)) galleryFiles.push(relPath(item.categoryId, item.slug, t.rel))
  }
  const result = {
    coverFile: relPath(item.categoryId, item.slug, 'cover.jpg'),
    galleryFiles
  }
  if (photos.length) {
    result.coverAttribution = attributionFromApiPhoto(photos[0])
    result.galleryAttributions = [1, 2, 3].map((i) =>
      attributionFromApiPhoto(photos[i] ?? photos[photos.length - 1])
    )
  }
  return result
}

async function enrichAttributionOnly(accessKey, item) {
  const curated = UNSPLASH_CURATED[item.slug]
  if (curated?.length) {
    return attributionsFromCuratedUrls(accessKey, curated, sleep)
  }
  const query = librarySearchQuery(item)
  const photos = await searchPhotos(accessKey, query, IMAGES_PER_ITEM)
  if (!photos.length) return null
  return {
    coverAttribution: attributionFromApiPhoto(photos[0]),
    galleryAttributions: [1, 2, 3].map((i) =>
      attributionFromApiPhoto(photos[i] ?? photos[photos.length - 1])
    )
  }
}

async function fetchItemImagesApi(accessKey, item, force) {
  const dir = join(assetsLib, item.categoryId, item.slug)
  mkdirSync(dir, { recursive: true })

  const absCover = join(dir, 'cover.jpg')
  const galleryAbs = [1, 2, 3].map((n) => join(dir, `gallery-${String(n).padStart(2, '0')}.jpg`))
  const allAbs = [absCover, ...galleryAbs]

  const targetRowsCached = [
    { abs: absCover, rel: 'cover.jpg' },
    { abs: galleryAbs[0], rel: 'gallery-01.jpg' },
    { abs: galleryAbs[1], rel: 'gallery-02.jpg' },
    { abs: galleryAbs[2], rel: 'gallery-03.jpg' }
  ]
  if (!force && allAbs.every((p) => existsSync(p))) {
    return packMediaPaths(item, targetRowsCached)
  }

  const query = librarySearchQuery(item)
  console.log(`  搜索: ${query}`)
  const photos = await searchPhotos(accessKey, query, IMAGES_PER_ITEM)
  if (photos.length === 0) throw new Error('未找到图片')

  const targets = [
    { abs: absCover, name: 'cover.jpg' },
    { abs: galleryAbs[0], name: 'gallery-01.jpg' },
    { abs: galleryAbs[1], name: 'gallery-02.jpg' },
    { abs: galleryAbs[2], name: 'gallery-03.jpg' }
  ]

  for (let i = 0; i < targets.length; i++) {
    const photo = photos[i] ?? photos[photos.length - 1]
    const { abs, name } = targets[i]
    await triggerUnsplashDownload(accessKey, photo)
    await downloadBinary(imageUrlFromPhoto(photo), abs)
    console.log(`    → ${name} (${photo.user?.name ?? 'Unsplash'})`)
    await sleep(200)
  }

  const svgPath = join(dir, 'cover.svg')
  if (existsSync(svgPath)) unlinkSync(svgPath)

  const targetRows = [
    { abs: absCover, rel: 'cover.jpg', name: 'cover.jpg' },
    { abs: galleryAbs[0], rel: 'gallery-01.jpg', name: 'gallery-01.jpg' },
    { abs: galleryAbs[1], rel: 'gallery-02.jpg', name: 'gallery-02.jpg' },
    { abs: galleryAbs[2], rel: 'gallery-03.jpg', name: 'gallery-03.jpg' }
  ]
  return packMediaPaths(item, targetRows, photos)
}

async function main() {
  console.warn(
    '\n⚠ 已弃用：Unsplash 精选直链易图文不符。推荐: npm run seed:library:media\n'
  )
  loadEnv()
  const accessKey = process.env.UNSPLASH_ACCESS_KEY?.trim()
  const useApi = Boolean(accessKey) && !process.argv.includes('--curated')
  if (!useApi) {
    console.log('模式: 精选 Unsplash 直链下载（无需 API Key）')
    console.log('提示: 配置 UNSPLASH_ACCESS_KEY 后可自动搜索更多配图\n')
  }

  if (!existsSync(catalogPath)) {
    console.error(`未找到 ${catalogPath}，请先确保 catalog 存在。`)
    process.exit(1)
  }

  const force = process.argv.includes('--force')
  const limitArg = process.argv.find((a) => a.startsWith('--limit='))
  const limit = limitArg ? Number(limitArg.split('=')[1]) : 0

  console.log('移除旧 SVG 占位图…')
  removeSvgsInLibrary()

  const catalog = JSON.parse(readFileSync(catalogPath, 'utf-8'))
  const items = limit > 0 ? catalog.items.slice(0, limit) : catalog.items
  const updated = []

  console.log(`处理 ${items.length} 个物品…\n`)

  for (const item of items) {
    console.log(`▸ ${item.name}`)
    try {
      const media = useApi
        ? await fetchItemImagesApi(accessKey, item, force)
        : await fetchItemImagesCurated(item, force)
      const entry = {
        ...item,
        coverFile: media.coverFile,
        galleryFiles: media.galleryFiles,
        coverAttribution: media.coverAttribution,
        galleryAttributions: media.galleryAttributions
      }
      if (accessKey && !entry.coverAttribution) {
        console.log('  补充摄影师归属…')
        const attr = await enrichAttributionOnly(accessKey, item)
        if (attr) Object.assign(entry, attr)
      }
      updated.push(entry)
    } catch (e) {
      console.warn(`  ✗ 失败: ${e.message}`)
      const partial = tryPackPartialMedia(item)
      updated.push(partial ?? item)
    }
    await sleep(RATE_MS)
  }

  if (limit > 0) {
    const rest = catalog.items.slice(limit)
    catalog.items = [...updated, ...rest]
  } else {
    catalog.items = updated
  }
  catalog.version = 4

  writeFileSync(catalogPath, JSON.stringify(catalog, null, 2), 'utf-8')
  console.log(`\n已更新 ${catalogPath}（version ${catalog.version}）`)
  if (!accessKey) {
    console.log('提示: 配置 UNSPLASH_ACCESS_KEY 后运行 npm run seed:library:attribution 可写入摄影师归属')
  }
  console.log('请完全重启应用以写入各分类 SQLite 数据库。')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
