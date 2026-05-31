import type { IMusicPlatformGateway } from '../IMusicPlatformGateway'
import type { IMusicPlatformService } from '../IMusicPlatformService'
import { DynamicModuleGateway } from '../dynamicModuleGateway'
import { PlatformSessionStore } from '../sessionStore'
import type {
  MusicHotSearchItem,
  MusicPlatformLoginStatus,
  MusicPlatformQuality,
  MusicPlatformQrLoginState,
  MusicPlatformSessionSnapshot,
  MusicPlaylistSummary,
  MusicSearchSuggestItem,
  MusicStreamPick,
  MusicToplistSummary
} from '../types'
import { MusicSearchType } from '../types'
import { loadKugouApiModule } from './loadKugouApi'
import {
  buildChartsPayload,
  mapKugouSearchResult,
  mapKugouSong,
  mapKugouSongs,
  mapMoodCategories,
  mapPlaylistSummary,
  mapToplistSummary,
  parseBrowseId,
  parseKugouVideoId
} from './mapper'
import type {
  MusicChartsPayload,
  MusicDiscoverFeed,
  MusicLyricsResult,
  MusicMoodCategory,
  MusicMoodPlaylist,
  MusicPlatformSubscribedItem,
  MusicPlatformSubscribedKind,
  MusicPlatformUserProfile,
  MusicSearchResult,
  MusicTrendingPayload,
  NormalizedTrack
} from '../../../../../src/shared/types/music'

function mapSearchType(type: MusicSearchType): string {
  switch (type) {
    case MusicSearchType.Album:
      return 'album'
    case MusicSearchType.Artist:
      return 'author'
    case MusicSearchType.Playlist:
      return 'special'
    default:
      return 'song'
  }
}

function mapQuality(quality: MusicPlatformQuality): string {
  switch (quality) {
    case 'lossless':
      return 'flac'
    case 'hires':
      return 'high'
    case 'higher':
    case 'exhigh':
      return '320'
    default:
      return '128'
  }
}

function extractSongRows(data: unknown): unknown[] {
  if (Array.isArray(data)) return data
  if (data && typeof data === 'object') {
    const row = data as Record<string, unknown>
    if (Array.isArray(row.songlist)) return row.songlist
    if (Array.isArray(row.song_list)) return row.song_list
    if (Array.isArray(row.lists)) return row.lists
    if (Array.isArray(row.info)) return row.info
  }
  return []
}

function pickStreamUrl(body: unknown): string | undefined {
  const root = body as Record<string, unknown>
  const data = root.data
  if (typeof data === 'string' && data.startsWith('http')) return data
  if (Array.isArray(data)) {
    for (const item of data) {
      const row = item as Record<string, unknown>
      const url = row.url ?? row.play_url ?? row.playUrl
      if (typeof url === 'string' && url.startsWith('http')) return url
    }
  }
  if (data && typeof data === 'object') {
    const row = data as Record<string, unknown>
    const url = row.url ?? row.play_url ?? row.playUrl
    if (typeof url === 'string' && url.startsWith('http')) return url
  }
  if (typeof root.url === 'string' && root.url.startsWith('http')) return root.url
  return undefined
}

export class KugouPlatformService implements IMusicPlatformService {
  readonly platformId = 'kugou' as const
  private readonly gateway: IMusicPlatformGateway
  private readonly session: PlatformSessionStore
  private proxy = ''

  constructor(basePath: string) {
    const api = loadKugouApiModule()
    this.gateway = new DynamicModuleGateway('kugou', '酷狗', api, 'snakeCase')
    this.session = new PlatformSessionStore('kugou', basePath)
  }

  isReady(): boolean {
    return this.gateway.isAvailable()
  }

  configure(opts: { proxy?: string }): void {
    this.proxy = opts.proxy?.trim() ?? ''
    if (this.proxy) process.env.KUGOU_API_PROXY = this.proxy
  }

  private invoke<T>(path: string, params: Record<string, unknown> = {}): Promise<T> {
    if (!this.gateway.isAvailable()) {
      return Promise.reject(
        new Error('酷狗 API 模块加载失败')
      )
    }
    return this.gateway.invoke<T>(path, params, {
      cookie: this.session.cookieObject(),
      proxy: this.proxy || undefined
    })
  }

  getSessionSnapshot(): MusicPlatformSessionSnapshot {
    return this.session.snapshot()
  }

