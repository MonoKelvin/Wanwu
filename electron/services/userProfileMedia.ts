import { copyFileSync, existsSync, mkdirSync, unlinkSync } from 'fs'
import { extname, join } from 'path'
import { randomUUID } from 'crypto'
import type { MediaService } from './mediaService'

const ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif'])

export type ProfileMediaKind = 'avatar' | 'background'

function profileDir(media: MediaService, kind: ProfileMediaKind): string {
  const dir = join(media.resolvePath('media'), 'user', 'profile')
  mkdirSync(dir, { recursive: true })
  return dir
}

/** 返回存库的相对路径，如 user/profile/avatar.jpg */
export function importProfileImage(
  media: MediaService,
  kind: ProfileMediaKind,
  sourceFilePath: string
): string {
  const ext = extname(sourceFilePath).toLowerCase()
  if (!ALLOWED_EXT.has(ext)) {
    throw new Error('仅支持 JPG、PNG、WebP、GIF 图片')
  }

  const dir = profileDir(media, kind)
  const filename = kind === 'avatar' ? `avatar${ext}` : `background-${randomUUID().slice(0, 8)}${ext}`
  const abs = join(dir, filename)
  copyFileSync(sourceFilePath, abs)

  return `user/profile/${filename}`
}

export function removeProfileFile(media: MediaService, relativePath: string | null | undefined): void {
  if (!relativePath?.trim()) return
  const abs = join(media.resolvePath('media'), relativePath.replace(/^\/+/, ''))
  if (existsSync(abs)) {
    try {
      unlinkSync(abs)
    } catch {
      /* ignore */
    }
  }
}
