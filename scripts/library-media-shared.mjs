import {
  existsSync,
  mkdirSync,
  writeFileSync,
  unlinkSync,
  readdirSync,
  statSync,
  readFileSync
} from 'fs'
import { join } from 'path'

export const IMAGES_PER_ITEM = 4
export const DOWNLOAD_GAP_MS = 350

export function loadEnvFileSync(root) {
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

export function relPath(categoryId, slug, filename) {
  return `library/${categoryId}/${slug}/${filename}`.replace(/\\/g, '/')
}

export function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

export function removeSvgsInLibrary(assetsLib) {
  function walk(dir) {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name)
      if (statSync(p).isDirectory()) walk(p)
      else if (name.endsWith('.svg')) unlinkSync(p)
    }
  }
  if (existsSync(assetsLib)) walk(assetsLib)
}

export async function downloadBinary(url, dest, { retries = 5 } = {}) {
  let lastErr
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Wanwu/1.0 (Library Seed; +https://github.com/MonoKelvin/Wanwu)' },
        redirect: 'follow',
        signal: AbortSignal.timeout(120_000)
      })
      if (res.status === 429) {
        await sleep(2000 * (attempt + 1))
        throw new Error('HTTP 429')
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const buf = Buffer.from(await res.arrayBuffer())
      if (buf.length < 2000) throw new Error('文件过小')
      const ct = (res.headers.get('content-type') ?? '').toLowerCase()
      if (ct.includes('svg')) throw new Error('跳过 SVG')
      writeFileSync(dest, buf)
      return
    } catch (e) {
      lastErr = e
      if (attempt < retries) await sleep(1500 * (attempt + 1))
    }
  }
  throw lastErr
}

export function packCatalogMedia(item, hits, attributionFromHit) {
  const coverFile = relPath(item.categoryId, item.slug, 'cover.jpg')
  const galleryFiles = ['gallery-01.jpg', 'gallery-02.jpg', 'gallery-03.jpg'].map((f) =>
    relPath(item.categoryId, item.slug, f)
  )
  const slice = hits.slice(0, IMAGES_PER_ITEM)
  return {
    coverFile,
    galleryFiles,
    coverAttribution: attributionFromHit(slice[0]),
    galleryAttributions: [1, 2, 3].map((i) =>
      attributionFromHit(slice[i] ?? slice[slice.length - 1])
    )
  }
}

export function itemMediaTargets(assetsLib, item) {
  const dir = join(assetsLib, item.categoryId, item.slug)
  return {
    dir,
    targets: [
      { abs: join(dir, 'cover.jpg'), name: 'cover.jpg' },
      { abs: join(dir, 'gallery-01.jpg'), name: 'gallery-01.jpg' },
      { abs: join(dir, 'gallery-02.jpg'), name: 'gallery-02.jpg' },
      { abs: join(dir, 'gallery-03.jpg'), name: 'gallery-03.jpg' }
    ]
  }
}

export function ensureItemDir(dir) {
  mkdirSync(dir, { recursive: true })
}

export function clearCoverSvg(dir) {
  const svgPath = join(dir, 'cover.svg')
  if (existsSync(svgPath)) unlinkSync(svgPath)
}
