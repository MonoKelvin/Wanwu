import type { PlatformSessionStore } from '../sessionStore'
import type { MusicPlaylistSummary, MusicStreamPick } from '../types'
import { pickKugouStreamUrl } from './kugouResponse'
import { mapPlaylistSummary, parseBrowseId, parseKugouVideoId, pickNumber, mapKugouSongs } from './mapper'
import type {
  MusicMvDetail,
  MusicRadioCategory,
  MusicSongCommentPage,
  NormalizedTrack
} from '../../../../../src/shared/types/music'

export interface KugouPlatformSocialHost {
  invoke<T>(path: string, params?: Record<string, unknown>): Promise<T>
  session: PlatformSessionStore
  getUserPlaylists(): Promise<MusicPlaylistSummary[]>
  getSongDetail(songId: string): Promise<NormalizedTrack | null>
}

export class KugouPlatformSocialOps {
  constructor(private readonly host: KugouPlatformSocialHost) {}

  async createPlaylist(name: string): Promise<MusicPlaylistSummary> {
    if (!this.host.session.getMusicU()) throw new Error('请先登录')
    const data = await this.host.invoke<{ data?: Record<string, unknown> }>('playlist/add', {
      name,
      type: 0,
      source: 1
    })
    const row = data.data ?? {}
    const mapped = mapPlaylistSummary(row)
    if (!mapped) throw new Error('创建歌单失败')
    return mapped
  }

  async deletePlaylist(playlistId: string): Promise<void> {
    if (!this.host.session.getMusicU()) throw new Error('请先登录')
    const rawId = parseBrowseId(playlistId)?.id ?? playlistId
    const playlists = await this.host.getUserPlaylists()
    const target = playlists.find((p) => p.id === rawId)
    const listId = target?.listId ?? rawId
    await this.host.invoke('playlist/del', { listid: listId })
  }

  async addPlaylistTracks(playlistId: string, songIds: string[]): Promise<void> {
    if (!this.host.session.getMusicU()) throw new Error('请先登录')
    const rawId = parseBrowseId(playlistId)?.id ?? playlistId
    const playlists = await this.host.getUserPlaylists()
    const target = playlists.find((p) => p.id === rawId)
    const listId = target?.listId ?? rawId
    const chunks: string[] = []
    for (const songId of songIds) {
      const { albumAudioId, hash, albumId } = parseKugouVideoId(songId)
      let title = ''
      try {
        const detail = await this.host.getSongDetail(songId)
        title = detail?.title ?? ''
      } catch {
        /* ignore */
      }
      chunks.push(`${title}|${hash}|${albumId}|${albumAudioId}`)
    }
    if (!chunks.length) return
    await this.host.invoke('playlist/tracks/add', { listid: listId, data: chunks.join(',') })
  }

  async removePlaylistTracks(playlistId: string, songIds: string[]): Promise<void> {
    if (!this.host.session.getMusicU()) throw new Error('请先登录')
    const rawId = parseBrowseId(playlistId)?.id ?? playlistId
    const playlists = await this.host.getUserPlaylists()
    const target = playlists.find((p) => p.id === rawId)
    const listId = target?.listId ?? rawId
    const globalId = target?.id ?? rawId
    const raw = await this.host.invoke<{ data?: { info?: unknown[]; lists?: unknown[] } }>('playlist/track/all', {
      id: globalId,
      pagesize: 500
    })
    const want = new Set(songIds.map((id) => parseKugouVideoId(id).albumAudioId))
    const fileIds: string[] = []
    for (const item of raw.data?.info ?? raw.data?.lists ?? []) {
      const row = item as Record<string, unknown>
      const mixId = String(pickNumber(row, 'album_audio_id', 'mixsongid', 'MixSongID') ?? '')
      if (!want.has(mixId)) continue
      const fid = row.fileid ?? row.file_id
      if (fid != null) fileIds.push(String(fid))
    }
    if (!fileIds.length) return
    await this.host.invoke('playlist/tracks/del', { listid: listId, fileids: fileIds.join(',') })
  }

  async followArtist(artistId: string, follow: boolean): Promise<void> {
    if (!this.host.session.getMusicU()) throw new Error('请先登录')
    const rawId = parseBrowseId(artistId)?.id ?? artistId
    if (follow) {
      await this.host.invoke('artist/follow', { id: rawId })
    } else {
      await this.host.invoke('artist/unfollow', { id: rawId })
    }
  }

