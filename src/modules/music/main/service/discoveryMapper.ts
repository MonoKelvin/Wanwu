import type {
  MusicChartCard,
  MusicChartsPayload,
  MusicChartSection,
  MusicMoodCategory,
  MusicMoodPlaylist,
  MusicSearchResult,
  MusicTrendingPayload,
  NormalizedTrack
} from '@modules/music/domain/types'
import { localizeMoodTitle } from './moodLabels'
import { pickCoverUrl, upgradeCoverUrl } from '@shared/utils/musicCoverUrl'

function trackKey(provider: string, videoId: string): string {
  return `${provider}:${videoId}`
}

function extractYoutubeVideoId(id: unknown): string {
  if (typeof id !== 'string') return ''
  const s = id.trim()
  if (/^[a-zA-Z0-9_-]{11}$/.test(s)) return s
  return ''
}

export function mapVeromeTrack(
  raw: Record<string, unknown>,
  provider: NormalizedTrack['provider'] = 'verome'
): NormalizedTrack | null {
  const videoId =
    (raw.videoId as string) ||
    (raw.video_id as string) ||
    (raw.playbackId as string) ||
    (raw.playback_id as string) ||
    extractYoutubeVideoId(raw.id)
  const title =
    (raw.name as string) ||
    (raw.title as string) ||
    ''
  if (!videoId || !title) return null
  const artists = raw.artists as Array<{ name?: string }> | undefined
  const artist =
    (raw.artist as string) ||
    artists?.map((a) => a.name).filter(Boolean).join(', ') ||
    'Unknown'
  const thumbs = raw.thumbnails as Array<{ url?: string; width?: number; height?: number }> | undefined
  const thumbnail = raw.thumbnail as string | { url?: string } | undefined
  let coverUrl =
    pickCoverUrl({ thumbnail, thumbnails: thumbs }, 'card') ??
    (typeof thumbnail === 'string' ? upgradeCoverUrl(thumbnail, 'card') : undefined)

  if (!coverUrl && /^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    coverUrl = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
  }

  let durationSec: number | undefined
  const dur = raw.duration
  if (typeof dur === 'number') durationSec = dur
  else if (typeof dur === 'string' && dur.includes(':')) {
    const parts = dur.split(':').map((p) => parseInt(p, 10) || 0)
    if (parts.length === 2) durationSec = parts[0] * 60 + parts[1]
    else if (parts.length === 3) durationSec = parts[0] * 3600 + parts[1] * 60 + parts[2]
  }

  return {
    trackKey: trackKey(provider, videoId),
    provider,
    videoId,
    title,
    artist,
    album: raw.album as string | undefined,
    durationSec,
    coverUrl,
    browseId: raw.browseId as string | undefined
  }
}

export function mapTrendingResponse(data: unknown, country: string): MusicTrendingPayload {
  const obj = data as { tracks?: unknown[]; country?: string }
  const tracks: NormalizedTrack[] = []
  for (const t of obj.tracks ?? []) {
    const mapped = mapVeromeTrack(t as Record<string, unknown>)
    if (mapped) tracks.push(mapped)
  }
  return { country: obj.country ?? country, tracks }
}

function mapMoodItem(row: Record<string, unknown>): MusicMoodCategory | null {
  const title = String(row.title ?? row.name ?? '').trim()
  if (!title) return null
  const thumbs = row.thumbnails as Array<{ url?: string }> | undefined
  return {
    id: title,
    title: localizeMoodTitle(title),
    browseId: row.browseId ? String(row.browseId) : undefined,
    color: typeof row.color === 'number' ? row.color : undefined,
    coverUrl: pickCoverUrl({ thumbnails: thumbs }, 'card')
  }
}

export function mapMoodsResponse(data: unknown): MusicMoodCategory[] {
  const seen = new Set<string>()
  const out: MusicMoodCategory[] = []

  const push = (item: MusicMoodCategory | null) => {
    if (!item || seen.has(item.id)) return
    seen.add(item.id)
    out.push(item)
  }

  if (Array.isArray(data)) {
    for (const entry of data) {
      const row = entry as Record<string, unknown>
      const nested = row.items as unknown[] | undefined
      if (nested?.length) {
        for (const child of nested) push(mapMoodItem(child as Record<string, unknown>))
      } else {
        push(mapMoodItem(row))
      }
    }
    return out
  }

  const moods = (data as { moods?: unknown[] })?.moods ?? []
  for (const m of moods) push(mapMoodItem(m as Record<string, unknown>))
  return out
}