  async getLoginStatus(): Promise<MusicPlatformLoginStatus> {
    if (!this.session.getMusicU()) return { loggedIn: false, loginType: 'none' }
    const cached = this.session.snapshot()
    try {
      const data = await this.invoke<{ data?: { userid?: number; nickname?: string; pic?: string } }>('user/detail')
      const profile = data.data
      if (!profile?.userid) {
        this.session.clear()
        return { loggedIn: false, loginType: 'none' }
      }
      this.session.setProfile({
        userId: profile.userid,
        nickname: profile.nickname,
        avatarUrl: profile.pic
      })
      return {
        loggedIn: true,
        loginType: 'normal',
        userId: profile.userid,
        nickname: profile.nickname ?? cached.nickname,
        avatarUrl: profile.pic ?? cached.avatarUrl
      }
    } catch {
      if (!cached.musicU) return { loggedIn: false, loginType: 'none' }
      return {
        loggedIn: true,
        loginType: cached.loginType === 'none' ? 'normal' : cached.loginType,
        userId: cached.userId,
        nickname: cached.nickname,
        avatarUrl: cached.avatarUrl
      }
    }
  }

  clearSession(): void {
    this.session.clear()
  }

  setMusicUCookie(token: string): void {
    this.session.setMusicU(token)
  }

  async refreshLoginIfNeeded(): Promise<void> {
    if (!this.session.needsRefresh()) return
    try {
      await this.invoke('login/token')
      this.session.markRefreshed()
    } catch {
      /* ignore */
    }
  }

  async loginQrKey(): Promise<MusicPlatformQrLoginState> {
    const keyData = await this.invoke<{ data?: { qrcode?: string } }>('login/qr/key')
    const key = keyData.data?.qrcode ?? ''
    const qr = await this.invoke<{ data?: { url?: string; base64?: string } }>('login/qr/create', {
      key,
      qrimg: true
    })
    return {
      key,
      qrUrl: qr.data?.url ?? '',
      qrImageBase64: qr.data?.base64
    }
  }

  async loginQrCheck(key: string): Promise<{ status: number; message?: string; cookie?: string }> {
    const data = await this.invoke<{ data?: { status?: number; token?: string; userid?: number } }>(
      'login/qr/check',
      { key }
    )
    const status = data.data?.status ?? 1
    if (status === 4 && data.data?.token) {
      this.session.setMusicU(data.data.token, { userId: data.data.userid })
      return { status, cookie: data.data.token }
    }
    return { status }
  }

  sendPhoneCaptcha(phone: string, _countryCode?: number): Promise<unknown> {
    return this.invoke('captcha/sent', { mobile: phone })
  }

  async loginPhone(phone: string, captcha: string, _countryCode?: number): Promise<unknown> {
    const data = await this.invoke<{ data?: { token?: string; userid?: number } }>('login/cellphone', {
      mobile: phone,
      code: captcha
    })
    if (data.data?.token) {
      this.session.setMusicU(data.data.token, { userId: data.data.userid })
    }
    return data
  }

  logout(): Promise<void> {
    this.session.clear()
    return Promise.resolve()
  }

  async searchDefault(): Promise<string> {
    const data = await this.invoke<{ data?: { keyword?: string } }>('search/default')
    return data.data?.keyword ?? ''
  }

  async searchHot(limit = 20): Promise<MusicHotSearchItem[]> {
    const data = await this.invoke<{ data?: { info?: Array<{ keyword?: string; heat?: number }> } }>('search/hot')
    return (data.data?.info ?? [])
      .slice(0, limit)
      .map((item) => ({ keyword: item.keyword ?? '', score: item.heat }))
      .filter((item) => item.keyword)
  }

  async searchSuggest(keywords: string): Promise<MusicSearchSuggestItem[]> {
    const data = await this.invoke<{ data?: Array<{ keyword?: string }> }>('search/suggest', { keywords })
    const list = Array.isArray(data.data) ? data.data : []
    return list.map((item) => ({ keyword: item.keyword ?? '' })).filter((item) => item.keyword)
  }

  async cloudSearch(
    keywords: string,
    type: MusicSearchType,
    limit = 30,
    offset = 0
  ): Promise<MusicSearchResult> {
    const page = Math.floor(offset / limit) + 1
    const body = await this.invoke('search', {
      keywords,
      type: mapSearchType(type),
      pagesize: limit,
      page
    })
    return mapKugouSearchResult(body, type)
  }

  async resolveStream(songId: string, quality: MusicPlatformQuality): Promise<MusicStreamPick | null> {
    const { albumAudioId, hash, albumId } = parseKugouVideoId(songId)
    if (!hash && !albumAudioId) return null
    const body = await this.invoke('song/url', {
      hash,
      album_audio_id: albumAudioId,
      album_id: albumId || undefined,
      quality: mapQuality(quality)
    })
    const url = pickStreamUrl(body)
    if (!url) return null
    return {
      url,
      format: url.includes('.m4a') || url.includes('.mp4') ? 'mp4' : 'mp3'
    }
  }

