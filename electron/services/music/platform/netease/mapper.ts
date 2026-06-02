import type {
  MusicChartCard,
  MusicChartsPayload,
  MusicMoodCategory,
  MusicMoodPlaylist,
  MusicSearchResult,
  MusicSongComment,
  MusicTrackBadge,
  NormalizedTrack
} from '../../../../../src/shared/types/music'
import { upgradeCoverUrl } from '../../../../../src/shared/utils/musicCoverUrl'
import type { MusicPlaylistSummary, MusicToplistSummary } from './types'
import { MusicSearchType } from '../types'

const provider = 'netease' as const

function trackKey(songId: string | number): string {
  return `${provider}:${songId}`
}

function pickCover(item: Record<string, unknown>): string | undefined {
  const pic = item.picUrl ?? item.coverImgUrl ?? item.img1v1Url
  if (typeof pic === 'string' && pic) return upgradeCoverUrl(pic.replace('http://', 'https://'), 'card')
  const al = (item.al ?? item.album) as Record<string, unknown> | undefined
  if (al?.picUrl && typeof al.picUrl === 'string') {
    return upgradeCoverUrl(al.picUrl.replace('http://', 'https://'), 'card')
  }
  if (al?.blurPicUrl && typeof al.blurPicUrl === 'string') {
    return upgradeCoverUrl(al.blurPicUrl.replace('http://', 'https://'), 'card')
  }
  return undefined
}

function mapSongBadges(raw: Record<string, unknown>): MusicTrackBadge[] {
  const badges: MusicTrackBadge[] = []
  const priv = raw.privilege as Record<string, unknown> | undefined
  const fee =
    typeof priv?.fee === 'number'
      ? priv.fee
      : typeof raw.fee === 'number'
        ? raw.fee
        : 0

  if (fee === 1 || fee === 8) badges.push('vip')
  if (fee === 4) badges.push('paid')

  const maxBr =
    typeof priv?.maxbr === 'number'
      ? priv.maxbr
      : typeof priv?.maxBr === 'number'
        ? priv.maxBr
        : undefined

  if (raw.hr || maxBr != null && maxBr >= 4_000_000) badges.push('hires')
  else if (raw.sq || maxBr != null && maxBr >= 1_000_000) badges.push('lossless')

  return badges
}

function mapArtistName(item: Record<string, unknown>): string {
  const ar = item.ar as Array<{ name?: string }> | undefined
  if (ar?.length) return ar.map((a) => a.name).filter(Boolean).join(', ')
  const artists = item.artists as Array<{ name?: string }> | undefined
  if (artists?.length) return artists.map((a) => a.name).filter(Boolean).join(', ')
  return typeof item.artistName === 'string' ? item.artistName : 'Unknown'
}

export function mapNeteaseSong(raw: Record<string, unknown>): NormalizedTrack | null {
  const id = raw.id ?? raw.songId
  if (id == null) return null
  const songId = String(id)
  const title = String(raw.name ?? raw.title ?? '').trim()
  if (!title) return null
  const al = (raw.al ?? raw.album) as Record<string, unknown> | undefined
  const durationMs =
    typeof raw.dt === 'number' ? raw.dt : typeof raw.duration === 'number' ? raw.duration : undefined
  const badges = mapSongBadges(raw)
  return {
    trackKey: trackKey(songId),
    provider,
    videoId: songId,
    title,
    artist: mapArtistName(raw),
    album: al?.name ? String(al.name) : undefined,
    durationSec: durationMs != null ? Math.round(durationMs / 1000) : undefined,
    coverUrl: pickCover(raw),
    browseId: al?.id != null ? `netease:album:${al.id}` : undefined,
    badges: badges.length ? badges : undefined
  }
}

export function pickNeteaseAlbumArtist(row: Record<string, unknown>): string {
  const artist = row.artist
  if (typeof artist === 'string' && artist.trim()) return artist.trim()
  if (artist && typeof artist === 'object' && !Array.isArray(artist)) {
    const name = (artist as { name?: string }).name
    if (typeof name === 'string' && name.trim()) return name.trim()
  }
  if (Array.isArray(row.artists)) {
    const names = row.artists
      .map((a) => (a && typeof a === 'object' ? String((a as { name?: string }).name ?? '').trim() : ''))
      .filter(Boolean)
    if (names.length) return names.join(', ')
  }
  return typeof row.artistName === 'string' ? row.artistName : ''
}

export function mapNeteaseSongs(list: unknown[]): NormalizedTrack[] {
  const out: NormalizedTrack[] = []
  for (const item of list) {
    const mapped = mapNeteaseSong(item as Record<string, unknown>)
    if (mapped) out.push(mapped)
  }
  return out
}

