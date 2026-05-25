/** wanwu-media:// 协议路径解析（用户媒体 + 图鉴静态资源） */
import { existsSync } from 'fs'
import { join } from 'path'
import { resolveWanwuPath } from '../data/paths'
import { ILLUSTRATED_HANDBOOK_MEDIA_DIR } from '../library/paths'
import { resolveLibraryMediaAbsolute } from '../media/library'

function normalizeRel(path: string): string {
  return path.replace(/^\/+/, '').replace(/\\/g, '/').split(/[?#]/)[0]
}

/** 解析 wanwu-media:// 相对路径为绝对路径 */
export function resolveWanwuMediaAbsolute(relativePath: string): string | null {
  const rel = normalizeRel(relativePath)
  if (!rel) return null

  if (rel.startsWith(`${ILLUSTRATED_HANDBOOK_MEDIA_DIR}/`)) {
    return resolveLibraryMediaAbsolute(rel)
  }

  const wanwuRoot = resolveWanwuPath()

  if (rel.startsWith('user/')) {
    const underMedia = join(wanwuRoot, 'media', rel)
    if (existsSync(underMedia)) return underMedia
  }

  const direct = join(wanwuRoot, rel)
  if (existsSync(direct)) return direct

  const underMedia = join(wanwuRoot, 'media', rel)
  if (existsSync(underMedia)) return underMedia

  return resolveLibraryMediaAbsolute(rel)
}

export function toWanwuMediaUrl(relativePath: string | null | undefined): string | null {
  const rel = relativePath?.trim()
  if (!rel) return null
  const normalized = normalizeRel(rel)
  if (!resolveWanwuMediaAbsolute(normalized)) return null
  return `wanwu-media://${encodeURI(normalized)}`
}