  async getLyrics(songId: string): Promise<MusicLyricsResult> {
    const { albumAudioId, hash } = parseKugouVideoId(songId)
    const lyricSearch = await this.invoke<{ candidates?: Array<{ id?: string; accesskey?: string }> }>('search/lyric', {
      hash,
      album_audio_id: albumAudioId,
      man: 'no'
    })
    const candidate = lyricSearch.candidates?.[0]
    if (!candidate?.id || !candidate.accesskey) return {}
    const lyric = await this.invoke<{ decodeContent?: string; content?: string }>('lyric', {
      id: candidate.id,
      accesskey: candidate.accesskey,
      fmt: 'lrc',
      decode: true
    })
    const text = lyric.decodeContent ?? lyric.content
    return text ? { lrc: text, plain: text } : {}
  }

  async getSongDetail(songId: string): Promise<NormalizedTrack | null> {
    const { albumAudioId } = parseKugouVideoId(songId)
    const data = await this.invoke<{ data?: unknown[] }>('audio', { album_audio_id: albumAudioId })
    const first = data.data?.[0]
    return first ? mapKugouSong(first as Record<string, unknown>) : null
  }

  async getPlaylistTracks(playlistId: string): Promise<NormalizedTrack[]> {
    const rawId = parseBrowseId(playlistId)?.id ?? playlistId
    const data = await this.invoke<{ data?: { lists?: unknown[]; songs?: unknown[] } }>('playlist/track/all', {
      id: rawId,
      pagesize: 500
    })
    return mapKugouSongs(data.data?.lists ?? data.data?.songs ?? [])
  }

  async getPlaylistSummaries(category = '0', limit = 30): Promise<MusicPlaylistSummary[]> {
    const categoryId = Number(category) || 0
    try {
      const data = await this.invoke<{ data?: { info?: unknown[]; lists?: unknown[] } }>('top/playlist', {
        category_id: categoryId,
        pagesize: limit
      })
      const out: MusicPlaylistSummary[] = []
      for (const item of data.data?.info ?? data.data?.lists ?? []) {
        const mapped = mapPlaylistSummary(item as Record<string, unknown>)
        if (mapped) out.push(mapped)
      }
      if (out.length) return out.slice(0, limit)
    } catch {
      /* top/playlist 偶发 500，走下方 fallback */
    }

    const theme = await this.invoke<{ data?: { theme_list?: unknown[] } }>('theme/playlist', { pagesize: limit })
    const out: MusicPlaylistSummary[] = []
    for (const item of theme.data?.theme_list ?? []) {
      const row = item as Record<string, unknown>
      const id = row.id != null ? String(row.id) : ''
      const title = typeof row.title === 'string' ? row.title.trim() : ''
      if (!id || !title) continue
      out.push({
        id: `theme:${id}`,
        title,
        coverUrl: typeof row.pic === 'string' ? row.pic.replace('http://', 'https://') : undefined,
        trackCount: typeof row.play_count === 'number' ? row.play_count : undefined
      })
    }
    return out.slice(0, limit)
  }

  async getToplists(): Promise<MusicToplistSummary[]> {
    const data = await this.invoke<{ data?: { info?: unknown[]; lists?: unknown[] } }>('rank/list')
    const out: MusicToplistSummary[] = []
    for (const item of data.data?.info ?? data.data?.lists ?? []) {
      const mapped = mapToplistSummary(item as Record<string, unknown>)
      if (mapped) out.push(mapped)
    }
    return out
  }

  async getToplistTracks(toplistId: string, limit = 50): Promise<NormalizedTrack[]> {
    const rawId = parseBrowseId(toplistId)?.id ?? toplistId
    const data = await this.invoke<{ data?: { songlist?: unknown[]; lists?: unknown[]; info?: unknown[] } }>(
      'rank/audio',
      { rankid: rawId, pagesize: limit }
    )
    return mapKugouSongs(extractSongRows(data.data)).slice(0, limit)
  }

  async getDailyRecommend(): Promise<NormalizedTrack[]> {
    const data = await this.invoke<{ data?: { song_list?: unknown[]; songs?: unknown[] } }>('everyday_recommend')
    return mapKugouSongs(data.data?.song_list ?? data.data?.songs ?? [])
  }