export function mapMoodPlaylistsResponse(data: unknown): MusicMoodPlaylist[] {
  const list = Array.isArray(data) ? data : (data as { playlists?: unknown[] })?.playlists ?? []
  return list
    .map((p) => {
      const row = p as Record<string, unknown>
      const playlistId = String(row.playlistId ?? row.browseId ?? row.id ?? '')
      const title = String(row.title ?? row.name ?? '')
      if (!playlistId && !title) return null
      const thumbs = row.thumbnails as Array<{ url?: string }> | undefined
      return {
        playlistId: playlistId || title,
        title: title || playlistId,
        coverUrl: pickCoverUrl({ thumbnails: thumbs }, 'card')
      }
    })
    .filter((x): x is MusicMoodPlaylist => x !== null)
}

function mapChartItems(items: unknown[]): NormalizedTrack[] {
  const tracks: NormalizedTrack[] = []
  for (const item of items) {
    const mapped = mapVeromeTrack(item as Record<string, unknown>)
    if (mapped) tracks.push(mapped)
  }
  return tracks
}

function mapChartCards(items: unknown[]): MusicChartCard[] {
  const cards: MusicChartCard[] = []
  for (const item of items) {
    const row = item as Record<string, unknown>
    const browseId = String(row.browseId ?? row.playlistId ?? '')
    const title = String(row.title ?? row.name ?? '').trim()
    if (!browseId && !title) continue
    const thumbs = row.thumbnails as Array<{ url?: string }> | undefined
    cards.push({
      browseId: browseId || title,
      playlistId: row.playlistId ? String(row.playlistId) : browseId || undefined,
      title: title || browseId,
      subtitle: row.subtitle ? String(row.subtitle) : undefined,
      coverUrl: pickCoverUrl({ thumbnails: thumbs }, 'card') ?? thumbs?.[thumbs.length - 1]?.url
    })
  }
  return cards
}

function inferChartSectionKind(title: string): MusicChartSection['kind'] {
  const t = title.toLowerCase()
  if (t.includes('artist')) return 'artists'
  if (t.includes('video')) return 'videos'
  if (t.includes('genre') || t.includes('mood')) return 'genres'
  if (t.includes('song') || t.includes('track')) return 'songs'
  if (t.includes('trend')) return 'trending'
  return 'playlists'
}

function mapChartsArrayFormat(data: unknown[]): MusicChartsPayload {
  const sections: MusicChartSection[] = []
  for (const section of data) {
    const row = section as Record<string, unknown>
    const items = row.items as unknown[] | undefined
    if (!items?.length) continue
    const title = String(row.title ?? 'Charts')
    const kind = inferChartSectionKind(title)
    const first = items[0] as Record<string, unknown>
    const hasTracks = items.some(
      (i) => !!(i as Record<string, unknown>).videoId || !!(i as Record<string, unknown>).video_id
    )

    if (hasTracks) {
      sections.push({ kind, title, items: mapChartItems(items) })
    } else if (kind === 'artists') {
      sections.push({
        kind: 'artists',
        title,
        items: mapChartCards(items).map((c) => ({
          browseId: c.browseId,
          title: c.title,
          coverUrl: c.coverUrl
        }))
      })
    } else {
      sections.push({ kind: 'playlists', title, items: mapChartCards(items) })
    }
  }
  return { sections }
}

function mapChartsObjectFormat(charts: Record<string, unknown>): MusicChartsPayload {
  const sections: MusicChartSection[] = []

  const songs = charts.songs as { items?: unknown[]; title?: string } | undefined
  if (songs?.items?.length) {
    sections.push({
      kind: 'songs',
      title: String(songs.title ?? '热门歌曲'),
      items: mapChartItems(songs.items)
    })
  }

  const videos = charts.videos as { items?: unknown[]; title?: string } | undefined
  if (videos?.items?.length) {
    sections.push({
      kind: 'videos',
      title: String(videos.title ?? '热门视频'),
      items: mapChartItems(videos.items)
    })
  }

  const trending = charts.trending as { items?: unknown[]; title?: string } | undefined
  if (trending?.items?.length) {
    sections.push({
      kind: 'trending',
      title: String(trending.title ?? '趋势'),
      items: mapChartItems(trending.items)
    })
  }

  const artists = charts.artists as { items?: unknown[]; title?: string } | undefined
  if (artists?.items?.length) {
    sections.push({
      kind: 'artists',
      title: String(artists.title ?? '热门歌手'),
      items: (artists.items as Array<Record<string, unknown>>).map((a) => ({
        browseId: String(a.browseId ?? ''),
        title: String(a.title ?? a.name ?? ''),
        coverUrl: (a.thumbnails as Array<{ url?: string }> | undefined)?.[0]?.url
      }))
    })
  }

  const genres = charts.genres as Array<Record<string, unknown>> | undefined
  if (genres?.length) {
    sections.push({
      kind: 'genres',
      title: '分类歌单',
      items: genres.map((g) => ({
        browseId: String(g.browseId ?? ''),
        playlistId: String(g.playlistId ?? ''),
        title: String(g.title ?? ''),
        coverUrl: (g.thumbnails as Array<{ url?: string }> | undefined)?.[0]?.url
      }))
    })
  }

  return { sections }
}

