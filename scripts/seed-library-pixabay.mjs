/**
 * 通过 Pixabay API 下载全库配图（与 pixabay-mcp search_pixabay_images 同源）
 *
 * 用法:
 *   1. https://pixabay.com/api/docs/ 申请 API Key
 *   2. .env 填入 PIXABAY_API_KEY=...
 *   3. npm run seed:library:pixabay
 *
 * API 限速：100 次 / 60 秒（脚本对每次搜索自动间隔 ≥600ms）
 *
 * 可选: --force  覆盖已有 JPG
 *       --limit=N  仅处理前 N 条
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
import { librarySearchQuery } from './library-image-queries.mjs'
import {
  PixabayRateLimiter,
  searchPixabayImages,
  attributionFromPixabayHit,
  imageDownloadUrl
} from './pixabay-api-lib.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const assetsLib = join(root, 'assets', 'library')
const catalogPath = join(root, 'assets', 'seed', 'library', 'catalog.json')

const IMAGES_PER_ITEM = 4
const DOWNLOAD_GAP_MS = 80

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
  const ct = (res.headers.get('content-type') ?? '').toLowerCase()
  if (ct.includes('svg')) throw new Error('跳过 SVG')
  writeFileSync(dest, buf)
}

function packMedia(item, hits) {
  const coverFile = relPath(item.categoryId, item.slug, 'cover.jpg')
  const galleryFiles = ['gallery-01.jpg', 'gallery-02.jpg', 'gallery-03.jpg'].map((f) =>
    relPath(item.categoryId, item.slug, f)
  )
  return {
    coverFile,
    galleryFiles,
    coverAttribution: attributionFromPixabayHit(hits[0]),
    galleryAttributions: [1, 2, 3].map((i) =>
      attributionFromPixabayHit(hits[i] ?? hits[hits.length - 1])
    )
  }
}

async function fetchItemImagesPixabay(apiKey, limiter, item, force) {
  const dir = join(assetsLib, item.categoryId, item.slug)
  mkdirSync(dir, { recursive: true })

  const targets = [
    { abs: join(dir, 'cover.jpg'), name: 'cover.jpg' },
    { abs: join(dir, 'gallery-01.jpg'), name: 'gallery-01.jpg' },
    { abs: join(dir, 'gallery-02.jpg'), name: 'gallery-02.jpg' },
    { abs: join(dir, 'gallery-03.jpg'), name: 'gallery-03.jpg' }
  ]

  if (!force && targets.every((t) => existsSync(t.abs))) {
    console.log('  (已有 JPG，跳过下载；使用 --force 覆盖)')
    return null
  }

  const query = librarySearchQuery(item)
  console.log(`  搜索: ${query}`)
  const hits = await searchPixabayImages(apiKey, query, {
    perPage: IMAGES_PER_ITEM,
    imageType: 'photo',
    limiter
  })
  if (hits.length === 0) throw new Error('未找到图片')

  for (let i = 0; i < targets.length; i++) {
    const hit = hits[i] ?? hits[hits.length - 1]
    const { abs, name } = targets[i]
    if (!force && existsSync(abs)) {
      console.log(`    ✓ ${name} (已有)`)
      continue
    }
    const url = imageDownloadUrl(hit)
    await downloadBinary(url, abs)
    console.log(`    → ${name} (${hit.user ?? 'Pixabay'})`)
    await sleep(DOWNLOAD_GAP_MS)
  }

  const svgPath = join(dir, 'cover.svg')
  if (existsSync(svgPath)) unlinkSync(svgPath)

  return packMedia(item, hits.slice(0, IMAGES_PER_ITEM))
}

async function main() {
  loadEnv()
  const apiKey = process.env.PIXABAY_API_KEY?.trim()
  if (!apiKey) {
    console.error('需要 PIXABAY_API_KEY（.env）')
    console.error('申请: https://pixabay.com/api/docs/')
    console.error('或在 Cursor 中用 pixabay-mcp 搜索后，将 Key 写入 .env 再运行本脚本')
    process.exit(1)
  }

  if (!existsSync(catalogPath)) {
    console.error(`未找到 ${catalogPath}`)
    process.exit(1)
  }

  const force = process.argv.includes('--force')
  const limitArg = process.argv.find((a) => a.startsWith('--limit='))
  const limit = limitArg ? Number(limitArg.split('=')[1]) : 0

  console.log('模式: Pixabay API（限速 100 次/60 秒，每次搜索间隔 ≥600ms）\n')

  removeSvgsInLibrary()

  const catalog = JSON.parse(readFileSync(catalogPath, 'utf-8'))
  const items = limit > 0 ? catalog.items.slice(0, limit) : catalog.items
  const updated = []
  const limiter = new PixabayRateLimiter(100)

  console.log(`处理 ${items.length} 个物品…\n`)

  for (const item of items) {
    console.log(`▸ ${item.name}`)
    try {
      const media = await fetchItemImagesPixabay(apiKey, limiter, item, force)
      const entry = media
        ? {
            ...item,
            coverFile: media.coverFile,
            galleryFiles: media.galleryFiles,
            coverAttribution: media.coverAttribution,
            galleryAttributions: media.galleryAttributions
          }
        : { ...item }
      updated.push(entry)
    } catch (e) {
      console.warn(`  ✗ ${e.message}`)
      updated.push(item)
    }
  }

  if (limit > 0) {
    catalog.items = [...updated, ...catalog.items.slice(limit)]
  } else {
    catalog.items = updated
  }
  catalog.version = 4
  catalog.imageProvider = 'pixabay'

  writeFileSync(catalogPath, JSON.stringify(catalog, null, 2), 'utf-8')
  console.log(`\n已更新 ${catalogPath}（version ${catalog.version}，来源 Pixabay）`)
  console.log('请完全重启应用以写入各分类 SQLite 数据库。')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
