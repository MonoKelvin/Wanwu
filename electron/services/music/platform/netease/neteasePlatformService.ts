import NeteaseCloudMusicApi from '@neteasecloudmusicapienhanced/api'
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
  MusicSearchType,
  MusicStreamPick,
  MusicToplistSummary
} from '../types'
import {
  buildChartsPayload,
  mapCloudSearchResult,
  mapMoodPlaylist,
  mapNeteaseSong,
  mapNeteaseSongs,
  mapPlaylistCatlist,
  mapPlaylistSummary,
  mapToplistChartCards,
  mapToplistSummary,
  parseBrowseId
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

function extractMusicU(cookieStr: string | undefined): string | undefined {
  if (!cookieStr) return undefined
  const m = cookieStr.match(/MUSIC_U=([^;]+)/)
  return m?.[1]
}

export class NeteasePlatformService implements IMusicPlatformService {
  readonly platformId = 'netease' as const
  private readonly gateway: IMusicPlatformGateway
  private readonly session: PlatformSessionStore
  private realIp = ''
  private proxy = ''

  constructor(basePath: string) {
    this.gateway = new DynamicModuleGateway('netease', '网易云', NeteaseCloudMusicApi as Record<string, unknown>)
    this.session = new PlatformSessionStore('netease', basePath)
  }

  configure(opts: { realIp?: string; proxy?: string }): void {
    this.realIp = opts.realIp?.trim() ?? ''
    this.proxy = opts.proxy?.trim() ?? ''
  }

  private invoke<T>(path: string, params: Record<string, unknown> = {}, noCookie = false): Promise<T> {
    return this.gateway.invoke<T>(path, params, {
      cookie: noCookie ? {} : this.session.cookieObject(),
      realIp: this.realIp || undefined,
      proxy: this.proxy || undefined
    })
  }

  getSessionSnapshot(): MusicPlatformSessionSnapshot {
    return this.session.snapshot()
  }

  async getLoginStatus(): Promise<MusicPlatformLoginStatus> {
    if (!this.session.getMusicU()) {
      return { loggedIn: false, loginType: 'none' }
    }
    const cached = this.session.snapshot()
    try {
      const data = await this.invoke<{ data?: { account?: { id?: number }; profile?: { nickname?: string; avatarUrl?: string } } }>(
        'login/status',
        { timestamp: Date.now() }
      )
      const account = data.data?.account
      const profile = data.data?.profile
      if (!account?.id) {
        this.session.clear()
        return { loggedIn: false, loginType: 'none' }
      }
      this.session.setProfile({
        userId: account.id,
        nickname: profile?.nickname,
        avatarUrl: profile?.avatarUrl
      })
      return {
        loggedIn: true,
        loginType: 'normal',
        userId: account.id,
        nickname: profile?.nickname ?? cached.nickname,
        avatarUrl: profile?.avatarUrl ?? cached.avatarUrl
      }
    } catch {
      if (!cached.musicU) {
        return { loggedIn: false, loginType: 'none' }
      }
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

  setMusicUCookie(musicU: string): void {
    this.session.setMusicU(musicU)
  }

  async refreshLoginIfNeeded(): Promise<void> {
    if (!this.session.needsRefresh()) return
    try {
      await this.invoke('login/refresh', { timestamp: Date.now() })
      this.session.markRefreshed()
    } catch {
      /* ignore */
    }
  }

  async loginQrKey(): Promise<MusicPlatformQrLoginState> {
    const keyData = await this.invoke<{ data?: { unikey?: string } }>(
      'login/qr/key',
      { timestamp: Date.now() },
      true
    )
    const key = keyData.data?.unikey
    if (!key) throw new Error('无法获取二维码 key')
    const createData = await this.invoke<{ data?: { qrurl?: string; qrimg?: string } }>(
      'login/qr/create',
      { key, qrimg: true, timestamp: Date.now() },
      true
    )
    return {
      key,
      qrUrl: createData.data?.qrurl ?? `https://music.163.com/login?codekey=${encodeURIComponent(key)}`,
      qrImageBase64: createData.data?.qrimg
    }
  }

  async loginQrCheck(key: string): Promise<{ status: number; message?: string; cookie?: string }> {
    const data = await this.invoke<{ code?: number; message?: string; cookie?: string }>(
      'login/qr/check',
      { key, timestamp: Date.now() },
      true
    )
    const code = data.code ?? 801
    if (code === 803) {
      const musicU = extractMusicU(data.cookie)
      if (musicU) this.session.setMusicU(musicU)
      await this.getLoginStatus()
    }
    return { status: code, message: data.message, cookie: data.cookie }
  }

  sendPhoneCaptcha(phone: string, countryCode = 86): Promise<unknown> {
    return this.invoke('captcha/sent', { phone, ctcode: countryCode, timestamp: Date.now() }, true)
  }

  async loginPhone(phone: string, captcha: string, countryCode = 86): Promise<unknown> {
    const data = await this.invoke<{ cookie?: string }>(
      'login/cellphone',
      { phone, captcha, ctcode: countryCode, timestamp: Date.now() },
      true
    )
    const musicU = extractMusicU(data.cookie)
    if (musicU) {
      this.session.setMusicU(musicU)
      await this.getLoginStatus()
    }
    return data
  }

  async logout(): Promise<void> {
    try {
      await this.invoke('logout', { timestamp: Date.now() })
    } finally {
      this.session.clear()
    }
  }

  async searchDefault(): Promise<string> {
    const data = await this.invoke<{ data?: { realkeyword?: string } }>('search/default', { timestamp: Date.now() })
    return data.data?.realkeyword ?? ''
  }

  async searchHot(limit = 10): Promise<MusicHotSearchItem[]> {
    const data = await this.invoke<{ data?: Array<{ searchWord?: string; score?: number }> }>('search/hot/detail')
    return (data.data ?? []).slice(0, limit).map((h) => ({
      keyword: h.searchWord ?? '',
      score: h.score
    }))
  }

  async searchSuggest(keywords: string): Promise<MusicSearchSuggestItem[]> {
    const data = await this.invoke<{ result?: { allMatch?: Array<{ keyword?: string }> } }>('search/suggest', {
      keywords,
      type: 'mobile'
    })
    return (data.result?.allMatch ?? []).map((m) => ({ keyword: m.keyword ?? '' })).filter((m) => m.keyword)
  }

  async cloudSearch(
    keywords: string,
    type: MusicSearchType,
    limit = 30,
    offset = 0
  ): Promise<MusicSearchResult> {
    const data = await this.invoke('cloudsearch', { keywords, type, limit, offset })
    return mapCloudSearchResult(data, type)
  }

  async resolveStream(songId: string, quality: MusicPlatformQuality): Promise<MusicStreamPick | null> {
    const id = Number(songId)
    if (!Number.isFinite(id)) return null
    let data: { data?: Array<{ url?: string; br?: number; freeTrialInfo?: unknown }> }
    if (quality === 'dolby') {
      data = await this.invoke('song/url', { id, br: 999000, immerseType: 'c51', timestamp: Date.now() })
    } else {
      data = await this.invoke('song/url/v1', { id, level: quality, timestamp: Date.now() })
    }
    const hit = data.data?.[0]
    if (!hit?.url) return null
    return {
      url: hit.url,
      format: hit.url.includes('.m4a') || hit.url.includes('.mp4') ? 'mp4' : 'mp3',
      br: hit.br,
      isTrial: !!hit.freeTrialInfo
    }
  }

  async getLyrics(songId: string): Promise<MusicLyricsResult> {
    const data = await this.invoke<{ lrc?: { lyric?: string }; lyric?: string }>('lyric/new', { id: songId })
    return {
      lrc: data.lrc?.lyric,
      plain: data.lyric
    }
  }

  async getSongDetail(songId: string): Promise<NormalizedTrack | null> {
    const data = await this.invoke<{ songs?: unknown[] }>('song/detail', {
      ids: songId,
      timestamp: Date.now()
    })
    const first = data.songs?.[0]
    return first ? mapNeteaseSong(first as Record<string, unknown>) : null
  }

  async getPlaylistTracks(playlistId: string): Promise<NormalizedTrack[]> {
    const rawId = parseBrowseId(playlistId)?.id ?? playlistId
    try {
      const data = await this.invoke<{ songs?: unknown[] }>('playlist/track/all', { id: rawId, limit: 500 })
      return mapNeteaseSongs(data.songs ?? [])
    } catch {
      const detail = await this.invoke<{ playlist?: { tracks?: unknown[] } }>('playlist/detail', { id: rawId })
      return mapNeteaseSongs(detail.playlist?.tracks ?? [])
    }
  }

  async getPlaylistSummaries(category = '全部', limit = 30): Promise<MusicPlaylistSummary[]> {
    const data = await this.invoke<{ playlists?: unknown[] }>('top/playlist', {
      cat: category,
      limit,
      offset: 0,
      order: 'hot'
    })
    const out: MusicPlaylistSummary[] = []
    for (const p of data.playlists ?? []) {
      const mapped = mapPlaylistSummary(p as Record<string, unknown>)
      if (mapped) out.push(mapped)
    }
    return out
  }

  async getToplists(): Promise<MusicToplistSummary[]> {
    const data = await this.invoke<{ list?: unknown[] }>('toplist/detail')
    const out: MusicToplistSummary[] = []
    for (const t of data.list ?? []) {
      const mapped = mapToplistSummary(t as Record<string, unknown>)
      if (mapped) out.push(mapped)
    }
    return out
  }

  async getToplistTracks(toplistId: string, limit = 50): Promise<NormalizedTrack[]> {
    const rawId = parseBrowseId(toplistId)?.id ?? toplistId
    const data = await this.invoke<{ playlist?: { tracks?: unknown[] } }>('playlist/detail', { id: rawId, limit })
    return mapNeteaseSongs(data.playlist?.tracks ?? []).slice(0, limit)
  }

  async getDailyRecommend(): Promise<NormalizedTrack[]> {
    const data = await this.invoke<{ data?: { dailySongs?: unknown[] } }>('recommend/songs')
    return mapNeteaseSongs(data.data?.dailySongs ?? [])
  }

  async getPersonalFm(): Promise<NormalizedTrack[]> {
    const data = await this.invoke<{ data?: unknown[] }>('personal_fm')
    return mapNeteaseSongs(data.data ?? [])
  }

  async trashPersonalFm(songId: string): Promise<void> {
    await this.invoke('fm_trash', { id: songId })
  }

  async getPersonalizedPlaylists(limit = 10): Promise<MusicMoodPlaylist[]> {
    const data = await this.invoke<{ result?: unknown[] }>('personalized', { limit })
    const out: MusicMoodPlaylist[] = []
    for (const p of data.result ?? []) {
      const mapped = mapMoodPlaylist(p as Record<string, unknown>)
      if (mapped) out.push(mapped)
    }
    return out
  }

  async getNewSongs(limit = 20): Promise<NormalizedTrack[]> {
    const data = await this.invoke<{ data?: unknown[] }>('top/song', { type: 0 })
    return mapNeteaseSongs((data.data ?? []).slice(0, limit))
  }

  async getNewAlbums(limit = 12): Promise<MusicSearchResult['albums']> {
    const data = await this.invoke<{ albums?: unknown[] }>('album/new', { limit })
    const out: MusicSearchResult['albums'] = []
    for (const a of data.albums ?? []) {
      const row = a as Record<string, unknown>
      if (row.id == null) continue
      out.push({
        browseId: `netease:album:${row.id}`,
        title: String(row.name ?? ''),
        artist: String(row.artist?.name ?? row.artistName ?? ''),
        coverUrl: typeof row.picUrl === 'string' ? row.picUrl : undefined
      })
    }
    return out
  }

  async getArtistList(
    area = '-1',
    type = -1,
    initial = '-1',
    limit = 30
  ): Promise<MusicSearchResult['artists']> {
    const data = await this.invoke<{ artists?: unknown[] }>('artist/list', {
      type,
      area,
      initial,
      limit
    })
    const out: MusicSearchResult['artists'] = []
    for (const a of data.artists ?? []) {
      const row = a as Record<string, unknown>
      if (row.id == null) continue
      out.push({
        browseId: `netease:artist:${row.id}`,
        name: String(row.name ?? ''),
        coverUrl: typeof row.picUrl === 'string' ? row.picUrl : undefined
      })
    }
    return out
  }

  async getAlbum(browseId: string): Promise<{ album: unknown; tracks: NormalizedTrack[] }> {
    const id = parseBrowseId(browseId)?.id ?? browseId
    const data = await this.invoke<{ album?: unknown; songs?: unknown[] }>('album', { id })
    return { album: data.album, tracks: mapNeteaseSongs(data.songs ?? []) }
  }

  async getArtist(browseId: string) {
    const id = parseBrowseId(browseId)?.id ?? browseId
    const [detail, songs] = await Promise.all([
      this.invoke<{ artist?: Record<string, unknown>; hotAlbums?: unknown[] }>('artist/detail', { id }),
      this.invoke<{ songs?: unknown[] }>('artist/songs', { id, order: 'hot', limit: 50 })
    ])
    const artist = detail.artist ?? {}
    return {
      name: String(artist.name ?? ''),
      description: typeof artist.briefDesc === 'string' ? artist.briefDesc : undefined,
      coverUrl: typeof artist.picUrl === 'string' ? artist.picUrl : undefined,
      tracks: mapNeteaseSongs(songs.songs ?? []),
      albums: (detail.hotAlbums ?? []).map((a) => {
        const row = a as Record<string, unknown>
        return {
          browseId: `netease:album:${row.id}`,
          title: String(row.name ?? ''),
          coverUrl: typeof row.picUrl === 'string' ? row.picUrl : undefined
        }
      })
    }
  }

  async getMoodCategories(): Promise<MusicMoodCategory[]> {
    const data = await this.invoke('playlist/catlist')
    return mapPlaylistCatlist(data)
  }

  async getUserPlaylists(): Promise<MusicPlaylistSummary[]> {
    const uid = this.session.snapshot().userId
    if (!uid) return []
    const data = await this.invoke<{ playlist?: unknown[] }>('user/playlist', { uid, limit: 50 })
    const out: MusicPlaylistSummary[] = []
    for (const p of data.playlist ?? []) {
      const mapped = mapPlaylistSummary(p as Record<string, unknown>)
      if (mapped) out.push(mapped)
    }
    return out
  }

  async getLikedSongIds(): Promise<number[]> {
    const uid = this.session.snapshot().userId
    if (!uid) return []
    const data = await this.invoke<{ ids?: number[] }>('likelist', { uid })
    return data.ids ?? []
  }

  async likeSong(songId: string, like: boolean): Promise<void> {
    await this.invoke('like', { id: songId, like, timestamp: Date.now() })
  }

  async getUserCloud(limit = 50): Promise<NormalizedTrack[]> {
    const data = await this.invoke<{ data?: unknown[] }>('user/cloud', { limit })
    return mapNeteaseSongs(data.data ?? [])
  }

  async getUserProfile(): Promise<MusicPlatformUserProfile> {
    const status = await this.getLoginStatus()
    if (!status.loggedIn || !status.userId) {
      return {
        platform: 'netease',
        loggedIn: false,
        capabilities: {
          likedSongs: true,
          cloud: true,
          subscribedAlbums: true,
          subscribedArtists: true,
          subscribedMvs: true,
          subscribedDjs: true
        }
      }
    }
    const uid = status.userId
    const [detailRes, subcountRes, likedIds, playlists] = await Promise.all([
      this.invoke<{ profile?: Record<string, unknown> }>('user/detail', { uid }),
      this.invoke<Record<string, number>>('user/subcount', { uid }).catch(() => ({})),
      this.getLikedSongIds().catch(() => [] as number[]),
      this.getUserPlaylists().catch(() => [])
    ])
    const profile = detailRes.profile ?? (detailRes as Record<string, unknown>)
    const nickname = String(profile.nickname ?? status.nickname ?? '')
    const avatarUrl = typeof profile.avatarUrl === 'string' ? profile.avatarUrl : status.avatarUrl
    const signature = typeof profile.signature === 'string' ? profile.signature : undefined
    const level = typeof profile.level === 'number' ? profile.level : undefined
    const vipType = typeof profile.vipType === 'number' ? profile.vipType : undefined

    this.session.setProfile({ userId: uid, nickname, avatarUrl })

    const created = playlists.filter((p) => p.creatorName === nickname || !p.creatorName).length
    return {
      platform: 'netease',
      loggedIn: true,
      userId: uid,
      nickname,
      avatarUrl,
      signature,
      level,
      vipType,
      stats: {
        likedSongCount: likedIds.length,
        playlistCount: playlists.length,
        createdPlaylistCount: subcountRes.createdPlaylistCount ?? created,
        subscribedPlaylistCount: subcountRes.subPlaylistCount,
        artistCount: subcountRes.artistCount,
        albumCount: subcountRes.albumCount,
        mvCount: subcountRes.mvCount,
        djCount: subcountRes.djRadioCount
      },
      capabilities: {
        likedSongs: true,
        cloud: true,
        subscribedAlbums: true,
        subscribedArtists: true,
        subscribedMvs: true,
        subscribedDjs: true
      }
    }
  }

  async getSubscribed(kind: MusicPlatformSubscribedKind, limit = 30): Promise<MusicPlatformSubscribedItem[]> {
    const uid = this.session.snapshot().userId
    if (!uid) return []
    const path =
      kind === 'album'
        ? 'album/sublist'
        : kind === 'artist'
          ? 'artist/sublist'
          : kind === 'mv'
            ? 'mv/sublist'
            : 'dj/sublist'
    const data = await this.invoke<{ data?: unknown[] }>(path, { uid, limit, offset: 0 })
    const rows = data.data ?? []
    return rows
      .map((row) => {
        const item = row as Record<string, unknown>
        if (kind === 'album') {
          const id = item.id
          if (id == null) return null
          const artist = item.artist as Record<string, unknown> | undefined
          return {
            id: String(id),
            title: String(item.name ?? ''),
            subtitle: artist?.name ? String(artist.name) : undefined,
            coverUrl: typeof item.picUrl === 'string' ? item.picUrl : undefined,
            browseId: `netease:album:${id}`
          }
        }
        if (kind === 'artist') {
          const id = item.id
          if (id == null) return null
          return {
            id: String(id),
            title: String(item.name ?? ''),
            coverUrl: typeof item.picUrl === 'string' ? item.picUrl : undefined,
            browseId: `netease:artist:${id}`
          }
        }
        if (kind === 'mv') {
          const id = item.id ?? item.vid
          if (id == null) return null
          const artistName = item.artistName ?? (item.artist as Record<string, unknown> | undefined)?.name
          return {
            id: String(id),
            title: String(item.name ?? item.title ?? ''),
            subtitle: artistName ? String(artistName) : undefined,
            coverUrl: typeof item.cover === 'string' ? item.cover : typeof item.picUrl === 'string' ? item.picUrl : undefined,
            browseId: `netease:mv:${id}`
          }
        }
        const id = item.id
        if (id == null) return null
        return {
          id: String(id),
          title: String(item.name ?? ''),
          subtitle: typeof item.dj === 'object' && item.dj ? String((item.dj as Record<string, unknown>).brand ?? '') : undefined,
          coverUrl: typeof item.picUrl === 'string' ? item.picUrl : undefined,
          browseId: `netease:dj:${id}`
        }
      })
      .filter((item): item is MusicPlatformSubscribedItem => item != null)
      .slice(0, limit)
  }

  async buildDiscoverFeed(): Promise<MusicDiscoverFeed> {
    const [daily, fm, personalized, newSongs, toplists, hotPlaylists] = await Promise.allSettled([
      this.getDailyRecommend(),
      this.getPersonalFm(),
      this.getPersonalizedPlaylists(8),
      this.getNewSongs(24),
      this.getToplists(),
      this.getPlaylistSummaries('华语', 12)
    ])

    const trending =
      daily.status === 'fulfilled' && daily.value.length
        ? daily.value
        : fm.status === 'fulfilled'
          ? fm.value
          : []

    const forYou = fm.status === 'fulfilled' ? fm.value : trending

    const chartTracks =
      toplists.status === 'fulfilled' && toplists.value[0]
        ? await this.getToplistTracks(toplists.value[0].id, 40).catch(() => [])
        : []

    const chartPlaylists =
      toplists.status === 'fulfilled'
        ? mapToplistChartCards({ list: toplists.value })
        : []

    const newSongsVal = newSongs.status === 'fulfilled' ? newSongs.value : []
    let forYouOut = forYou.slice(0, 24)
    let trendingOut = trending.slice(0, 32)
    if (!forYouOut.length) {
      forYouOut = newSongsVal.slice(0, 16).length ? newSongsVal.slice(0, 16) : chartTracks.slice(0, 16)
    }
    if (!trendingOut.length) {
      trendingOut = chartTracks.slice(0, 16)
    }

    return {
      forYou: forYouOut,
      trending: trendingOut,
      newReleases: newSongsVal.slice(0, 24),
      chartTracks,
      chartPlaylists: [
        ...chartPlaylists,
        ...(hotPlaylists.status === 'fulfilled'
          ? hotPlaylists.value.map((p) => ({
              browseId: `netease:playlist:${p.id}`,
              playlistId: p.id,
              title: p.title,
              coverUrl: p.coverUrl
            }))
          : [])
      ]
    }
  }

  async getTrending(): Promise<MusicTrendingPayload> {
    const tracks = await this.getDailyRecommend()
    if (tracks.length) return { country: 'CN', tracks }
    const fm = await this.getPersonalFm()
    return { country: 'CN', tracks: fm }
  }

  async getCharts(): Promise<MusicChartsPayload> {
    const toplists = await this.getToplists()
    const tracks = toplists[0] ? await this.getToplistTracks(toplists[0].id, 30) : []
    return buildChartsPayload(toplists, tracks)
  }
}
