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
import { libraryRelDirFromItem } from './media-path.mjs'

export const DEFAULT_IMAGES_PER_ITEM = 8
export const MAX_IMAGES_PER_ITEM = 12
export const MIN_MEDIA_BYTES = 2500

export function mediaFileNames(imageCount) {
  const n = Math.min(MAX_IMAGES_PER_ITEM, Math.max(1, imageCount))
  const names = ['cover.jpg']
  for (let i = 1; i < n; i++) {
    names.push(`gallery-${String(i).padStart(2, '0')}.jpg`)
  }
  return names
}

/** @param {string} categoryId @param {string} mediaDir @param {string} filename */
export function relPath(categoryId, mediaDir, filename) {
  return `library/${categoryId}/${mediaDir}/${filename}`.replace(/\\/g, '/')
}

export function loadPixabayKeyFromCursorMcp() {
  if (process.env.PIXABAY_API_KEY?.trim()) return true
  const home = process.env.USERPROFILE || process.env.HOME || ''
  if (!home) return false
  const mcpPath = join(home, '.cursor', 'mcp.json')
  if (!existsSync(mcpPath)) return false
  try {
    const data = JSON.parse(readFileSync(mcpPath, 'utf8'))
    const key = data.mcpServers?.['pixabay-mcp']?.env?.PIXABAY_API_KEY
    if (typeof key === 'string' && key.trim()) {
      process.env.PIXABAY_API_KEY = key.trim()
      return true
    }
  } catch {
    /* ignore */
  }
  return false
}

export function loadEnvFileSync(root) {
  const envPath = join(root, '.env')
  if (existsSync(envPath)) {
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
  loadPixabayKeyFromCursorMcp()
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

export async function downloadBinary(url, dest, { retries = 3 } = {}) {
  let lastErr
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Wanwu/1.0 (Library Seed; +https://github.com/MonoKelvin/Wanwu)' },
        redirect: 'follow',
        signal: AbortSignal.timeout(120_000)
      })
      if (res.status === 429) {
        await sleep(1500 * (attempt + 1))
        throw new Error('HTTP 429')
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const buf = Buffer.from(await res.arrayBuffer())
      if (buf.length < MIN_MEDIA_BYTES) throw new Error('文件过小')
      const ct = (res.headers.get('content-type') ?? '').toLowerCase()
      if (ct.includes('svg')) throw new Error('跳过 SVG')
      writeFileSync(dest, buf)
      return
    } catch (e) {
      lastErr = e
      if (attempt < retries) await sleep(800 * (attempt + 1))
    }
  }
  throw lastErr
}

export function dedupeHits(hits, limit) {
  const seen = new Set()
  const out = []
  for (const hit of hits) {
    const key = String(hit.id ?? hit.pageURL ?? '')
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(hit)
    if (out.length >= limit) break
  }
  return out
}

/**
 * @param {object} item
 * @param {{ name: string, attribution: object|null }[]} slots
 */
export function packCatalogMediaFromSlots(item, slots) {
  const { categoryId, mediaDir } = libraryRelDirFromItem(item)
  if (!slots.length) throw new Error('至少需一张封面')

  const coverFile = relPath(categoryId, mediaDir, slots[0].name)
  const galleryFiles = slots.slice(1).map((s) => relPath(categoryId, mediaDir, s.name))

  return {
    coverFile,
    galleryFiles,
    coverAttribution: slots[0].attribution,
    galleryAttributions: slots.slice(1).map((s) => s.attribution),
    imageCount: slots.length
  }
}

/** @param {string} assetsLib @param {object} item @param {number} imageCount */
export function itemMediaTargets(assetsLib, item, imageCount = DEFAULT_IMAGES_PER_ITEM) {
  const { categoryId, mediaDir } = libraryRelDirFromItem(item)
  const dir = join(assetsLib, categoryId, mediaDir)
  const names = mediaFileNames(imageCount)
  return {
    dir,
    categoryId,
    mediaDir,
    targets: names.map((name) => ({ abs: join(dir, name), name }))
  }
}

export function ensureItemDir(dir) {
  mkdirSync(dir, { recursive: true })
}

export function clearCoverSvg(dir) {
  const svgPath = join(dir, 'cover.svg')
  if (existsSync(svgPath)) unlinkSync(svgPath)
}

export function pruneGalleryFiles(dir, keepNames) {
  if (!existsSync(dir)) return
  const keep = new Set(keepNames)
  for (const name of readdirSync(dir)) {
    if (/^gallery-\d+\.jpg$/i.test(name) && !keep.has(name)) {
      unlinkSync(join(dir, name))
    }
  }
}
