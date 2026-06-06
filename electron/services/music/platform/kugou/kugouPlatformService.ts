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
  mapToplistSummary,
  mapKugouArtistDetail,
  mapKugouArtistPhotos,
  extractKugouList,
  parseBrowseId,
  parseKugouVideoId,
  pickHash,
  pickNumber
} from './mapper'
import { buildKugouDiscoverFeed } from './kugouDiscoverFeed'
import { KugouPlatformSocialOps } from './kugouPlatformSocial'
import { fetchKugouSubscribed, fetchKugouUserProfile } from './kugouUserProfile'
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

export class KugouPlatformService implements IMusicPlatformService {
  readonly platformId = 'kugou' as const
  private readonly gateway: IMusicPlatformGateway
  private readonly session: PlatformSessionStore
  private proxy = ''
  private deviceReady: Promise<void> | null = null
  private readonly socialOps = new KugouPlatformSocialOps(this as never)

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

  async getNewAlbums(limit = 12, page = 1): Promise<MusicSearchResult['albums']> {
    const data = await this.invoke<{ data?: { info?: unknown[] } }>('top/album', {
      pagesize: limit,
      page: Math.max(1, page)
    })
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
    offset = 0
  ): Promise<MusicSearchResult['artists']> {
    const initials = ['', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'N', 'P', 'Q', 'R', 'S', 'T', 'W', 'X', 'Y', 'Z']
    const pickInitial = initial || initials[Math.floor(offset / Math.max(1, limit)) % initials.length] || ''
    const page = Math.floor(offset / Math.max(1, limit)) + 1
    const data = await this.invoke<{ data?: { info?: unknown[] } }>('artist/lists', {
      type: type || (page % 4) + 1,
      pagesize: limit,
      page,
      initial: pickInitial || undefined
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

  private async fetchKugouArtistPhotos(tracks: NormalizedTrack[]): Promise<
    import('../../../../../src/shared/types/music').MusicArtistPhoto[]
  > {
    const track = tracks[0]
    if (!track) return []
    const { albumAudioId, hash, albumId } = parseKugouVideoId(track.videoId)
    if (!hash) return []
    try {
      const images = await this.invoke('images', {
        hash,
        album_audio_id: albumAudioId || '0',
        album_id: albumId || '0',
        count: 24
      })
      return mapKugouArtistPhotos(images)
    } catch {
      return []
    }
  }

  async getArtist(browseId: string): Promise<import('../../../../../src/shared/types/music').MusicArtistPayload> {
    const rawId = parseBrowseId(browseId)?.id ?? browseId
    const [detail, songs, albums] = await Promise.all([
      this.invoke('artist/detail', { id: rawId }),
      this.invoke('artist/audios', { id: rawId, pagesize: 50 }),
      this.invoke('artist/albums', { id: rawId, pagesize: 20 })
    ])
    const profile = mapKugouArtistDetail(detail)
    const tracks = mapKugouSongs(extractKugouList((songs as { data?: unknown }).data))
    const photos = await this.fetchKugouArtistPhotos(tracks)
    const albumRows = extractKugouList((albums as { data?: unknown }).data)
    return {
      ...profile,
      tracks,
      photos: photos.length ? photos : undefined,
      albums: albumRows.map((a) => {
        const row = a as Record<string, unknown>
        return {
          browseId: `kugou:album:${row.album_id ?? row.AlbumID}`,
          title: String(row.album_name ?? row.AlbumName ?? ''),
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
    return fetchKugouUserProfile(this as never)
  }

  async getSubscribed(kind: MusicPlatformSubscribedKind, limit = 30): Promise<MusicPlatformSubscribedItem[]> {
    return fetchKugouSubscribed(this as never, kind, limit)
  }

  async buildDiscoverFeed(): Promise<MusicDiscoverFeed> {
    return buildKugouDiscoverFeed(this)
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
    return this.socialOps.createPlaylist(name)
  }

  async deletePlaylist(playlistId: string): Promise<void> {
    return this.socialOps.deletePlaylist(playlistId)
  }

  async addPlaylistTracks(playlistId: string, songIds: string[]): Promise<void> {
    return this.socialOps.addPlaylistTracks(playlistId, songIds)
  }

  async removePlaylistTracks(playlistId: string, songIds: string[]): Promise<void> {
    return this.socialOps.removePlaylistTracks(playlistId, songIds)
  }

  async followArtist(artistId: string, follow: boolean): Promise<void> {
    return this.socialOps.followArtist(artistId, follow)
  }

  async getSongComments(songId: string, page = 1): Promise<MusicSongCommentPage> {
    return this.socialOps.getSongComments(songId, page)
  }

  async getMvDetail(browseId: string): Promise<MusicMvDetail | null> {
    return this.socialOps.getMvDetail(browseId)
  }

  async resolveMvStream(mvId: string): Promise<MusicStreamPick | null> {
    return this.socialOps.resolveMvStream(mvId)
  }

  async getRadioCategories(): Promise<MusicRadioCategory[]> {
    return this.socialOps.getRadioCategories()
  }

  async getRadioTracks(categoryId: string, limit = 30): Promise<NormalizedTrack[]> {
    return this.socialOps.getRadioTracks(categoryId, limit)
  }

  async resolveCloudStream(songId: string, meta?: { name?: string }): Promise<MusicStreamPick | null> {
    return this.socialOps.resolveCloudStream(songId, meta)
  }
}