export function mapChartsResponse(data: unknown): MusicChartsPayload {
  if (Array.isArray(data)) return mapChartsArrayFormat(data)
  return mapChartsObjectFormat((data as Record<string, unknown>) ?? {})
}

export function mapTopTracksResponse(data: unknown): NormalizedTrack[] {
  const list =
    (data as { tracks?: unknown[] })?.tracks ??
    (Array.isArray(data) ? data : [])
  return mapChartItems(list as unknown[])
}

export function mapSearchResponse(data: unknown): {
  tracks: NormalizedTrack[]
  albums: MusicSearchResult['albums']
  artists: MusicSearchResult['artists']
} {
  const obj = data as Record<string, unknown>
  const results = (obj.results ?? obj) as Record<string, unknown>
  const tracks: NormalizedTrack[] = []
  const songList = (results.songs ?? results.song ?? obj.songs) as unknown[] | undefined
  for (const s of songList ?? []) {
    const mapped = mapVeromeTrack(s as Record<string, unknown>)
    if (mapped) tracks.push(mapped)
  }

  const albums: MusicSearchResult['albums'] = []
  for (const a of (results.albums ?? []) as unknown[]) {
    const row = a as Record<string, unknown>
    const browseId = String(row.browseId ?? '')
    if (!browseId) continue
    albums.push({
      browseId,
      title: String(row.title ?? ''),
      artist:
        (row.artists as Array<{ name?: string }> | undefined)?.map((x) => x.name).join(', ') ?? '',
      coverUrl: upgradeCoverUrl(
        (row.thumbnails as Array<{ url?: string }> | undefined)?.[0]?.url,
        'card'
      )
    })
  }

  const artists: MusicSearchResult['artists'] = []
  for (const a of (results.artists ?? []) as unknown[]) {
    const row = a as Record<string, unknown>
    const browseId = String(row.browseId ?? '')
    if (!browseId) continue
    artists.push({
      browseId,
      name: String(row.title ?? row.name ?? ''),
      coverUrl: upgradeCoverUrl(
        (row.thumbnails as Array<{ url?: string }> | undefined)?.[0]?.url,
        'card'
      )
    })
  }

  return { tracks, albums, artists }
}

export function mapPlaylistTracks(data: unknown): NormalizedTrack[] {
  const tracks: NormalizedTrack[] = []
  const list =
    (data as { tracks?: unknown[] })?.tracks ??
    (data as { results?: unknown[] })?.results ??
    (Array.isArray(data) ? data : [])
  for (const t of list) {
    const mapped = mapVeromeTrack(t as Record<string, unknown>)
    if (mapped) tracks.push(mapped)
  }
  return tracks
}

export function mapArtistResponse(data: unknown): {
  name: string
  description?: string
  coverUrl?: string
  tracks: NormalizedTrack[]
  albums: Array<{ browseId: string; title: string; coverUrl?: string }>
} {
  const obj = (data as Record<string, unknown>) ?? {}
  const name = String(obj.title ?? obj.name ?? '歌手')
  const description = obj.description ? String(obj.description) : undefined
  const thumbs = obj.thumbnails as Array<{ url?: string }> | undefined
  const coverUrl = pickCoverUrl({ thumbnails: thumbs }, 'hero')

  const tracks = mapPlaylistTracks(obj.songs ?? obj.topSongs ?? obj.tracks ?? [])
  const albums: Array<{ browseId: string; title: string; coverUrl?: string }> = []
  const albumList = (obj.albums ?? obj.releases ?? []) as unknown[]
  for (const a of albumList) {
    const row = a as Record<string, unknown>
    const browseId = String(row.browseId ?? row.id ?? '')
    if (!browseId) continue
    albums.push({
      browseId,
      title: String(row.title ?? row.name ?? ''),
      coverUrl: upgradeCoverUrl(
        (row.thumbnails as Array<{ url?: string }> | undefined)?.[0]?.url,
        'card'
      )
    })
  }

  return { name, description, coverUrl, tracks, albums }
}
