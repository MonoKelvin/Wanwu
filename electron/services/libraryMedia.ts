import { app } from 'electron'
import { existsSync, readdirSync } from 'fs'
import { join } from 'path'

/** 相对路径示例：library/cat/cat-british-shorthair/cover.jpg */
export function getLibraryAssetsRoot(): string {
  if (app.isPackaged) {
    return join(process.resourcesPath, 'assets')
  }
  return join(process.cwd(), 'assets')
}

export function resolveLibraryMediaAbsolute(relativePath: string): string | null {
  const rel = relativePath.replace(/^\/+/, '').replace(/\\/g, '/')
  const abs = join(getLibraryAssetsRoot(), rel)
  return existsSync(abs) ? abs : null
}

export function toLibraryMediaUrl(relativePath: string | null | undefined): string | null {
  const rel = relativePath?.trim()
  if (!rel) return null
  const normalized = rel.replace(/^\/+/, '').replace(/\\/g, '/')
  if (!resolveLibraryMediaAbsolute(normalized)) return null
  return `wanwu-media://${encodeURI(normalized)}`
}

export function coverRelativePath(categoryId: string, slug: string, filename = 'cover.jpg'): string {
  return `library/${categoryId}/${slug}/${filename}`
}

const COVER_FILENAMES = ['cover.jpg', 'cover.jpeg', 'cover.png', 'cover.webp']

function normalizeRel(path: string): string {
  return path.replace(/^\/+/, '').replace(/\\/g, '/')
}

function relPathCandidates(path: string): string[] {
  const n = normalizeRel(path)
  const out = [n]
  if (n && !n.startsWith('library/')) out.push(`library/${n}`)
  return [...new Set(out)]
}

export function slugDirCandidates(categoryId: string, slug: string): string[] {
  const s = slug.trim()
  const out = new Set<string>()
  out.add(s)
  if (s.startsWith(`${categoryId}-`)) out.add(s)
  else out.add(`${categoryId}-${s}`)
  return [...out]
}

function firstExistingCoverInDir(categoryId: string, dirName: string): string | null {
  for (const file of COVER_FILENAMES) {
    const rel = coverRelativePath(categoryId, dirName, file)
    if (resolveLibraryMediaAbsolute(rel)) return rel
  }
  const dirAbs = join(getLibraryAssetsRoot(), 'library', categoryId, dirName)
  if (!existsSync(dirAbs)) return null
  const file = readdirSync(dirAbs).find((f) => /^cover\.(jpe?g|png|webp)$/i.test(f))
  if (!file) return null
  const rel = `library/${categoryId}/${dirName}/${file}`
  return resolveLibraryMediaAbsolute(rel) ? rel : null
}

function discoverCoverRelative(categoryId: string, slug: string | null | undefined): string | null {
  if (!slug?.trim()) return null
  const libRoot = join(getLibraryAssetsRoot(), 'library', categoryId)
  if (!existsSync(libRoot)) return null

  for (const dirName of slugDirCandidates(categoryId, slug)) {
    const rel = firstExistingCoverInDir(categoryId, dirName)
    if (rel) return rel
  }

  const needle = slug.trim().toLowerCase()
  for (const ent of readdirSync(libRoot, { withFileTypes: true })) {
    if (!ent.isDirectory()) continue
    if (ent.name.toLowerCase() === needle || ent.name.toLowerCase().endsWith(needle)) {
      const rel = firstExistingCoverInDir(categoryId, ent.name)
      if (rel) return rel
    }
  }
  return null
}

/** 解析条目封面相对路径（DB 路径无效时按 slug / 目录扫描回退） */
export function resolveItemCoverRelative(params: {
  coverPath: string | null | undefined
  categoryId: string
  slug: string | null | undefined
}): string | null {
  const candidates: string[] = []
  if (params.coverPath) candidates.push(...relPathCandidates(params.coverPath))
  if (params.slug) {
    for (const dir of slugDirCandidates(params.categoryId, params.slug)) {
      for (const file of COVER_FILENAMES) {
        candidates.push(coverRelativePath(params.categoryId, dir, file))
      }
    }
  }

  const seen = new Set<string>()
  for (const rel of candidates) {
    if (!rel || seen.has(rel)) continue
    seen.add(rel)
    if (resolveLibraryMediaAbsolute(rel)) return rel
  }
  return discoverCoverRelative(params.categoryId, params.slug)
}

/** 解析图集等媒体相对路径 */
export function resolveMediaRelative(relativePath: string | null | undefined): string | null {
  if (!relativePath) return null
  for (const rel of relPathCandidates(relativePath)) {
    if (resolveLibraryMediaAbsolute(rel)) return rel
  }
  const rel = normalizeRel(relativePath)
  const m = rel.match(/^library\/([^/]+)\/([^/]+)\/(gallery-\d+\.(?:jpe?g|png|webp))$/i)
  if (!m) return null
  const alt = `library/${m[1]}/${m[2]}/${m[3]}`
  return resolveLibraryMediaAbsolute(alt) ? alt : null
}