  async getPersonalFm(): Promise<NormalizedTrack[]> {
    const data = await this.invoke<{ data?: { song_list?: unknown[]; lists?: unknown[] } }>('personal_fm')
    return mapKugouSongs(data.data?.song_list ?? data.data?.lists ?? [])
  }

  async trashPersonalFm(songId: string): Promise<void> {
    const { albumAudioId } = parseKugouVideoId(songId)
    await this.invoke('personal_fm', { action: 'garbage', album_audio_id: albumAudioId })
  }

  async getPersonalizedPlaylists(limit = 10): Promise<MusicMoodPlaylist[]> {
    const summaries = await this.getPlaylistSummaries('0', limit)
    return summaries.map((p) => ({
      browseId: `kugou:playlist:${p.id}`,
      title: p.title,
      coverUrl: p.coverUrl,
      trackCount: p.trackCount
    }))
  }

  async getNewSongs(limit = 20): Promise<NormalizedTrack[]> {
    const data = await this.invoke<{ data?: unknown }>('top/song')
    return mapKugouSongs(extractSongRows(data.data)).slice(0, limit)
  }

  async getNewAlbums(limit = 12): Promise<MusicSearchResult['albums']> {
    const data = await this.invoke<{ data?: { info?: unknown[] } }>('top/album', { pagesize: limit })
    const out: MusicSearchResult['albums'] = []
    for (const item of (data.data?.info ?? []).slice(0, limit)) {
      const row = item as Record<string, unknown>
      const albumId = row.album_id ?? row.AlbumID
      if (albumId == null) continue
      out.push({
        browseId: `kugou:album:${albumId}`,
        title: String(row.album_name ?? row.AlbumName ?? ''),
        artist: String(row.author_name ?? row.SingerName ?? ''),
        coverUrl: typeof row.img === 'string' ? row.img : undefined
      })
    }
    return out
  }

  async getArtistList(
    _area = '0',
    type = 0,
    initial = '',
    limit = 30
  ): Promise<MusicSearchResult['artists']> {
    const data = await this.invoke<{ data?: { info?: unknown[] } }>('artist/lists', {
      type,
      pagesize: limit,
      initial: initial || undefined
    })
    const out: MusicSearchResult['artists'] = []
    for (const item of data.data?.info ?? []) {
      const row = item as Record<string, unknown>
      const id = row.singerid ?? row.SingerId
      if (id == null) continue
      out.push({
        browseId: `kugou:artist:${id}`,
        name: String(row.singername ?? row.SingerName ?? ''),
        coverUrl: typeof row.img === 'string' ? row.img : undefined
      })
    }
    return out
  }

  async getAlbum(browseId: string): Promise<{ album: unknown; tracks: NormalizedTrack[] }> {
    const rawId = parseBrowseId(browseId)?.id ?? browseId
    const [detail, songs] = await Promise.all([
      this.invoke('album/detail', { id: rawId }),
      this.invoke<{ data?: unknown[] }>('album/songs', { id: rawId, pagesize: 500 })
    ])
    return {
      album: detail,
      tracks: mapKugouSongs(songs.data ?? [])
    }
  }

  async getArtist(browseId: string): Promise<import('../../../../../src/shared/types/music').MusicArtistPayload> {
    const rawId = parseBrowseId(browseId)?.id ?? browseId
    const [detail, songs, albums] = await Promise.all([
      this.invoke<{ data?: { singername?: string } }>('artist/detail', { singerid: rawId }),
      this.invoke<{ data?: { info?: unknown[] } }>('artist/audios', { singerid: rawId, pagesize: 50 }),
      this.invoke<{ data?: { info?: unknown[] } }>('artist/albums', { singerid: rawId, pagesize: 20 })
    ])
    const albumRows = albums.data?.info ?? []
    return {
      name: detail.data?.singername ?? '',
      tracks: mapKugouSongs(songs.data?.info ?? []),
      albums: albumRows.map((a) => {
        const row = a as Record<string, unknown>
        return {
          browseId: `kugou:album:${row.album_id ?? row.AlbumID}`,
          title: String(row.album_name ?? row.AlbumName ?? ''),
          artist: detail.data?.singername ?? '',
          coverUrl: typeof row.img === 'string' ? row.img : undefined
        }
      })
    }
  }

  async getMoodCategories(): Promise<MusicMoodCategory[]> {
    const data = await this.invoke<{ data?: unknown[] }>('playlist/tags')
    return mapMoodCategories(data.data ?? [])
  }

  getUserPlaylists(): Promise<MusicPlaylistSummary[]> {
    return this.invoke<{ data?: { info?: unknown[] } }>('user/playlist').then((data) => {
      const out: MusicPlaylistSummary[] = []
      for (const item of data.data?.info ?? []) {
        const mapped = mapPlaylistSummary(item as Record<string, unknown>)
        if (mapped) out.push(mapped)
      }
      return out
    })
  }