export function mapCloudSearchResult(data: unknown, type: MusicSearchType): MusicSearchResult {
  const body = data as {
    result?: {
      songs?: unknown[]
      albums?: unknown[]
      artists?: unknown[]
      playlists?: unknown[]
    }
  }
  const result = body.result ?? {}
  const mapped: MusicSearchResult = { tracks: [], albums: [], artists: [] }

  if (type === MusicSearchType.Song || type === MusicSearchType.All) {
    mapped.tracks = mapNeteaseSongs(result.songs ?? [])
  }
  if (type === MusicSearchType.Album || type === MusicSearchType.All) {
    for (const a of result.albums ?? []) {
      const row = a as Record<string, unknown>
      if (row.id == null) continue
      mapped.albums.push({
        browseId: `netease:album:${row.id}`,
        title: String(row.name ?? ''),
        artist: mapArtistName(row),
        coverUrl: pickCover(row)
      })
    }
  }
  if (type === MusicSearchType.Artist || type === MusicSearchType.All) {
    for (const a of result.artists ?? []) {
      const row = a as Record<string, unknown>
      if (row.id == null) continue
      mapped.artists.push({
        browseId: `netease:artist:${row.id}`,
        name: String(row.name ?? ''),
        coverUrl: pickCover(row)
      })
    }
  }
  if (type === MusicSearchType.Playlist || type === MusicSearchType.All) {
    mapped.playlists = []
    for (const p of result.playlists ?? []) {
      const row = p as Record<string, unknown>
      if (row.id == null) continue
      mapped.playlists.push({
        playlistId: String(row.id),
        title: String(row.name ?? ''),
        coverUrl: pickCover(row),
        trackCount: typeof row.trackCount === 'number' ? row.trackCount : undefined
      })
    }
  }
  return mapped
}

export function mapPlaylistSummary(raw: Record<string, unknown>): MusicPlaylistSummary | null {
  if (raw.id == null) return null
  return {
    id: String(raw.id),
    title: String(raw.name ?? ''),
    coverUrl: pickCover(raw),
    trackCount: typeof raw.trackCount === 'number' ? raw.trackCount : undefined,
    creatorName:
      typeof raw.creator === 'object' && raw.creator
        ? String((raw.creator as { nickname?: string }).nickname ?? '')
        : undefined
  }
}

export function mapToplistSummary(raw: Record<string, unknown>): MusicToplistSummary | null {
  if (raw.id == null) return null
  return {
    id: String(raw.id),
    title: String(raw.name ?? ''),
    coverUrl: pickCover(raw),
    updateFrequency: typeof raw.updateFrequency === 'string' ? raw.updateFrequency : undefined
  }
}

export function mapMoodPlaylist(raw: Record<string, unknown>): MusicMoodPlaylist | null {
  if (raw.id == null) return null
  return {
    playlistId: String(raw.id),
    title: String(raw.name ?? ''),
    coverUrl: pickCover(raw)
  }
}

export function mapPlaylistCatlist(data: unknown): MusicMoodCategory[] {
  const body = data as { sub?: Array<{ name?: string }>; categories?: Array<{ name?: string }> }
  const list = body.sub ?? body.categories ?? []
  return list
    .map((c) => {
      const name = String(c.name ?? '').trim()
      if (!name) return null
      return { id: name, title: name }
    })
    .filter(Boolean) as MusicMoodCategory[]
}

export function mapToplistChartCards(data: unknown): MusicChartCard[] {
  const body = data as { list?: unknown[] }
  const cards: MusicChartCard[] = []
  for (const item of body.list ?? []) {
    const row = item as Record<string, unknown>
    if (row.id == null) continue
    cards.push({
      browseId: `netease:toplist:${row.id}`,
      playlistId: String(row.id),
      title: String(row.title ?? row.name ?? ''),
      subtitle: typeof row.updateFrequency === 'string' ? row.updateFrequency : undefined,
      coverUrl: pickCover(row)
    })
  }
  return cards
}

export function mapNeteaseSongComment(
  row: Record<string, unknown>,
  idx: number,
  isHot = false
): MusicSongComment {
  const user = row.user as Record<string, unknown> | undefined
  const beReplied = Array.isArray(row.beReplied) ? row.beReplied : []
  const replies: MusicSongComment[] = []

  for (let ri = 0; ri < beReplied.length; ri++) {
    const replyRow = beReplied[ri] as Record<string, unknown>
    const content = String(replyRow.content ?? '').trim()
    if (!content) continue
    const ru = replyRow.user as Record<string, unknown> | undefined
    replies.push({
      id: String(replyRow.commentId ?? replyRow.id ?? `${idx}-r-${ri}`),
      userName: String(ru?.nickname ?? '匿名'),
      content,
      likedCount: typeof replyRow.likedCount === 'number' ? replyRow.likedCount : undefined
    })
  }

  return {
    id: String(row.commentId ?? row.id ?? idx),
    userName: String(user?.nickname ?? '匿名'),
    content: String(row.content ?? ''),
    likedCount: typeof row.likedCount === 'number' ? row.likedCount : undefined,
    time: typeof row.timeStr === 'string' ? row.timeStr : undefined,
    avatarUrl: typeof user?.avatarUrl === 'string' ? user.avatarUrl : undefined,
    isHot: isHot || undefined,
    replies: replies.length ? replies : undefined
  }
}

export function parseBrowseId(browseId: string): { kind: string; id: string } | null {
  const m = browseId.match(/^netease:([^:]+):(.+)$/)
  if (!m) return null
  return { kind: m[1]!, id: m[2]! }
}

export function buildChartsPayload(toplists: MusicToplistSummary[], tracks: NormalizedTrack[]): MusicChartsPayload {
  return {
    country: 'CN',
    sections: [
      {
        kind: 'playlists',
        title: '官方榜',
        items: toplists.map((t) => ({
          browseId: `netease:toplist:${t.id}`,
          playlistId: t.id,
          title: t.title,
          coverUrl: t.coverUrl
        }))
      },
      {
        kind: 'songs',
        title: '榜单热歌',
        items: tracks
      }
    ]
  }
}
