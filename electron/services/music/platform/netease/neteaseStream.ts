import type { MusicPlatformQuality, MusicStreamPick } from '../types'

type UrlRow = { url?: string; br?: number; freeTrialInfo?: unknown }

const QUALITY_BR: Record<MusicPlatformQuality, number> = {
  standard: 128000,
  higher: 192000,
  exhigh: 320000,
  lossless: 999000,
  hires: 999000,
  jyeffect: 999000,
  sky: 999000,
  dolby: 999000,
  jymaster: 999000
}

export function qualityToBitrate(quality: MusicPlatformQuality): number {
  return QUALITY_BR[quality] ?? 320000
}

export function normalizeNeteaseStreamUrl(url: string): string {
  return url
    .replace(/^http:/i, 'https:')
    .replace(/m804\.music\.126\.net/g, 'm801.music.126.net')
    .replace(/m704\.music\.126\.net/g, 'm701.music.126.net')
}

function inferFormat(url: string): MusicStreamPick['format'] {
  const lower = url.toLowerCase()
  if (lower.includes('.m4a') || lower.includes('.mp4')) return 'mp4'
  if (lower.includes('.mp3')) return 'mp3'
  if (lower.includes('.ogg')) return 'ogg'
  if (lower.includes('.webm')) return 'webm'
  return 'mp4'
}

export function pickStreamFromRows(rows: UrlRow[] | undefined): MusicStreamPick | null {
  const hit = rows?.find((row) => typeof row?.url === 'string' && row.url.trim())
  if (!hit?.url) return null
  const url = normalizeNeteaseStreamUrl(hit.url.trim())
  return {
    url,
    format: inferFormat(url),
    br: hit.br,
    isTrial: !!hit.freeTrialInfo
  }
}

export function pickStreamFromMatchBody(data: unknown): MusicStreamPick | null {
  if (typeof data === 'string' && data.startsWith('http')) {
    const url = normalizeNeteaseStreamUrl(data)
    return { url, format: inferFormat(url) }
  }
  if (data && typeof data === 'object') {
    const row = data as Record<string, unknown>
    const nested = row.data
    if (typeof nested === 'string' && nested.startsWith('http')) {
      const url = normalizeNeteaseStreamUrl(nested)
      return { url, format: inferFormat(url) }
    }
    if (nested && typeof nested === 'object') {
      const url = (nested as Record<string, unknown>).url
      if (typeof url === 'string' && url.startsWith('http')) {
        const normalized = normalizeNeteaseStreamUrl(url)
        return { url: normalized, format: inferFormat(normalized) }
      }
    }
  }
  return null
}