  async getSongComments(songId: string, page = 1): Promise<MusicSongCommentPage> {
    const { albumAudioId } = parseKugouVideoId(songId)
    const data = await this.host.invoke<{ comments?: unknown[]; total?: number }>('comment/music', {
      mixsongid: albumAudioId,
      page,
      pagesize: 30
    })
    const comments = (data.comments ?? []).map((item, idx) => {
      const row = item as Record<string, unknown>
      return {
        id: String(row.id ?? row.cmtid ?? idx),
        userName: String(row.user_name ?? row.nickname ?? row.username ?? '匿名'),
        content: String(row.content ?? row.msg ?? ''),
        likedCount: pickNumber(row, 'like_count', 'likenum', 'liked_count'),
        time: typeof row.addtime === 'string' ? row.addtime : undefined,
        avatarUrl: typeof row.user_pic === 'string' ? row.user_pic : undefined
      }
    })
    return { comments, total: data.total, hasMore: comments.length >= 30 }
  }

  async getMvDetail(browseId: string): Promise<MusicMvDetail | null> {
    const rawId = parseBrowseId(browseId)?.id ?? browseId.replace(/^kugou:mv:/, '')
    const data = await this.host.invoke<{ data?: { info?: unknown[]; lists?: unknown[] } }>('video/detail', {
      id: rawId
    })
    const row = (data.data?.info ?? data.data?.lists ?? [])[0] as Record<string, unknown> | undefined
    if (!row) return null
    const id = String(row.video_id ?? row.id ?? rawId)
    return {
      id,
      title: String(row.video_name ?? row.name ?? row.title ?? ''),
      artist: String(row.author_name ?? row.singername ?? ''),
      coverUrl: typeof row.img === 'string' ? row.img.replace('http://', 'https://') : undefined,
      durationSec: pickNumber(row, 'timelen', 'duration'),
      playCount: pickNumber(row, 'play_count', 'playcount'),
      browseId: `kugou:mv:${id}`
    }
  }

  async resolveMvStream(mvId: string): Promise<MusicStreamPick | null> {
    const data = await this.host.invoke<{ data?: { info?: Array<{ mvdata?: Array<{ downurl?: string }> }> } }>(
      'kmr/audio/mv',
      { video_id: mvId }
    )
    const url = data.data?.info?.[0]?.mvdata?.[0]?.downurl
    if (!url) return null
    return { url, format: url.includes('.mp4') ? 'mp4' : 'mp3' }
  }

  async getRadioCategories(): Promise<MusicRadioCategory[]> {
    const data = await this.host.invoke<{ data?: { info?: unknown[]; lists?: unknown[] } }>('scene/module')
    const rows = data.data?.info ?? data.data?.lists ?? []
    return rows
      .map((item) => {
        const row = item as Record<string, unknown>
        const id = String(row.scene_id ?? row.id ?? '')
        const title = String(row.scene_name ?? row.name ?? row.title ?? '')
        if (!id || !title) return null
        return {
          id,
          title,
          coverUrl: typeof row.img === 'string' ? row.img : undefined,
          subtitle: typeof row.intro === 'string' ? row.intro : undefined
        }
      })
      .filter((item): item is MusicRadioCategory => item != null)
  }

  async getRadioTracks(categoryId: string, limit = 30): Promise<NormalizedTrack[]> {
    const data = await this.host.invoke<{ data?: { info?: unknown[]; lists?: unknown[] } }>('scene/music', {
      id: categoryId,
      pagesize: limit
    })
    return mapKugouSongs(data.data?.info ?? data.data?.lists ?? []).slice(0, limit)
  }

  async resolveCloudStream(songId: string, meta?: { name?: string }): Promise<MusicStreamPick | null> {
    const { albumAudioId, hash } = parseKugouVideoId(songId)
    const data = await this.host.invoke<{ url?: string | string[] }>('user/cloud/url', {
      hash,
      album_audio_id: albumAudioId,
      name: meta?.name ?? ''
    })
    const url = pickKugouStreamUrl(data)
    if (!url) return null
    return { url, format: url.includes('.m4a') || url.includes('.mp4') ? 'mp4' : 'mp3' }
  }
}
