import { existsSync, readdirSync } from 'fs'
import { join } from 'path'
import { getWanwuResourcesDirectory } from '../data/paths'
import {
  getIllustratedHandbookBundledMediaRoot,
  ILLUSTRATED_HANDBOOK_MEDIA_DIR
} from '../library/paths'

/** 图鉴配图根目录（用户数据 resources） */
export function getLibraryAssetsRoot(): string {
  return getWanwuResourcesDirectory()
}

function normalizeRel(path: string): string {
  return path.replace(/^\/+/, '').replace(/\\/g, '/')
}

/** 去掉 illustrated-handbook/ 前缀，得到 resources 下的相对路径 */
export function handbookMediaInnerPath(relativePath: string): string {
  const n = normalizeRel(relativePath)
  const prefix = `${ILLUSTRATED_HANDBOOK_MEDIA_DIR}/`
  if (n.startsWith(prefix)) return n.slice(prefix.length)
  return n
}

function resolveUnderRoot(root: string, relativePath: string): string | null {
  const rel = relativePath.replace(/^\/+/, '').replace(/\\/g, '/')
  const abs = join(root, rel)
  return existsSync(abs) ? abs : null
}

export function resolveLibraryMediaAbsolute(relativePath: string): string | null {
  const inner = handbookMediaInnerPath(relativePath)
  if (!inner) return null

  const user = resolveUnderRoot(
    getWanwuResourcesDirectory(),
    `${ILLUSTRATED_HANDBOOK_MEDIA_DIR}/${inner}`
  )
  if (user) return user

  return resolveUnderRoot(getIllustratedHandbookBundledMediaRoot(), inner)
}

export function toLibraryMediaUrl(relativePath: string | null | undefined): string | null {
  const rel = relativePath?.trim()
  if (!rel) return null
  const normalized = normalizeRel(rel)
  const urlPath = normalized.startsWith(`${ILLUSTRATED_HANDBOOK_MEDIA_DIR}/`)
    ? normalized
    : `${ILLUSTRATED_HANDBOOK_MEDIA_DIR}/${normalized}`
  if (!resolveLibraryMediaAbsolute(urlPath)) return null
  return `wanwu-media://${encodeURI(urlPath)}`
}

export function coverRelativePath(categoryId: string, slug: string, filename = 'cover.jpg'): string {
  return `${ILLUSTRATED_HANDBOOK_MEDIA_DIR}/${categoryId}/${slug}/${filename}`
}

const COVER_FILENAMES = ['cover.jpg', 'cover.jpeg', 'cover.png', 'cover.webp']

function relPathCandidates(path: string): string[] {
  const n = normalizeRel(path)
  if (!n) return []
  const out = new Set<string>([n])
  if (!n.startsWith(`${ILLUSTRATED_HANDBOOK_MEDIA_DIR}/`)) {
    out.add(`${ILLUSTRATED_HANDBOOK_MEDIA_DIR}/${n}`)
  }
  return [...out]
}

export function slugDirCandidates(categoryId: string, slug: string): string[] {
  const s = slug.trim()
  const out = new Set<string>()
  out.add(s)
  if (s.startsWith(`${categoryId}-`)) out.add(s)
  else out.add(`${categoryId}-${s}`)
  return [...out]
}

function libraryRootCandidates(categoryId: string): string[] {
  const roots: string[] = []
  const userCat = join(
    getWanwuResourcesDirectory(),
    ILLUSTRATED_HANDBOOK_MEDIA_DIR,
    categoryId
  )
  if (existsSync(userCat)) roots.push(userCat)
  const bundledCat = join(getIllustratedHandbookBundledMediaRoot(), categoryId)
  if (existsSync(bundledCat)) roots.push(bundledCat)
  return roots
}

function firstExistingCoverInDir(categoryId: string, dirName: string): string | null {
  for (const file of COVER_FILENAMES) {
    const rel = coverRelativePath(categoryId, dirName, file)
    if (resolveLibraryMediaAbsolute(rel)) return rel
  }
  for (const libRoot of libraryRootCandidates(categoryId)) {
    const dirAbs = join(libRoot, dirName)
    if (!existsSync(dirAbs)) continue
    const file = readdirSync(dirAbs).find((f) => /^cover\.(jpe?g|png|webp)$/i.test(f))
    if (!file) continue
    const rel = coverRelativePath(categoryId, dirName, file)
    if (resolveLibraryMediaAbsolute(rel)) return rel
  }
  return null
}

function discoverCoverRelative(categoryId: string, slug: string | null | undefined): string | null {
  if (!slug?.trim()) return null

  for (const dirName of slugDirCandidates(categoryId, slug)) {
    const rel = firstExistingCoverInDir(categoryId, dirName)
    if (rel) return rel
  }

  const needle = slug.trim().toLowerCase()
  for (const libRoot of libraryRootCandidates(categoryId)) {
    if (!existsSync(libRoot)) continue
    for (const ent of readdirSync(libRoot, { withFileTypes: true })) {
      if (!ent.isDirectory()) continue
      if (ent.name.toLowerCase() === needle || ent.name.toLowerCase().endsWith(needle)) {
        const rel = firstExistingCoverInDir(categoryId, ent.name)
        if (rel) return rel
      }
    }
  }
  return null
}

/** 解析条目封面相对路径（DB 路径无效时按 slug / 目录扫描回退） */
export function resolveItemCoverRelative(params: {
  coverPath: string | null | undefined
  categoryId: string
  slug: string | null | undefined
  allowDiscover?: boolean
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
  if (params.allowDiscover === false) return null
  return discoverCoverRelative(params.categoryId, params.slug)
}

/** 解析图集等媒体相对路径 */
export function resolveMediaRelative(relativePath: string | null | undefined): string | null {
  if (!relativePath) return null
  for (const rel of relPathCandidates(relativePath)) {
    if (resolveLibraryMediaAbsolute(rel)) return rel
  }
  const rel = normalizeRel(relativePath)
  const m = rel.match(
    new RegExp(
      `^${ILLUSTRATED_HANDBOOK_MEDIA_DIR}/([^/]+)/([^/]+)/(gallery-\\d+\\.(?:jpe?g|png|webp))$`,
      'i'
    )
  )
  if (!m) return null
  const alt = `${ILLUSTRATED_HANDBOOK_MEDIA_DIR}/${m[1]}/${m[2]}/${m[3]}`
  return resolveLibraryMediaAbsolute(alt) ? alt : null
}
