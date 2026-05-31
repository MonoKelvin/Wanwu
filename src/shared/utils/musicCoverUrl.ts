export type CoverSize = 'thumb' | 'card' | 'hero'

const YT_SIZE: Record<CoverSize, string> = {
  thumb: 'w120-h120',
  card: 'w544-h544',
  hero: 'w544-h544'
}

/** 将已有 cover URL 按展示场景升级分辨率 */
export function upgradeCoverUrl(url: string | undefined, size: CoverSize = 'card'): string | undefined {
  if (!url?.trim()) return undefined
  let u = url.trim()

  if (u.startsWith('//')) {
    u = u.includes('kuwo.cn') || u.includes('kwcdn.kuwo.cn') ? `http:${u}` : `https:${u}`
  }
  if (u.startsWith('http://')) {
    if (!u.includes('kuwo.cn') && !u.includes('kwcdn.kuwo.cn')) {
      u = `https://${u.slice(7)}`
    }
  }

  if (u.includes('kuwo.cn') || u.includes('kwcdn.kuwo.cn')) {
    u = u
      .replace(/\/120\//, size === 'thumb' ? '/120/' : '/500/')
      .replace(/\/150\//, size === 'thumb' ? '/150/' : '/500/')
      .replace(/\/300\//, size === 'thumb' ? '/300/' : '/500/')
  }

  if (u.includes('i.scdn.co') || u.includes('mosaic.scdn.co')) {
    return u.replace(/(\d+)x(\d+)/, size === 'thumb' ? '120x120' : '640x640')
  }

  if (u.includes('mzstatic.com') || u.includes('itunes.apple.com')) {
    return u
      .replace(/\d+x\d+bb(\.jpg)?/i, size === 'thumb' ? '100x100bb.jpg' : '600x600bb.jpg')
      .replace(/100x100bb/, size === 'thumb' ? '100x100bb' : '600x600bb')
  }

  if (u.includes('audius.co') || u.includes('audius-content')) {
    return u
      .replace(/_150x150\./, size === 'thumb' ? '_150x150.' : '_480x480.')
      .replace(/_480x480\./, size === 'hero' ? '_1000x1000.' : '_480x480.')
  }

  if (u.includes('ytimg.com') || u.includes('googleusercontent.com') || u.includes('ggpht.com')) {
    if (/hqdefault|mqdefault|sddefault/.test(u)) return u
    const target = YT_SIZE[size]
    if (/=w\d+-h\d+/.test(u)) return u.replace(/=w\d+-h\d+(-[a-z0-9-]*)?/i, `=${target}$1`)
    if (/=s\d+/.test(u)) {
      const px = size === 'thumb' ? '120' : '544'
      return u.replace(/=s\d+(-[a-z0-9-]*)?/i, `=s${px}$1`)
    }
    if (/\/vi\/[a-zA-Z0-9_-]{11}\//.test(u)) return u
    const sep = u.includes('?') ? '&' : '?'
    return `${u}${sep}=${target}`
  }

  return u
}

/** 曲目封面：URL 缺失时用 YouTube / 酷我 CDN 兜底 */
export function resolveTrackCoverUrl(
  track: { coverUrl?: string; videoId?: string; provider?: string },
  size: CoverSize = 'card'
): string | undefined {
  const fromUrl = upgradeCoverUrl(track.coverUrl, size)
  if (fromUrl) return fromUrl
  const id = track.videoId?.trim()
  if (!id) return undefined

  if (/^[a-zA-Z0-9_-]{11}$/.test(id)) {
    return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
  }
  return undefined
}

/** 封面加载失败时的备选 URL（按顺序尝试） */
export function listTrackCoverFallbacks(
  track: { coverUrl?: string; videoId?: string; provider?: string; title?: string },
  size: CoverSize = 'card'
): string[] {
  const urls = new Set<string>()
  const push = (u?: string) => {
    const n = u ? upgradeCoverUrl(u, size) : undefined
    if (n) urls.add(n)
  }

  push(track.coverUrl)
  push(resolveTrackCoverUrl(track, size))

  const id = track.videoId?.trim()

  if (track.provider === 'kuwo' && track.coverUrl) {
    const upgraded = upgradeCoverUrl(track.coverUrl, size)
    if (upgraded?.includes('kuwo.cn')) {
      for (const host of ['img4.kuwo.cn', 'img1.kuwo.cn', 'img3.kuwo.cn', 'img2.kuwo.cn']) {
        push(upgraded.replace(/\/\/img\d\.kuwo\.cn/i, `//${host}`))
        if (upgraded.startsWith('https://')) {
          push(upgraded.replace(/^https:\/\//, 'http://'))
        }
      }
    }
  }

  if (id && /^[a-zA-Z0-9_-]{11}$/.test(id)) {
    push(`https://i.ytimg.com/vi/${id}/mqdefault.jpg`)
    push(`https://i.ytimg.com/vi/${id}/hqdefault.jpg`)
  }

  return [...urls]
}

type ThumbInput = {
  thumbnail?: string | { url?: string }
  thumbnails?: Array<{ url?: string; width?: number; height?: number }>
}

/** 从 Verome/YouTube 原始字段挑选最佳封面并升级 */
export function pickCoverUrl(raw: ThumbInput, size: CoverSize = 'card'): string | undefined {
  const thumbs = raw.thumbnails
  if (thumbs?.length) {
    let best = thumbs[0]!
    let bestArea = (best.width ?? 0) * (best.height ?? 0)
    for (const t of thumbs) {
      const area = (t.width ?? 0) * (t.height ?? 0)
      if (area > bestArea && t.url) {
        best = t
        bestArea = area
      }
    }
    if (best.url) return upgradeCoverUrl(best.url, size)
  }

  const thumbnail = raw.thumbnail
  if (typeof thumbnail === 'string') return upgradeCoverUrl(thumbnail, size)
  if (thumbnail && typeof thumbnail === 'object' && thumbnail.url) {
    return upgradeCoverUrl(thumbnail.url, size)
  }

  return undefined
}
