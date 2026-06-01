import type {
  MusicChartCard,
  MusicChartsPayload,
  MusicMoodCategory,
  MusicSearchResult,
  NormalizedTrack
} from '../../../../../src/shared/types/music'
import { upgradeCoverUrl } from '../../../../../src/shared/utils/musicCoverUrl'
import { parseKugouJsonBody } from './kugouResponse'
import type { MusicPlaylistSummary, MusicToplistSummary } from '../types'
import { MusicSearchType } from '../types'

const provider = 'kugou' as const

function pickString(obj: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const v = obj[key]
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return ''
}

export function pickNumber(obj: Record<string, unknown>, ...keys: string[]): number | undefined {
  for (const key of keys) {
    const v = obj[key]
    if (typeof v === 'number' && Number.isFinite(v)) return v
    if (typeof v === 'string' && v && Number.isFinite(Number(v))) return Number(v)
  }
  return undefined
}

export function pickHash(raw: Record<string, unknown>): string {
  const direct = pickString(raw, 'hash', 'Hash', 'FileHash', 'file_hash')
  if (direct) return direct.toLowerCase()
  for (const key of ['128', '320', 'HQ', 'SQ', 'Flac', 'High']) {
    const block = raw[key]
    if (block && typeof block === 'object') {
      const h = pickString(block as Record<string, unknown>, 'Hash', 'hash')
      if (h) return h.toLowerCase()
    }
  }
  return ''
}

function pickTitle(raw: Record<string, unknown>): string {
  return (
    pickString(raw, 'SongName', 'songname', 'song_name', 'OriSongName', 'name') ||
    pickString(raw, 'filename', 'FileName') ||
    ''
  )
}

export function encodeKugouVideoId(raw: Record<string, unknown>): string {
  const albumAudioId =
    pickNumber(raw, 'album_audio_id', 'albumAudioId', 'EMixSongID', 'MixSongID', 'mixsongid', 'Audioid') ?? 0
  const hash = pickHash(raw)
  const albumId = pickNumber(raw, 'album_id', 'albumId', 'AlbumID') ?? 0
  return `${albumAudioId}|${hash}|${albumId}`
}

export function parseKugouVideoId(videoId: string): { albumAudioId: string; hash: string; albumId: string } {
  const [albumAudioId = '', hash = '', albumId = ''] = videoId.split('|')
  return { albumAudioId, hash, albumId }
}

function pickCover(raw: Record<string, unknown>): string | undefined {
  const img =
    pickString(raw, 'img', 'Img', 'album_img', 'AlbumImg', 'sizable_cover', 'pic', 'imgurl', 'flexible_cover') ||
    pickString(raw, 'Image', 'cover', 'Cover')
  if (!img) return undefined
  const url = img.replace('http://', 'https://').replace('{size}', '240')
  return upgradeCoverUrl(url, 'card')
}

function mapArtistName(raw: Record<string, unknown>): string {
  return (
    pickString(raw, 'SingerName', 'singername', 'author_name', 'AuthorName', 'singer_name') ||
    pickString(raw, 'artist_name', 'ArtistName') ||
    'Unknown'
  )
}

export function mapKugouSong(raw: Record<string, unknown>): NormalizedTrack | null {
  const albumAudioId = pickNumber(raw, 'album_audio_id', 'albumAudioId', 'EMixSongID', 'MixSongID', 'mixsongid', 'Audioid')
  const hash = pickHash(raw)
  if (!albumAudioId && !hash) return null

  const title = pickTitle(raw)
  if (!title) return null

  const albumId = pickNumber(raw, 'album_id', 'albumId', 'AlbumID')
  const videoId = encodeKugouVideoId(raw)
  const durationMs = pickNumber(raw, 'Duration', 'duration', 'interval', 'timelength', 'timelength_128')

  return {
    trackKey: `${provider}:${albumAudioId || hash}`,
    provider,
    videoId,
    title,
    artist: mapArtistName(raw),
    album: pickString(raw, 'AlbumName', 'album_name', 'albumName') || undefined,
    durationSec: durationMs ? Math.round(durationMs / (durationMs > 1000 ? 1000 : 1)) : undefined,
    coverUrl: pickCover(raw),
    browseId: albumId ? `kugou:album:${albumId}` : undefined
  }
}

export function mapKugouSongs(list: unknown[]): NormalizedTrack[] {
  const out: NormalizedTrack[] = []
  for (const item of list) {
    const mapped = mapKugouSong(item as Record<string, unknown>)
    if (mapped) out.push(mapped)
  }
  return out
}

function extractLists(body: Record<string, unknown>): unknown[] {
  const data = body.data as Record<string, unknown> | unknown[] | undefined
  if (Array.isArray(data)) return data
  if (data && typeof data === 'object') {
    const row = data as Record<string, unknown>
    if (Array.isArray(row.songlist)) return row.songlist
    if (Array.isArray(row.song_list)) return row.song_list
    if (Array.isArray(row.special_list)) return row.special_list
    if (Array.isArray(row.lists)) {
      const first = row.lists[0] as Record<string, unknown> | undefined
      if (first && Array.isArray(first.lists)) {
        const nested: unknown[] = []
        for (const sec of row.lists) {
          const s = sec as Record<string, unknown>
          if (s.type === 'song' || s.type == null) {
            if (Array.isArray(s.lists)) nested.push(...s.lists)
          }
        }
        if (nested.length) return nested
      }
      return row.lists
    }
  }
  if (Array.isArray(body.lists)) return body.lists
  if (Array.isArray(body.list)) return body.list
  if (Array.isArray(body.special_list)) return body.special_list
  return []
}

