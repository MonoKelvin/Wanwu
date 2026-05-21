/**
 * 为大图查看器解析可加载 URL：本地库直链，远程图经主进程临时缓存。
 */
export async function resolveImageViewerUrl(
  raw: string
): Promise<{ url: string; revoke?: () => void }> {
  const trimmed = raw.trim()
  if (!trimmed) throw new Error('empty')

  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return { url: trimmed }
  }

  if (/^wanwu-media:\/\//i.test(trimmed)) {
    try {
      const res = await fetch(trimmed)
      if (res.ok) {
        const blob = await res.blob()
        const blobUrl = URL.createObjectURL(blob)
        return { url: blobUrl, revoke: () => URL.revokeObjectURL(blobUrl) }
      }
    } catch {
      /* 回退主进程 file:// */
    }
  }

  const cached = await window.wanwu.shell.cacheImageForViewer(trimmed)
  if (!cached.ok || !cached.displayUrl) {
    throw new Error(cached.error ?? 'cache_failed')
  }

  return {
    url: cached.displayUrl,
    revoke:
      cached.cacheId != null
        ? () => window.wanwu.shell.releaseViewerImageCache(cached.cacheId!)
        : undefined
  }
}
