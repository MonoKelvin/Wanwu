/** wanwu-media:// 协议路径解析（通用路径 + 模块注册的解析器） */
import { existsSync } from 'fs'
import { join } from 'path'
import { getBundledAssetsRoot } from '../core/assetsRoot'
import { getWanwuPathLayout } from '../data/paths'
import {
  resolveMediaPathAsync,
  resolveMediaPathSync,
  shouldAllowMediaUrlWithoutFile
} from '../../app/mediaResolverBridge'

function normalizeRel(path: string): string {
  return path.replace(/^\/+/, '').replace(/\\/g, '/').split(/[?#]/)[0]
}

/** 解析 wanwu-media:// 相对路径为绝对路径（同步：仅已落盘的松散文件） */
export function resolveWanwuMediaAbsolute(relativePath: string): string | null {
  const rel = normalizeRel(relativePath)
  if (!rel) return null

  if (rel.startsWith('seed/')) {
    const bundled = join(getBundledAssetsRoot(), rel)
    if (existsSync(bundled)) return bundled
  }

  const layout = getWanwuPathLayout()

  if (rel.startsWith('user/')) {
    const underMedia = join(layout.media, rel)
    if (existsSync(underMedia)) return underMedia
  }

  const fromRegistry = resolveMediaPathSync(rel, layout)
  if (fromRegistry) return fromRegistry

  const direct = join(layout.root, rel)
  if (existsSync(direct)) return direct

  const underMedia = join(layout.media, rel)
  if (existsSync(underMedia)) return underMedia

  return null
}

export function toWanwuMediaUrl(relativePath: string | null | undefined): string | null {
  const rel = relativePath?.trim()
  if (!rel) return null
  const normalized = normalizeRel(rel)
  if (shouldAllowMediaUrlWithoutFile(normalized)) {
    return `wanwu-media://${encodeURI(normalized)}`
  }
  if (!resolveWanwuMediaAbsolute(normalized)) return null
  return `wanwu-media://${encodeURI(normalized)}`
}

/** 异步解析（含从 .wfg 解压资源到缓存等） */
export async function resolveWanwuMediaAbsoluteAsync(
  relativePath: string
): Promise<string | null> {
  const sync = resolveWanwuMediaAbsolute(relativePath)
  if (sync) return sync
  const rel = normalizeRel(relativePath)
  if (!rel) return null
  return resolveMediaPathAsync(rel, getWanwuPathLayout())
}