export function mapKugouSearchResult(body: unknown, type: MusicSearchType): MusicSearchResult {
  const root = parseKugouJsonBody(body) as Record<string, unknown>
  const lists = extractLists(root)
  const mapped: MusicSearchResult = { tracks: [], albums: [], artists: [] }

  if (type === MusicSearchType.Song || type === MusicSearchType.All) {
    mapped.tracks = mapKugouSongs(lists)
  }
  if (type === MusicSearchType.Album || type === MusicSearchType.All) {
    for (const item of lists) {
      const row = item as Record<string, unknown>
      const albumId = pickNumber(row, 'album_id', 'AlbumID', 'albumid')
      if (!albumId) continue
      mapped.albums.push({
        browseId: `kugou:album:${albumId}`,
        title: pickString(row, 'album_name', 'AlbumName', 'name'),
        artist: mapArtistName(row),
        coverUrl: pickCover(row)
      })
    }
  }
  if (type === MusicSearchType.Artist || type === MusicSearchType.All) {
    for (const item of lists) {
      const row = item as Record<string, unknown>
      const artistId = pickNumber(row, 'singerid', 'SingerId', 'author_id', 'AuthorId')
      if (!artistId) continue
      mapped.artists.push({
        browseId: `kugou:artist:${artistId}`,
        name: pickString(row, 'singername', 'SingerName', 'author_name', 'name'),
        coverUrl: pickCover(row)
      })
    }
  }
  if (type === MusicSearchType.Playlist || type === MusicSearchType.All) {
    mapped.playlists = []
    for (const item of lists) {
      const row = item as Record<string, unknown>
      const playlistId = pickString(row, 'global_collection_id', 'GlobalCollectionId', 'specialid', 'SpecialId')
      if (!playlistId) continue
      mapped.playlists.push({
        playlistId,
        title: pickString(row, 'specialname', 'SpecialName', 'name', 'title'),
        coverUrl: pickCover(row),
        trackCount: pickNumber(row, 'songcount', 'SongCount', 'count')
      })
    }
  }
  return mapped
}

export function parseBrowseId(browseId: string): { kind: string; id: string } | null {
  const m = browseId.match(/^kugou:(album|artist|playlist|toplist):(.+)$/)
  if (!m) return null
  return { kind: m[1], id: m[2] }
}

export function mapPlaylistSummary(raw: Record<string, unknown>): MusicPlaylistSummary | null {
  const id =
    pickString(raw, 'global_collection_id', 'GlobalCollectionId', 'specialid', 'SpecialId') ||
    (raw.specialid != null ? String(raw.specialid) : '')
  const title = pickString(raw, 'specialname', 'SpecialName', 'name', 'title')
  if (!id || !title) return null
  const listId = pickString(raw, 'listid', 'list_id', 'ListID') || undefined
  return {
    id,
    title,
    coverUrl: pickCover(raw),
    trackCount: pickNumber(raw, 'songcount', 'SongCount', 'percount', 'collectcount'),
    creatorName: pickString(raw, 'username', 'UserName', 'nickname', 'singername') || undefined,
    listId
  }
}

export function mapToplistSummary(raw: Record<string, unknown>): MusicToplistSummary | null {
  const id = pickString(raw, 'rankid', 'RankId', 'rank_id', 'id')
  const title = pickString(raw, 'rankname', 'RankName', 'rank_name', 'name')
  if (!id || !title) return null
  return {
    id,
    title,
    coverUrl: pickCover(raw),
    updateFrequency: pickString(raw, 'update_frequency', 'UpdateFrequency') || undefined
  }
}

export function mapToplistChartCards(list: unknown[]): MusicChartCard[] {
  const out: MusicChartCard[] = []
  for (const item of list.slice(0, 8)) {
    const row = item as Record<string, unknown>
    const id = pickString(row, 'rankid', 'RankId', 'rank_id', 'id')
    const title = pickString(row, 'rankname', 'RankName', 'name')
    if (!id || !title) continue
    out.push({
      browseId: `kugou:toplist:${id}`,
      title,
      subtitle: pickString(row, 'bannerurl', 'intro') || undefined,
      coverUrl: pickCover(row)
    })
  }
  return out
}

export function buildChartsPayload(list: unknown[]): MusicChartsPayload {
  return { sections: [{ title: '酷狗官方榜', cards: mapToplistChartCards(list) }] }
}

export function mapMoodCategories(list: unknown[]): MusicMoodCategory[] {
  const out: MusicMoodCategory[] = []
  for (const item of list) {
    const row = item as Record<string, unknown>
    const sons = row.son as Array<Record<string, unknown>> | undefined
    if (sons?.length) {
      for (const son of sons) {
        const title = pickString(son, 'tag_name', 'name', 'Name', 'title')
        const id = String(pickNumber(son, 'tag_id', 'id') ?? title)
        if (!title) continue
        out.push({ id, title, browseId: `kugou:playlist-cat:${id}` })
      }
      continue
    }
    const id = String(pickNumber(row, 'id', 'category_id', 'CategoryId', 'tag_id') ?? pickString(row, 'id', 'name'))
    const title = pickString(row, 'name', 'Name', 'title', 'tag_name')
    if (!title) continue
    out.push({
      id,
      title,
      coverUrl: pickCover(row),
      browseId: `kugou:playlist-cat:${id}`
    })
  }
  return out
}
