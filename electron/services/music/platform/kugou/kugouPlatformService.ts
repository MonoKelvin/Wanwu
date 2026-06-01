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
import { ensureKugouDevice } from './kugouDevice'
import { invokeKugou } from './kugouInvoke'
import { pickKugouStreamUrl, parseKugouJsonBody } from './kugouResponse'
import { loadKugouApiModule } from './loadKugouApi'
import {
  buildChartsPayload,
  mapKugouSearchResult,
  mapKugouSong,
  mapKugouSongs,
  mapMoodCategories,
  mapPlaylistSummary,
  mapToplistChartCards,
  mapToplistSummary,
  parseBrowseId,
  parseKugouVideoId,
  pickHash,
  pickNumber
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
  MusicMvDetail,
  MusicRadioCategory,
  MusicSongCommentPage,
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

function dedupeTracks(tracks: NormalizedTrack[]): NormalizedTrack[] {
  const out: NormalizedTrack[] = []
  const seen = new Set<string>()
  for (const t of tracks) {
    if (seen.has(t.trackKey)) continue
    seen.add(t.trackKey)
    out.push(t)
  }
  return out
}

export class KugouPlatformService implements IMusicPlatformService {
  readonly platformId = 'kugou' as const
  private readonly gateway: IMusicPlatformGateway
  private readonly session: PlatformSessionStore
  private proxy = ''
  private deviceReady: Promise<void> | null = null

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

  private async invoke<T>(path: string, params: Record<string, unknown> = {}): Promise<T> {
    if (!this.gateway.isAvailable()) {
      return Promise.reject(new Error('酷狗 API 模块加载失败'))
    }
    if (!this.deviceReady) {
      this.deviceReady = ensureKugouDevice(this.session, this.proxy || undefined)
    }
    await this.deviceReady

    const raw = await invokeKugou(this.session, path, params, this.proxy || undefined)
    return raw as T
  }

  getSessionSnapshot(): MusicPlatformSessionSnapshot {
    return this.session.snapshot()
  }

  async getLoginStatus(): Promise<MusicPlatformLoginStatus> {
    if (!this.session.getMusicU()) return { loggedIn: false, loginType: 'none' }
    const cached = this.session.snapshot()
    try {
      const data = await this.invoke<{ status?: number; data?: { userid?: number; nickname?: string; pic?: string } }>(
        'user/detail'
      )
      if (data.status !== 1 || !data.data?.userid) {
        this.session.clear()
        return { loggedIn: false, loginType: 'none' }
      }
      this.session.setProfile({
        userId: data.data.userid,
        nickname: data.data.nickname,
        avatarUrl: data.data.pic
      })
      return {
        loggedIn: true,
        loginType: 'normal',
        userId: data.data.userid,
        nickname: data.data.nickname ?? cached.nickname,
        avatarUrl: data.data.pic ?? cached.avatarUrl
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
    if (!this.session.getMusicU() || !this.session.needsRefresh()) return
    try {
      await this.invoke('login/token')
      this.session.markRefreshed()
    } catch {
      /* token 失效时由 getLoginStatus 校验并清理 */
    }
  }

  async loginQrKey(): Promise<MusicPlatformQrLoginState> {
    const keyData = await this.invoke<{ data?: { qrcode?: string; qrcode_img?: string } }>('login/qr/key')
    const key = keyData.data?.qrcode ?? ''
    if (!key) throw new Error('无法获取二维码 key')
    const qr = await this.invoke<{ data?: { url?: string; base64?: string } }>('login/qr/create', {
      key,
      qrimg: true
    })
    return {
      key,
      qrUrl: qr.data?.url ?? '',
      qrImageBase64: qr.data?.base64 ?? keyData.data?.qrcode_img
    }
  }

  async loginQrCheck(key: string): Promise<{ status: number; message?: string; cookie?: string }> {
    const data = await this.invoke<{ data?: { status?: number; token?: string; userid?: number } }>(
      'login/qr/check',
      { key }
    )
    const status = data.data?.status ?? 1
    if (status === 4) {
      const token = data.data?.token?.trim()
      const userId = data.data?.userid
      if (token && !this.session.getMusicU()) {
        this.session.setMusicU(token, userId ? { userId } : undefined)
      }
      await this.getLoginStatus()
      return { status, cookie: this.session.getMusicU() }
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
    const token = data.data?.token?.trim()
    const userId = data.data?.userid
    if (token && !this.session.getMusicU()) {
      this.session.setMusicU(token, userId ? { userId } : undefined)
    }
    await this.getLoginStatus()
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
    const data = await this.invoke<{ data?: unknown }>('search/suggest', { keywords })
    const out: MusicSearchSuggestItem[] = []
    if (Array.isArray(data.data)) {
      for (const block of data.data) {
        if (!block || typeof block !== 'object') continue
        const row = block as Record<string, unknown>
        const records = row.RecordDatas
        if (Array.isArray(records)) {
          for (const item of records) {
            const hint = (item as Record<string, unknown>).HintInfo
            if (typeof hint === 'string' && hint) out.push({ keyword: hint })
          }
        } else if (typeof row.keyword === 'string' && row.keyword) {
          out.push({ keyword: row.keyword })
        }
      }
    }
    return out
  }

  async cloudSearch(
    keywords: string,
    type: MusicSearchType,
    limit = 30,
    offset = 0
  ): Promise<MusicSearchResult> {
    const page = Math.floor(offset / limit) + 1
    const searchType = mapSearchType(type)

    try {
      const body = await this.invoke('search', {
        keywords,
        type: searchType,
        pagesize: limit,
        page
      })
      const mapped = mapKugouSearchResult(body, type)
      if (
        mapped.tracks.length ||
        mapped.albums.length ||
        mapped.artists.length ||
        (mapped.playlists?.length ?? 0) > 0
      ) {
        return mapped
      }
    } catch {
      /* 单曲搜索失败时走综合搜索 */
    }

    if (type === MusicSearchType.Song || type === MusicSearchType.All) {
      try {
        const body = await this.invoke('search/complex', { keywords, pagesize: limit, page })
        return mapKugouSearchResult(body, type)
      } catch {
        /* ignore */
      }
    }

    return { tracks: [], albums: [], artists: [] }
  }

  async resolveStream(songId: string, quality: MusicPlatformQuality): Promise<MusicStreamPick | null> {
    const { albumAudioId, hash, albumId } = parseKugouVideoId(songId)
    if (!hash && !albumAudioId) return null
    const params = {
      hash,
      album_audio_id: albumAudioId,
      album_id: albumId || undefined,
      quality: mapQuality(quality)
    }

    for (const path of ['song/url', 'song/url/new'] as const) {
      try {
        const body = await this.invoke(path, path === 'song/url/new' ? { hash, album_audio_id: albumAudioId } : params)
        const url = pickKugouStreamUrl(body)
        if (!url) continue
        return {
          url,
          format: url.includes('.m4a') || url.includes('.mp4') ? 'mp4' : 'mp3'
        }
      } catch {
        /* try next */
      }
    }
    return null
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
    if (rawId.startsWith('rank:')) {
      return this.getToplistTracks(rawId.slice('rank:'.length), 500)
    }
    if (rawId.startsWith('theme:')) {
      const themeId = rawId.slice('theme:'.length)
      const data = await this.invoke<{ data?: { songlist?: unknown[]; song_list?: unknown[] } }>(
        'theme/playlist/track',
        { theme_id: themeId, pagesize: 500 }
      )
      return mapKugouSongs(extractSongRows(data.data))
    }
    const data = await this.invoke<{ data?: { lists?: unknown[]; songs?: unknown[] } }>('playlist/track/all', {
      id: rawId,
      pagesize: 500
    })
    const tracks = mapKugouSongs(data.data?.lists ?? data.data?.songs ?? [])
    if (tracks.length) return tracks
    const alt = await this.invoke<{ data?: { lists?: unknown[] } }>('playlist/track/all/new', {
      listid: rawId,
      pagesize: 500
    })
    return mapKugouSongs(alt.data?.lists ?? [])
  }

  async getPlaylistSummaries(category = '0', limit = 30): Promise<MusicPlaylistSummary[]> {
    const categoryId = Number(category) || 0
    try {
      const data = await this.invoke<{ data?: { special_list?: unknown[]; info?: unknown[]; lists?: unknown[] } }>(
        'top/playlist',
        { category_id: categoryId, pagesize: limit }
      )
      const out: MusicPlaylistSummary[] = []
      for (const item of data.data?.special_list ?? data.data?.info ?? data.data?.lists ?? []) {
        const mapped = mapPlaylistSummary(item as Record<string, unknown>)
        if (mapped) out.push(mapped)
      }
      if (out.length) return out.slice(0, limit)
    } catch {
      /* fallback below */
    }

    try {
      const rankTop = await this.invoke<{ data?: { list?: unknown[] } }>('rank/top', { pagesize: limit })
      const out: MusicPlaylistSummary[] = []
      for (const item of rankTop.data?.list ?? []) {
        const row = item as Record<string, unknown>
        const id = row.rankid != null ? String(row.rankid) : ''
        const title = typeof row.rankname === 'string' ? row.rankname : ''
        if (!id || !title) continue
        out.push({
          id: `rank:${id}`,
          title,
          coverUrl: typeof row.img_9 === 'string' ? String(row.img_9).replace('{size}', '240').replace('http://', 'https://') : undefined
        })
      }
      if (out.length) return out.slice(0, limit)
    } catch {
      /* theme fallback */
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
    for (const path of ['personal_fm', 'fm/recommend', 'fm/songs'] as const) {
      try {
        const params =
          path === 'personal_fm' ? { action: 'play' } : path === 'fm/songs' ? {} : {}
        const data = await this.invoke<{ data?: unknown }>(path, params)
        const tracks = mapKugouSongs(extractSongRows(data.data ?? data))
        if (tracks.length) return tracks
      } catch {
        /* try next */
      }
    }
    return []
  }

  async trashPersonalFm(songId: string): Promise<void> {
    const { albumAudioId, hash } = parseKugouVideoId(songId)
    await this.invoke('personal_fm', {
      action: 'garbage',
      hash,
      songid: albumAudioId
    })
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

  async getRecommendSongs(limit = 24): Promise<NormalizedTrack[]> {
    const data = await this.invoke<{ data?: { song_list?: unknown[] } }>('recommend/songs')
    return mapKugouSongs(data.data?.song_list ?? []).slice(0, limit)
  }

  async getStyleRecommend(limit = 24): Promise<NormalizedTrack[]> {
    const data = await this.invoke<{ data?: { song_list?: unknown[] } }>('everyday/style/recommend')
    return mapKugouSongs(data.data?.song_list ?? []).slice(0, limit)
  }

  async getTopCardTracks(cardId = 1, limit = 24): Promise<NormalizedTrack[]> {
    const data = await this.invoke<{ data?: { song_list?: unknown[] } }>('top/card', { card_id: cardId })
    return mapKugouSongs(data.data?.song_list ?? []).slice(0, limit)
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
    limit = 30,
    _offset = 0
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

  private async resolveFavPlaylist(): Promise<{ listId: string; globalId: string } | null> {
    const playlists = await this.getUserPlaylists()
    const fav = playlists.find((p) => /我喜欢|收藏|最爱|默认/.test(p.title))
    if (!fav) return null
    const listId = fav.listId ?? fav.id
    return { listId, globalId: fav.id }
  }

  async likeSong(songId: string, like: boolean): Promise<void> {
    if (!this.session.getMusicU()) throw new Error('请先登录酷狗账号')
    const fav = await this.resolveFavPlaylist()
    if (!fav) throw new Error('未找到「我喜欢」歌单')

    const { albumAudioId, hash, albumId } = parseKugouVideoId(songId)
    if (like) {
      let title = ''
      try {
        const detail = await this.getSongDetail(songId)
        title = detail?.title ?? ''
      } catch {
        /* ignore */
      }
      const payload = `${title}|${hash}|${albumId}|${albumAudioId}`
      await this.invoke('playlist/tracks/add', { listid: fav.listId, data: payload })
      return
    }

    const raw = await this.invoke<{ data?: { info?: unknown[]; lists?: unknown[] } }>('playlist/track/all', {
      id: fav.globalId,
      pagesize: 500
    })
    const fileIds: string[] = []
    for (const item of raw.data?.info ?? raw.data?.lists ?? []) {
      const row = item as Record<string, unknown>
      const mixId = String(
        pickNumber(row, 'album_audio_id', 'mixsongid', 'MixSongID', 'Audioid') ?? ''
      )
      const rowHash = pickHash(row)
      if (mixId !== albumAudioId && rowHash !== hash) continue
      const fid = row.fileid ?? row.file_id
      if (fid != null) fileIds.push(String(fid))
    }
    if (!fileIds.length) return
    await this.invoke('playlist/tracks/del', { listid: fav.listId, fileids: fileIds.join(',') })
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
          subscribedDjs: false,
          personalFm: true,
          playlistEdit: true,
          cloudUpload: false,
          comments: true,
          mv: true,
          sceneRadio: true
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
        subscribedDjs: false,
        personalFm: true,
        playlistEdit: true,
        cloudUpload: false,
        comments: true,
        mv: true,
        sceneRadio: true
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
    const [daily, fm, newSongs, toplists, playlists, recommended, styled, cardTracks] = await Promise.all([
      this.getDailyRecommend().catch(() => []),
      this.getPersonalFm().catch(() => []),
      this.getNewSongs(24).catch(() => []),
      this.getToplists().catch(() => []),
      this.getPlaylistSummaries('0', 12).catch(() => []),
      this.getRecommendSongs(20).catch(() => []),
      this.getStyleRecommend(20).catch(() => []),
      this.getTopCardTracks(1, 16).catch(() => [])
    ])

    let chartTracks: NormalizedTrack[] = []
    for (const list of toplists.slice(0, 3)) {
      if (chartTracks.length >= 24) break
      const rows = await this.getToplistTracks(list.id, 24).catch(() => [])
      chartTracks = dedupeTracks([...chartTracks, ...rows])
    }
    if (!chartTracks.length) {
      chartTracks = dedupeTracks([
        ...cardTracks,
        ...newSongs.slice(0, 24),
        ...recommended.slice(0, 16),
        ...styled.slice(0, 12),
        ...daily.slice(0, 12)
      ]).slice(0, 40)
    }

    let chartPlaylists = playlists.map((p) => ({
      browseId: p.id.startsWith('rank:')
        ? `kugou:toplist:${p.id.slice('rank:'.length)}`
        : `kugou:playlist:${p.id}`,
      title: p.title,
      coverUrl: p.coverUrl,
      trackCount: p.trackCount
    }))
    if (!chartPlaylists.length && toplists.length) {
      chartPlaylists = mapToplistChartCards(toplists).slice(0, 12)
    }

    const forYou = dedupeTracks([
      ...daily,
      ...recommended,
      ...styled,
      ...cardTracks,
      ...newSongs.slice(0, 16)
    ]).slice(0, 32)

    const trending = dedupeTracks([
      ...fm,
      ...daily,
      ...chartTracks,
      ...recommended
    ]).slice(0, 32)

    return {
      forYou: forYou.length ? forYou : chartTracks.slice(0, 16),
      trending: trending.length ? trending : forYou.slice(0, 16),
      newReleases: newSongs,
      chartTracks,
      chartPlaylists
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

  async createPlaylist(name: string): Promise<MusicPlaylistSummary> {
    if (!this.session.getMusicU()) throw new Error('请先登录')
    const data = await this.invoke<{ data?: Record<string, unknown> }>('playlist/add', {
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
    if (!this.session.getMusicU()) throw new Error('请先登录')
    const rawId = parseBrowseId(playlistId)?.id ?? playlistId
    const playlists = await this.getUserPlaylists()
    const target = playlists.find((p) => p.id === rawId)
    const listId = target?.listId ?? rawId
    await this.invoke('playlist/del', { listid: listId })
  }

  async addPlaylistTracks(playlistId: string, songIds: string[]): Promise<void> {
    if (!this.session.getMusicU()) throw new Error('请先登录')
    const rawId = parseBrowseId(playlistId)?.id ?? playlistId
    const playlists = await this.getUserPlaylists()
    const target = playlists.find((p) => p.id === rawId)
    const listId = target?.listId ?? rawId
    const chunks: string[] = []
    for (const songId of songIds) {
      const { albumAudioId, hash, albumId } = parseKugouVideoId(songId)
      let title = ''
      try {
        const detail = await this.getSongDetail(songId)
        title = detail?.title ?? ''
      } catch {
        /* ignore */
      }
      chunks.push(`${title}|${hash}|${albumId}|${albumAudioId}`)
    }
    if (!chunks.length) return
    await this.invoke('playlist/tracks/add', { listid: listId, data: chunks.join(',') })
  }

  async removePlaylistTracks(playlistId: string, songIds: string[]): Promise<void> {
    if (!this.session.getMusicU()) throw new Error('请先登录')
    const rawId = parseBrowseId(playlistId)?.id ?? playlistId
    const playlists = await this.getUserPlaylists()
    const target = playlists.find((p) => p.id === rawId)
    const listId = target?.listId ?? rawId
    const globalId = target?.id ?? rawId
    const raw = await this.invoke<{ data?: { info?: unknown[]; lists?: unknown[] } }>('playlist/track/all', {
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
    await this.invoke('playlist/tracks/del', { listid: listId, fileids: fileIds.join(',') })
  }

  async followArtist(artistId: string, follow: boolean): Promise<void> {
    if (!this.session.getMusicU()) throw new Error('请先登录')
    const rawId = parseBrowseId(artistId)?.id ?? artistId
    if (follow) {
      await this.invoke('artist/follow', { id: rawId })
    } else {
      await this.invoke('artist/unfollow', { id: rawId })
    }
  }

  async getSongComments(songId: string, page = 1): Promise<MusicSongCommentPage> {
    const { albumAudioId } = parseKugouVideoId(songId)
    const data = await this.invoke<{ comments?: unknown[]; total?: number }>('comment/music', {
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
    const data = await this.invoke<{ data?: { info?: unknown[]; lists?: unknown[] } }>('video/detail', {
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
    const data = await this.invoke<{ data?: { info?: Array<{ mvdata?: Array<{ downurl?: string }> }> } }>(
      'kmr/audio/mv',
      { video_id: mvId }
    )
    const url = data.data?.info?.[0]?.mvdata?.[0]?.downurl
    if (!url) return null
    return { url, format: url.includes('.mp4') ? 'mp4' : 'mp3' }
  }

  async getRadioCategories(): Promise<MusicRadioCategory[]> {
    const data = await this.invoke<{ data?: { info?: unknown[]; lists?: unknown[] } }>('scene/module')
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
    const data = await this.invoke<{ data?: { info?: unknown[]; lists?: unknown[] } }>('scene/music', {
      id: categoryId,
      pagesize: limit
    })
    return mapKugouSongs(data.data?.info ?? data.data?.lists ?? []).slice(0, limit)
  }

  async resolveCloudStream(songId: string, meta?: { name?: string }): Promise<MusicStreamPick | null> {
    const { albumAudioId, hash } = parseKugouVideoId(songId)
    const data = await this.invoke<{ url?: string | string[] }>('user/cloud/url', {
      hash,
      album_audio_id: albumAudioId,
      name: meta?.name ?? ''
    })
    const url = pickKugouStreamUrl(data)
    if (!url) return null
    return { url, format: url.includes('.m4a') || url.includes('.mp4') ? 'mp4' : 'mp3' }
  }
}
