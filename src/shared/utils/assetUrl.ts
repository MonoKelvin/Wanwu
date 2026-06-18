import { toWanwuMediaUrl } from './profileMedia'

/**
 * 捆绑资源 URL（相对 assets/ 根目录）。
 * 使用 Electron `wanwu-media://` 协议，避免 Vite dev 下 `/assets` 返回 index.html 导致 HDR/模型加载失败。
 */
export function assetUrl(path: string): string {
  const normalized = path.replace(/\\/g, '/').replace(/^\//, '')
  const url = toWanwuMediaUrl(normalized)
  if (!url) {
    throw new Error(`无效资源路径: ${path}`)
  }
  return url
}
