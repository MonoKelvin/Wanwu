import { app } from 'electron'
import { existsSync } from 'fs'
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
  return `wanwu-media://${encodeURI(normalized)}`
}

export function coverRelativePath(categoryId: string, slug: string, filename = 'cover.jpg'): string {
  return `library/${categoryId}/${slug}/${filename}`
}
