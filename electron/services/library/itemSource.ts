// 
// 从 assets/seed/library/items 各 JSON 加载图鉴种子（不依赖 catalog.json）
// 
import { existsSync, readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'
import { getBundledAssetsRoot } from '../core/assetsRoot'
import { coverRelativePath, slugDirCandidates } from '../media/library'
import { loadLibraryCategories } from './categories'
import { getLibrarySeedRoot } from './paths'
import type { LibraryCatalog, LibraryCatalogItem } from './seed'

const LIBRARY_CATALOG_SCHEMA = 3

const COVER_FILENAMES = ['cover.jpg', 'cover.jpeg', 'cover.png', 'cover.webp']
const GALLERY_PATTERN = /^gallery-\d+\.(jpe?g|png|webp)$/i
const SKIP_BASENAMES = new Set(['_defaults.json'])

export interface SeedFingerprint {
  itemCount: number
  newestMtimeMs: number
  totalBytes: number
}

export interface LibrarySeedItemRaw {
  id?: string
  slug?: string
  subCategoryId?: string
  name?: string
  summary?: string
  tags?: string[]
  specs?: Record<string, string>
  contentFile?: string
  media?: Record<string, unknown>
}

function getLibraryItemsDir(): string {
  return join(getLibrarySeedRoot(), 'items')
}

function isSeedItemFile(name: string): boolean {
  if (!name.endsWith('.json')) return false
  if (SKIP_BASENAMES.has(name)) return false
  if (name.startsWith('_')) return false
  return true
}

function walkSeedJsonFiles(dir: string, categoryId: string | null, out: Array<{ abs: string; categoryId: string }>): void {
  if (!existsSync(dir)) return
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const abs = join(dir, ent.name)
    if (ent.isDirectory()) {
      const nextCategory = categoryId ?? ent.name
      walkSeedJsonFiles(abs, nextCategory, out)
      continue
    }
    if (!isSeedItemFile(ent.name)) continue
    if (!categoryId) continue
    out.push({ abs, categoryId })
  }
}

function resolveMediaDir(categoryId: string, slug: string): string | null {
  for (const dirName of slugDirCandidates(categoryId, slug)) {
    const abs = join(getBundledAssetsRoot(), 'library', categoryId, dirName)
    if (existsSync(abs)) return dirName
  }
  return slugDirCandidates(categoryId, slug)[0] ?? slug
}

function discoverCoverRelative(categoryId: string, slug: string): string | null {
  for (const dirName of slugDirCandidates(categoryId, slug)) {
    for (const file of COVER_FILENAMES) {
      const rel = coverRelativePath(categoryId, dirName, file)
      if (existsSync(join(getBundledAssetsRoot(), rel))) return rel
    }
  }
  return null
}

function discoverGalleryRelatives(categoryId: string, slug: string): string[] {
  for (const dirName of slugDirCandidates(categoryId, slug)) {
    const dirAbs = join(getBundledAssetsRoot(), 'library', categoryId, dirName)
    if (!existsSync(dirAbs)) continue
    const files = readdirSync(dirAbs)
      .filter((f) => GALLERY_PATTERN.test(f))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    if (files.length === 0) continue
    return files.map((f) => `library/${categoryId}/${dirName}/${f}`)
  }
  return []
}

function defaultContentFile(categoryId: string, slug: string): string {
  const dirName = resolveMediaDir(categoryId, slug) ?? slug
  return `library/${categoryId}/${dirName}/content.md`
}

function parseSeedItemFile(abs: string, categoryId: string): LibraryCatalogItem | null {
  let raw: LibrarySeedItemRaw
  try {
    raw = JSON.parse(readFileSync(abs, 'utf-8')) as LibrarySeedItemRaw
  } catch {
    console.warn('[librarySeed] 跳过无效 JSON:', abs)
    return null
  }

  const id = raw.id?.trim()
  const slug = raw.slug?.trim()
  const name = raw.name?.trim()
  if (!id || !slug || !name) {
    console.warn('[librarySeed] 跳过缺少 id/slug/name 的条目:', abs)
    return null
  }

  const subCategoryId = raw.subCategoryId?.trim() ?? ''
  const coverFile = discoverCoverRelative(categoryId, slug) ?? undefined
  const galleryFiles = discoverGalleryRelatives(categoryId, slug)

  return {
    id,
    slug,
    categoryId,
    subCategoryId,
    name,
    summary: raw.summary?.trim() ?? '',
    tags: Array.isArray(raw.tags) ? raw.tags.map(String) : [],
    specs: raw.specs && typeof raw.specs === 'object' ? raw.specs : {},
    contentFile: raw.contentFile?.replace(/\\/g, '/') ?? defaultContentFile(categoryId, slug),
    coverFile,
    galleryFiles: galleryFiles.length > 0 ? galleryFiles : undefined,
    mediaProvider: typeof raw.media?.provider === 'string' ? raw.media.provider : undefined
  }
}

/** 扫描 items 目录指纹（不解析 JSON，用于增量跳过） */
export function computeSeedFingerprint(): SeedFingerprint {
  const itemsDir = getLibraryItemsDir()
  const files: Array<{ abs: string; categoryId: string }> = []
  walkSeedJsonFiles(itemsDir, null, files)

  let newestMtimeMs = 0
  let totalBytes = 0
  for (const { abs } of files) {
    const st = statSync(abs)
    newestMtimeMs = Math.max(newestMtimeMs, st.mtimeMs)
    totalBytes += st.size
  }

  return { itemCount: files.length, newestMtimeMs, totalBytes }
}

export function getSeedFingerprintToken(fp: SeedFingerprint): string {
  return `schema:${LIBRARY_CATALOG_SCHEMA}:n:${fp.itemCount}:mtime:${fp.newestMtimeMs}:size:${fp.totalBytes}`
}

/** 加载全部种子条目（含配图路径发现） */
export function loadLibrarySeedItems(): LibraryCatalogItem[] {
  const itemsDir = getLibraryItemsDir()
  const files: Array<{ abs: string; categoryId: string }> = []
  walkSeedJsonFiles(itemsDir, null, files)

  const items: LibraryCatalogItem[] = []
  for (const { abs, categoryId } of files) {
    const item = parseSeedItemFile(abs, categoryId)
    if (item) items.push(item)
  }
  items.sort((a, b) => a.slug.localeCompare(b.slug))
  return items
}

/** 兼容旧 API：由 items 扫描构造虚拟 catalog */
export function loadLibrarySeedCatalog(): LibraryCatalog | null {
  const items = loadLibrarySeedItems()
  if (!items.length) return null
  const cats = loadLibraryCategories()
  return {
    schema: LIBRARY_CATALOG_SCHEMA,
    mediaConfigVersion: cats?.version ?? 0,
    items
  }
}

export function hasLibrarySeedItems(): boolean {
  return computeSeedFingerprint().itemCount > 0
}