  async getLikedSongIds(): Promise<number[]> {
    try {
      const playlists = await this.getUserPlaylists()
      const fav = playlists.find((p) => /我喜欢|收藏|最爱|默认/.test(p.title))
      if (!fav) return []
      const tracks = await this.getPlaylistTracks(`kugou:playlist:${fav.id}`)
      return tracks
        .map((t) => {
          const parts = t.videoId.split('|')
          const id = parts[0] || t.videoId
          const n = Number(id)
          return Number.isFinite(n) ? n : NaN
        })
        .filter((n) => Number.isFinite(n))
    } catch {
      return []
    }
  }

  likeSong(_songId: string, _like: boolean): Promise<void> {
    return Promise.resolve()
  }

  async getUserCloud(limit = 50): Promise<NormalizedTrack[]> {
    try {
      const data = await this.invoke<{ data?: { info?: unknown[]; lists?: unknown[] } }>('user/cloud', {
        pagesize: limit
      })
      return mapKugouSongs(data.data?.info ?? data.data?.lists ?? [])
    } catch {
      return []
    }
  }

  async getUserProfile(): Promise<MusicPlatformUserProfile> {
    const status = await this.getLoginStatus()
    if (!status.loggedIn) {
      return {
        platform: 'kugou',
        loggedIn: false,
        capabilities: {
          likedSongs: true,
          cloud: true,
          subscribedAlbums: false,
          subscribedArtists: true,
          subscribedMvs: true,
          subscribedDjs: false
        }
      }
    }
    let detail: Record<string, unknown> = {}
    try {
      const data = await this.invoke<{ data?: Record<string, unknown> }>('user/detail')
      detail = data.data ?? {}
    } catch {
      /* use status fallback */
    }
    let vipType = 0
    try {
      const vip = await this.invoke<{ data?: { is_vip?: number; vip_type?: number } }>('user/vip/detail')
      vipType = vip.data?.is_vip ?? vip.data?.vip_type ?? 0
    } catch {
      /* ignore */
    }
    const playlists = await this.getUserPlaylists().catch(() => [])
    const likedIds = await this.getLikedSongIds().catch(() => [])
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
      this.session.setProfile({ userId: status.userId, nickname, avatarUrl })
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
      capabilities: {
        likedSongs: true,
        cloud: true,
        subscribedAlbums: false,
        subscribedArtists: true,
        subscribedMvs: true,
        subscribedDjs: false
      }
    }
  }

  async getSubscribed(kind: MusicPlatformSubscribedKind, limit = 30): Promise<MusicPlatformSubscribedItem[]> {
    if (kind === 'album' || kind === 'dj') return []
    try {
      if (kind === 'artist') {
        const data = await this.invoke<{ data?: { info?: unknown[]; lists?: unknown[] } }>('user/follow', {
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
      const data = await this.invoke<{ data?: { info?: unknown[]; lists?: unknown[] } }>('user/video/collect', {
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

  async buildDiscoverFeed(): Promise<MusicDiscoverFeed> {
    const [daily, fm, newSongs, toplists, playlists] = await Promise.all([
      this.getDailyRecommend().catch(() => []),
      this.getPersonalFm().catch(() => []),
      this.getNewSongs(16).catch(() => []),
      this.getToplists().catch(() => []),
      this.getPlaylistSummaries('0', 12).catch(() => [])
    ])
    const chartTracks = toplists.length ? await this.getToplistTracks(toplists[0].id, 12).catch(() => []) : []
    return {
      forYou: daily.length ? daily : fm.length ? fm : newSongs.slice(0, 16),
      trending: fm.length ? fm : daily.length ? daily : chartTracks.slice(0, 16),
      newReleases: newSongs,
      chartTracks,
      chartPlaylists: playlists.map((p) => ({
        browseId: `kugou:playlist:${p.id}`,
        title: p.title,
        coverUrl: p.coverUrl,
        trackCount: p.trackCount
      }))
    }
  }

  async getTrending(): Promise<MusicTrendingPayload> {
    const tracks = await this.getPersonalFm().catch(() => this.getDailyRecommend())
    return { country: 'CN', tracks }
  }

  async getCharts(): Promise<MusicChartsPayload> {
    const data = await this.invoke<{ data?: { info?: unknown[]; lists?: unknown[] } }>('rank/list')
    return buildChartsPayload(data.data?.info ?? data.data?.lists ?? [])
  }
}
