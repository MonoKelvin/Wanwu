import { existsSync, readdirSync } from 'node:fs'
import { isAbsolute, join, normalize } from 'node:path'
import { tmpdir } from 'node:os'
import type { WanwuPathLayout } from '@shared/lib/wanwuPaths'
import { PIXEL_WPP_FILE_EXTENSION } from '@modules/library/pixel-art/domain/packagePaths'

export function pixelArtDbFile(layout: WanwuPathLayout): string {
  return join(layout.db, 'library_pixel_art.sqlite')
}

export function pixelArtMediaDir(layout: WanwuPathLayout): string {
  return join(layout.media, 'pixel-art')
}

export function sanitizePixelWppBaseName(title: string): string {
  const sanitized = title
    .replace(/\.wpp$/i, '')
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120)
  return sanitized || '未命名像素画'
}

export function pixelWppFileName(title: string): string {
  return `${sanitizePixelWppBaseName(title)}${PIXEL_WPP_FILE_EXTENSION}`
}

export function pixelContentDir(mediaDir: string, fileId: string): string {
  return join(mediaDir, fileId)
}

export function pixelWppPath(mediaDir: string, fileId: string, title: string): string {
  return join(pixelContentDir(mediaDir, fileId), pixelWppFileName(title))
}

export function findPixelWppPath(mediaDir: string, fileId: string): string | null {
  const dir = pixelContentDir(mediaDir, fileId)
  if (!existsSync(dir)) return null
  for (const name of readdirSync(dir)) {
    if (name.toLowerCase().endsWith(PIXEL_WPP_FILE_EXTENSION)) {
      return join(dir, name)
    }
  }
  return null
}

export function pixelWorkDir(fileId: string): string {
  return join(tmpdir(), 'wanwu-pixel-work', fileId)
}

export function relativePixelWppPath(fileId: string, title: string): string {
  return `${fileId}/${pixelWppFileName(title)}`
}

export function isExternalPixelContentPath(contentPath: string): boolean {
  return isAbsolute(contentPath.trim())
}

export function resolveStoredPixelWppPath(mediaDir: string, contentPath: string): string {
  const trimmed = contentPath.trim()
  if (isAbsolute(trimmed)) return normalize(trimmed)
  return normalize(join(mediaDir, trimmed))
}
