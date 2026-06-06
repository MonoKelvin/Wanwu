import type { PlatformSessionStore } from '../sessionStore'
import type { MusicPlatformLoginStatus, MusicPlaylistSummary } from '../types'
import type {
  MusicPlatformSubscribedItem,
  MusicPlatformSubscribedKind,
  MusicPlatformUserProfile
} from '../../../../../src/shared/types/music'

const KUGOU_CAPABILITIES = {
  likedSongs: true,
  cloud: true,
  subscribedAlbums: false,
  subscribedArtists: true,
  subscribedMvs: true,
  subscribedDjs: false,
  personalFm: true,
  playlistEdit: true,
  cloudUpload: false,
  comments: true,
  mv: true,
  sceneRadio: true
} as const

export interface KugouUserProfileHost {
  invoke<T>(path: string, params?: Record<string, unknown>): Promise<T>
  session: PlatformSessionStore
  getLoginStatus(): Promise<MusicPlatformLoginStatus>
  getUserPlaylists(): Promise<MusicPlaylistSummary[]>
  getLikedSongIds(): Promise<number[]>
}

export async function fetchKugouUserProfile(host: KugouUserProfileHost): Promise<MusicPlatformUserProfile> {
  const status = await host.getLoginStatus()
  if (!status.loggedIn) {
    return {
      platform: 'kugou',
      loggedIn: false,
      capabilities: { ...KUGOU_CAPABILITIES }
    }
  }
  let detail: Record<string, unknown> = {}
  try {
    const data = await host.invoke<{ data?: Record<string, unknown> }>('user/detail')
    detail = data.data ?? {}
  } catch {
    /* use status fallback */
  }
  let vipType = 0
  try {
    const vip = await host.invoke<{ data?: { is_vip?: number; vip_type?: number } }>('user/vip/detail')
    vipType = vip.data?.is_vip ?? vip.data?.vip_type ?? 0
  } catch {
    /* ignore */
  }
  const playlists = await host.getUserPlaylists().catch(() => [])
  const likedIds = await host.getLikedSongIds().catch(() => [])
  const nickname = String(detail.nickname ?? status.nickname ?? '')
  const avatarUrl = typeof detail.pic === 'string' ? detail.pic : status.avatarUrl
  const signature =
    typeof detail.intro === 'string'
      ? detail.intro
      : typeof detail.signature === 'string'
        ? detail.signature
        : undefined
  const level = typeof detail.level === 'number' ? detail.level : undefined

  if (status.userId) {
    host.session.setProfile({ userId: status.userId, nickname, avatarUrl })
  }

  return {
    platform: 'kugou',
    loggedIn: true,
    userId: status.userId,
    nickname,
    avatarUrl,
    signature,
    level,
    vipType,
    stats: {
      likedSongCount: likedIds.length,
      playlistCount: playlists.length,
      createdPlaylistCount: playlists.length,
      artistCount: undefined
    },
    capabilities: { ...KUGOU_CAPABILITIES }
  }
}

export async function fetchKugouSubscribed(
  host: KugouUserProfileHost,
  kind: MusicPlatformSubscribedKind,
  limit = 30
): Promise<MusicPlatformSubscribedItem[]> {
  if (kind === 'album' || kind === 'dj') return []
  try {
    if (kind === 'artist') {
      const data = await host.invoke<{ data?: { info?: unknown[]; lists?: unknown[] } }>('user/follow', {
        pagesize: limit
      })
      const rows = data.data?.info ?? data.data?.lists ?? []
      return rows
        .map((row) => {
          const item = row as Record<string, unknown>
          const id = item.singerid ?? item.SingerId ?? item.author_id
          if (id == null) return null
          return {
            id: String(id),
            title: String(item.singername ?? item.SingerName ?? item.author_name ?? ''),
            coverUrl: typeof item.img === 'string' ? item.img : undefined,
            browseId: `kugou:artist:${id}`
          }
        })
        .filter((item): item is MusicPlatformSubscribedItem => item != null)
        .slice(0, limit)
    }
    const data = await host.invoke<{ data?: { info?: unknown[]; lists?: unknown[] } }>('user/video/collect', {
      pagesize: limit
    })
    const rows = data.data?.info ?? data.data?.lists ?? []
    return rows
      .map((row) => {
        const item = row as Record<string, unknown>
        const id = item.video_id ?? item.id
        if (id == null) return null
        return {
          id: String(id),
          title: String(item.video_name ?? item.name ?? item.title ?? ''),
          subtitle: item.author_name ? String(item.author_name) : undefined,
          coverUrl: typeof item.img === 'string' ? item.img : undefined,
          browseId: `kugou:mv:${id}`
        }
      })
      .filter((item): item is MusicPlatformSubscribedItem => item != null)
      .slice(0, limit)
  } catch {
    return []
  }
}
