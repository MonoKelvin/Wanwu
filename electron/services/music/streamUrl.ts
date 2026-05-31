/** 从 Verome / 第三方 stream 响应中提取可播放 URL 与格式 */
export type AudioStreamFormat = 'mp4' | 'webm' | 'mp3' | 'ogg'

export interface PickedStream {
  url: string
  format: AudioStreamFormat
  mimeType?: string
}

const YOUTUBE_AUDIO_ITAGS = new Set([
  139, 140, 141, 171, 249, 250, 251, 256, 258, 325, 326, 328, 338
])

function isHttpUrl(value: unknown): value is string {
  return typeof value === 'string' && /^https?:\/\//i.test(value.trim())
}

function mimeToFormat(mime: string | undefined): AudioStreamFormat | undefined {
  if (!mime) return undefined
  const m = mime.toLowerCase()
  if (m.includes('audio/mp4') || m.includes('audio/m4a') || m.includes('mp4a')) return 'mp4'
  if (m.includes('audio/mpeg') || m.includes('audio/mp3')) return 'mp3'
  if (m.includes('audio/webm') || m.includes('opus')) return 'webm'
  if (m.includes('audio/ogg')) return 'ogg'
  if (m.startsWith('video/')) return undefined
  return undefined
}

function formatScore(format: AudioStreamFormat): number {
  switch (format) {
    case 'mp4':
      return 100
    case 'mp3':
      return 90
    case 'webm':
      return 70
    case 'ogg':
      return 60
    default:
      return 0
  }
}

function formatFromUrl(url: string): AudioStreamFormat | undefined {
  const path = url.split('?')[0]?.toLowerCase() ?? ''
  if (/\.mp3$/.test(path)) return 'mp3'
  if (/\.m4a$/.test(path) || /\.mp4$/.test(path)) return 'mp4'
  if (/\.webm$/.test(path)) return 'webm'
  if (/\.ogg$/.test(path)) return 'ogg'
  return undefined
}

function collectStreamCandidates(data: unknown, depth = 0, out: PickedStream[] = []): PickedStream[] {
  if (depth > 6 || data == null) return out

  if (typeof data === 'string') {
    if (isHttpUrl(data)) {
      const url = data.trim()
      out.push({ url, format: formatFromUrl(url) ?? 'mp4' })
    }
    return out
  }

  if (Array.isArray(data)) {
    for (const item of data) collectStreamCandidates(item, depth + 1, out)
    return out
  }

  if (typeof data !== 'object') return out

  const row = data as Record<string, unknown>
  const url =
    (isHttpUrl(row.url) && row.url.trim()) ||
    (isHttpUrl(row.streamUrl) && row.streamUrl.trim()) ||
    (isHttpUrl(row.playbackUrl) && row.playbackUrl.trim()) ||
    (isHttpUrl(row.audioUrl) && row.audioUrl.trim()) ||
    (isHttpUrl(row.link) && row.link.trim()) ||
    undefined

  const mimeType =
    (typeof row.mimeType === 'string' && row.mimeType) ||
    (typeof row.type === 'string' && row.type) ||
    undefined

  const itag = typeof row.itag === 'number' ? row.itag : undefined

  if (url) {
    const fromMime = mimeToFormat(mimeType)
    const fromItag = itag && YOUTUBE_AUDIO_ITAGS.has(itag) ? ('mp4' as const) : undefined
    const fromUrl = formatFromUrl(url)
    const isVideoMime = mimeType?.toLowerCase().startsWith('video/')

    if (!isVideoMime) {
      out.push({
        url,
        format: fromMime ?? fromItag ?? fromUrl ?? 'mp4',
        mimeType
      })
    }
  }

  for (const key of [
    'urls',
    'formats',
    'adaptiveFormats',
    'streamingUrls',
    'stream',
    'data',
    'result',
    'playback',
    'playerResponse',
    'best',
    'high',
    'medium',
    'low',
    'audio',
    'audioUrl'
  ] as const) {
    if (key in row) collectStreamCandidates(row[key], depth + 1, out)
  }

  return out
}

export function pickBestAudioStream(data: unknown): PickedStream | undefined {
  const candidates = collectStreamCandidates(data)
  if (!candidates.length) return undefined

  const ranked = [...candidates].sort((a, b) => formatScore(b.format) - formatScore(a.format))
  return ranked[0]
}

/** @deprecated prefer pickBestAudioStream */
export function pickStreamUrl(data: unknown, depth = 0): string | undefined {
  void depth
  return pickBestAudioStream(data)?.url
}

export function extensionForFormat(format: AudioStreamFormat): string {
  switch (format) {
    case 'mp4':
      return 'm4a'
    case 'webm':
      return 'webm'
    case 'mp3':
      return 'mp3'
    case 'ogg':
      return 'ogg'
  }
}

export function inferFormatsFromUrl(url: string): AudioStreamFormat[] {
  const fromPath = formatFromUrl(url)
  if (fromPath) return [fromPath]
  if (url.includes('/api/proxy')) return ['mp4', 'webm']
  if (/^wanwu-media:\/\//i.test(url)) return ['mp4', 'mp3', 'webm']
  return ['mp4', 'webm', 'mp3']
}
