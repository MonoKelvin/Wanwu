import { upgradeCoverUrl } from '@shared/utils/musicCoverUrl'

export interface NormalizedAlbumMeta {
  title: string
  artist: string
  coverUrl?: string
  description?: string
  publishTime?: string
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
}

function pickString(...values: unknown[]): string {
  for (const v of values) {
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return ''
}

function pickArtistNames(row: Record<string, unknown>): string {
  const direct = row.artist
  if (typeof direct === 'string' && direct.trim()) return direct.trim()
  if (direct && typeof direct === 'object' && !Array.isArray(direct)) {
    const name = pickString((direct as Record<string, unknown>).name)
    if (name) return name
  }
  const artists = row.artists
  if (Array.isArray(artists)) {
    const names = artists
      .map((a) => (a && typeof a === 'object' ? pickString((a as Record<string, unknown>).name) : ''))
      .filter(Boolean)
    if (names.length) return names.join(', ')
  }
  return pickString(
    row.artistName,
    row.singername,
    row.SingerName,
    row.author_name,
    row.AuthorName
  )
}

function pickCoverUrl(row: Record<string, unknown>): string | undefined {
  const thumb = row.thumbnails
  if (Array.isArray(thumb) && thumb[0] && typeof thumb[0] === 'object') {
    const url = (thumb[0] as Record<string, unknown>).url
    if (typeof url === 'string' && url) return url
  }
  const raw = pickString(
    row.picUrl,
    row.pic_url,
    row.img,
    row.cover,
    row.album_img,
    row.AlbumImg,
    row.sizable_cover,
    row.blurPicUrl,
    row.coverImgUrl
  )
  if (!raw) return undefined
  return upgradeCoverUrl(raw.replace('http://', 'https://').replace('{size}', '480'), 'hero')
}

/** 将各平台 album 原始结构统一为展示用字段 */
export function normalizeAlbumMeta(album: unknown, fallbackTitle?: string): NormalizedAlbumMeta {
  const root = asRecord(album)
  const nested = asRecord(root.data)
  const row = Object.keys(nested).length ? { ...root, ...nested } : root

  const title = pickString(row.name, row.title, row.album_name, row.AlbumName, fallbackTitle, '专辑')
  const artist = pickArtistNames(row)
  const coverUrl = pickCoverUrl(row)
  const description = pickString(row.description, row.briefDesc, row.intro, row.profile, row.desc)
  const publishTime = pickString(row.publishTime, row.publish_time, row.pubTime, row.publicTime)

  return { title, artist, coverUrl, description, publishTime }
}
