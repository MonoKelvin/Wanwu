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
  mapNeteaseSongComment,
  mapNeteaseSongs,
  mapPlaylistCatlist,
  mapPlaylistSummary,
  mapToplistChartCards,
  mapToplistSummary,
  parseBrowseId,
  pickNeteaseAlbumArtist
} from './mapper'
import { ensureNeteaseApiReady } from './neteaseApiBootstrap'
import {
  pickStreamFromMatchBody,
  pickStreamFromRows,
  qualityToBitrate
} from './neteaseStream'
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

const PLATFORM_CAPABILITIES = {
  likedSongs: true,
  cloud: true,
  subscribedAlbums: true,
  subscribedArtists: true,
  subscribedMvs: true,
  subscribedDjs: true,
  personalFm: true,
  playlistEdit: true,
  cloudUpload: true,
  comments: true,
  mv: true,
  sceneRadio: true
} as const

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

  private async invoke<T>(
    path: string,
    params: Record<string, unknown> = {},
    noCookie = false
  ): Promise<T> {
    await ensureNeteaseApiReady()
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
    const id = Number(songId.split('|')[0] || songId)
    if (!Number.isFinite(id)) return null

    const fromV1 = await this.resolveStreamV1(id, quality)
    if (fromV1?.url) return fromV1

    const fromLegacy = await this.resolveStreamLegacy(id, quality)
    if (fromLegacy?.url) return fromLegacy

    return this.resolveStreamUnblock(id)
  }

  private async resolveStreamV1(id: number, quality: MusicPlatformQuality): Promise<MusicStreamPick | null> {
    try {
      if (quality === 'dolby') {
        const data = await this.invoke<{ data?: Array<{ url?: string; br?: number; freeTrialInfo?: unknown }> }>(
          'song/url',
          { id, br: 999000, immerseType: 'c51', timestamp: Date.now() }
        )
        return pickStreamFromRows(data.data)
      }
      const data = await this.invoke<{ data?: Array<{ url?: string; br?: number; freeTrialInfo?: unknown }> }>(
        'song/url/v1',
        { id, level: quality, timestamp: Date.now() }
      )
      return pickStreamFromRows(data.data)
    } catch {
      return null
    }
  }

  private async resolveStreamLegacy(id: number, quality: MusicPlatformQuality): Promise<MusicStreamPick | null> {
    try {
      const data = await this.invoke<{ data?: Array<{ url?: string; br?: number; freeTrialInfo?: unknown }> }>(
        'song/url',
        { id, br: qualityToBitrate(quality), timestamp: Date.now() }
      )
      return pickStreamFromRows(data.data)
    } catch {
      return null
    }
  }

  private async resolveStreamUnblock(id: number): Promise<MusicStreamPick | null> {
    try {
      const data = await this.invoke<{ data?: unknown }>('song/url/match', { id, timestamp: Date.now() })
      return pickStreamFromMatchBody(data)
    } catch {
      return null
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
    const rawId = songId.split('|')[0] || songId
    const data = await this.invoke<{ songs?: unknown[] }>('song/detail', {
      ids: String(rawId),
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
    try {
      const data = await this.invoke<{ songs?: unknown[] }>('playlist/track/all', { id: rawId, limit })
      const tracks = mapNeteaseSongs(data.songs ?? [])
      if (tracks.length) return tracks.slice(0, limit)
    } catch {
      /* fallback */
    }
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

  async getNewAlbums(limit = 12, offset = 0): Promise<MusicSearchResult['albums']> {
    const data = await this.invoke<{ albums?: unknown[] }>('album/new', {
      limit,
      offset: Math.max(0, offset)
    })
    const out: MusicSearchResult['albums'] = []
    for (const a of data.albums ?? []) {
      const row = a as Record<string, unknown>
      if (row.id == null) continue
      out.push({
        browseId: `netease:album:${row.id}`,
        title: String(row.name ?? ''),
        artist: pickNeteaseAlbumArtist(row),
        coverUrl: typeof row.picUrl === 'string' ? row.picUrl : undefined
      })
    }
    return out
  }

  async getArtistList(
    area = '-1',
    type = -1,
    initial = '-1',
    limit = 30,
    offset = 0
  ): Promise<MusicSearchResult['artists']> {
    const data = await this.invoke<{ artists?: unknown[] }>('artist/list', {
      type,
      area,
      initial,
      limit,
      offset
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

  private formatNeteaseArtistDesc(data: {
    briefDesc?: string
    introduction?: Array<{ ti?: string; txt?: string }>
  }): string | undefined {
    const parts: string[] = []
    if (typeof data.briefDesc === 'string' && data.briefDesc.trim()) {
      parts.push(data.briefDesc.trim())
    }
    const introList = data.introduction ?? []
    const profile = introList.find((x) => x.ti === '人物简介' || x.ti === '简介')
    if (profile?.txt?.trim()) {
      if (!parts.length || !parts[0]!.includes(profile.txt.slice(0, 40))) {
        parts.push(profile.txt.trim())
      }
    } else if (!parts.length) {
      for (const block of introList) {
        if (block.txt?.trim()) parts.push(`${block.ti ? `${block.ti}：` : ''}${block.txt.trim()}`)
        if (parts.join('\n\n').length > 2400) break
      }
    }
    const text = parts.join('\n\n').trim()
    return text ? text.slice(0, 2400) : undefined
  }

  private collectNeteaseArtistPhotos(
    avatar?: string,
    mvs: Array<{ coverUrl?: string; title: string }> = []
  ): import('../../../../../src/shared/types/music').MusicArtistPhoto[] {
    const urls = new Set<string>()
    const out: import('../../../../../src/shared/types/music').MusicArtistPhoto[] = []
    const push = (raw: string | undefined, title?: string) => {
      if (!raw?.trim()) return
      const url = raw.replace('http://', 'https://')
      if (urls.has(url)) return
      urls.add(url)
      out.push({ url, title })
    }
    if (avatar) push(avatar.replace(/\?.*$/, '') + '?param=1080y1080', '头像')
    for (const mv of mvs) {
      if (mv.coverUrl) push(mv.coverUrl.replace(/\?.*$/, '') + '?param=720y720', mv.title)
    }
    return out
  }

  async getArtist(browseId: string) {
    const id = parseBrowseId(browseId)?.id ?? browseId
    const [detail, songs, albumRes, mvRes, descRes] = await Promise.all([
      this.invoke<{ artist?: Record<string, unknown>; hotAlbums?: unknown[] }>('artist/detail', { id }),
      this.invoke<{ songs?: unknown[] }>('artist/songs', { id, order: 'hot', limit: 50 }),
      this.invoke<{ hotAlbums?: unknown[] }>('artist/album', { id, limit: 30 }).catch(() => ({ hotAlbums: [] })),
      this.invoke<{ mvs?: unknown[] }>('artist/mv', { id, limit: 20 }).catch(() => ({ mvs: [] })),
      this.invoke<{ briefDesc?: string; introduction?: Array<{ ti?: string; txt?: string }> }>('artist/desc', {
        id
      }).catch(() => ({}))
    ])
    const artist = detail.artist ?? {}
    const pic =
      typeof artist.picUrl === 'string'
        ? artist.picUrl
        : typeof artist.img1v1Url === 'string'
          ? artist.img1v1Url
          : typeof artist.avatar === 'string'
            ? artist.avatar
            : undefined
    const albumMap = new Map<string, { browseId: string; title: string; coverUrl?: string }>()
    for (const a of [...(detail.hotAlbums ?? []), ...(albumRes.hotAlbums ?? [])]) {
      const row = a as Record<string, unknown>
      if (row.id == null) continue
      const browseIdKey = `netease:album:${row.id}`
      albumMap.set(browseIdKey, {
        browseId: browseIdKey,
        title: String(row.name ?? ''),
        coverUrl: typeof row.picUrl === 'string' ? row.picUrl : undefined
      })
    }
    const mvs: Array<{ browseId: string; title: string; coverUrl?: string }> = []
    for (const mv of mvRes.mvs ?? []) {
      const row = mv as Record<string, unknown>
      if (row.id == null) continue
      mvs.push({
        browseId: `netease:mv:${row.id}`,
        title: String(row.name ?? row.title ?? 'MV'),
        coverUrl: typeof row.imgurl === 'string' ? row.imgurl : typeof row.cover === 'string' ? row.cover : undefined
      })
    }
    const description =
      this.formatNeteaseArtistDesc(descRes) ??
      (typeof artist.briefDesc === 'string'
        ? artist.briefDesc
        : typeof artist.desc === 'string'
          ? artist.desc
          : undefined)

    const coverUrl = pic ? pic.replace('http://', 'https://') : undefined
    const photos = this.collectNeteaseArtistPhotos(coverUrl, mvs)

    return {
      name: String(artist.name ?? ''),
      description,
      coverUrl,
      tracks: mapNeteaseSongs(songs.songs ?? []),
      albums: [...albumMap.values()],
      mvs,
      photos: photos.length ? photos : undefined
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
        capabilities: { ...PLATFORM_CAPABILITIES }
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
      capabilities: { ...PLATFORM_CAPABILITIES }
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

    const newSongsVal = newSongs.status === 'fulfilled' ? newSongs.value : []
    const personalizedVal = personalized.status === 'fulfilled' ? personalized.value : []
    const toplistSummaries = toplists.status === 'fulfilled' ? toplists.value : []

    let chartTracks: NormalizedTrack[] = []
    if (toplistSummaries[0]) {
      chartTracks = await this.getToplistTracks(toplistSummaries[0].id, 40).catch(() => [])
    }
    if (!chartTracks.length && toplistSummaries[1]) {
      chartTracks = await this.getToplistTracks(toplistSummaries[1].id, 40).catch(() => [])
    }

    const dailyVal = daily.status === 'fulfilled' ? daily.value : []
    const fmVal = fm.status === 'fulfilled' ? fm.value : []

    const trending =
      dailyVal.length > 0
        ? dailyVal
        : fmVal.length > 0
          ? fmVal
          : chartTracks.length > 0
            ? chartTracks
            : newSongsVal

    const forYou =
      newSongsVal.length > 0
        ? newSongsVal
        : dailyVal.length > 0
          ? dailyVal
          : fmVal.length > 0
            ? fmVal
            : chartTracks

    let chartTracksOut =
      chartTracks.length > 0 ? chartTracks : newSongsVal.length > 0 ? newSongsVal.slice(0, 24) : forYou.slice(0, 16)

    const chartPlaylists =
      toplistSummaries.length > 0
        ? mapToplistChartCards({ list: toplistSummaries })
        : personalizedVal.map((p) => ({
            browseId: `netease:playlist:${p.playlistId}`,
            playlistId: p.playlistId,
            title: p.title,
            coverUrl: p.coverUrl
          }))

    let forYouOut = forYou.slice(0, 24)
    let trendingOut = trending.slice(0, 32)
    if (!forYouOut.length) {
      forYouOut = chartTracksOut.slice(0, 16)
    }
    if (!trendingOut.length) {
      trendingOut = chartTracksOut.slice(0, 16)
    }

    const hotPlaylistCards =
      hotPlaylists.status === 'fulfilled'
        ? hotPlaylists.value.map((p) => ({
            browseId: `netease:playlist:${p.id}`,
            playlistId: p.id,
            title: p.title,
            coverUrl: p.coverUrl
          }))
        : []

    if (!forYouOut.length || !trendingOut.length || !chartTracksOut.length) {
      const fallback = await this.fallbackDiscoverTracks(24)
      if (!chartTracksOut.length && fallback.length) {
        chartTracksOut = fallback.slice(0, 24)
      }
      if (!forYouOut.length && fallback.length) {
        forYouOut = fallback.slice(0, 16)
      }
      if (!trendingOut.length && fallback.length) {
        trendingOut = fallback.slice(0, 16)
      }
    }

    return {
      forYou: forYouOut,
      trending: trendingOut,
      newReleases: newSongsVal.length > 0 ? newSongsVal.slice(0, 24) : chartTracksOut.slice(0, 24),
      chartTracks: chartTracksOut,
      chartPlaylists: [...chartPlaylists, ...hotPlaylistCards].slice(0, 20)
    }
  }

  /** 热搜 + 搜索兜底，避免发现页全空 */
  private async fallbackDiscoverTracks(limit = 24): Promise<NormalizedTrack[]> {
    try {
      const hot = await this.searchHot(Math.min(8, limit))
      const tracks: NormalizedTrack[] = []
      const seen = new Set<string>()
      for (const item of hot) {
        if (!item.keyword.trim()) continue
        const result = await this.cloudSearch(item.keyword, MusicSearchType.Song, 4)
        for (const track of result.tracks) {
          if (seen.has(track.trackKey)) continue
          seen.add(track.trackKey)
          tracks.push(track)
          if (tracks.length >= limit) return tracks
        }
      }
      return tracks
    } catch {
      return []
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

  async createPlaylist(name: string): Promise<MusicPlaylistSummary> {
    const data = await this.invoke<{ id?: number }>('playlist/create', { name })
    if (!data.id) throw new Error('创建歌单失败')
    return { id: String(data.id), title: name }
  }

  async deletePlaylist(playlistId: string): Promise<void> {
    const rawId = parseBrowseId(playlistId)?.id ?? playlistId
    await this.invoke('playlist/delete', { id: rawId })
  }

  async addPlaylistTracks(playlistId: string, songIds: string[]): Promise<void> {
    const rawId = parseBrowseId(playlistId)?.id ?? playlistId
    const ids = songIds.map((id) => Number(id.split('|')[0] || id)).filter((n) => Number.isFinite(n))
    if (!ids.length) return
    await this.invoke('playlist/tracks', { op: 'add', pid: rawId, tracks: ids.join(',') })
  }

  async removePlaylistTracks(playlistId: string, songIds: string[]): Promise<void> {
    const rawId = parseBrowseId(playlistId)?.id ?? playlistId
    const ids = songIds.map((id) => Number(id.split('|')[0] || id)).filter((n) => Number.isFinite(n))
    if (!ids.length) return
    await this.invoke('playlist/tracks', { op: 'del', pid: rawId, tracks: ids.join(',') })
  }

  async followArtist(artistId: string, follow: boolean): Promise<void> {
    const rawId = parseBrowseId(artistId)?.id ?? artistId
    await this.invoke(follow ? 'artist/sub' : 'artist/del/sub', { id: rawId, t: follow ? 1 : 0 })
  }

  async getSongComments(songId: string, page = 1): Promise<MusicSongCommentPage> {
    const rawId = songId.split('|')[0] || songId
    const data = await this.invoke<{
      comments?: unknown[]
      hotComments?: unknown[]
      total?: number
    }>('comment/music', {
      id: rawId,
      offset: (page - 1) * 30,
      limit: 30
    })
    const comments = (data.comments ?? []).map((item, idx) =>
      mapNeteaseSongComment(item as Record<string, unknown>, idx, false)
    )
    const hotComments =
      page === 1
        ? (data.hotComments ?? []).map((item, idx) =>
            mapNeteaseSongComment(item as Record<string, unknown>, idx, true)
          )
        : undefined
    return { comments, hotComments, total: data.total, hasMore: comments.length >= 30 }
  }

  async getMvDetail(browseId: string): Promise<MusicMvDetail | null> {
    const rawId = parseBrowseId(browseId)?.id ?? browseId.replace(/^netease:mv:/, '')
    const data = await this.invoke<{ data?: Record<string, unknown> }>('mv/detail', { mvid: rawId })
    const row = data.data
    if (!row) return null
    const id = String(row.id ?? rawId)
    return {
      id,
      title: String(row.name ?? ''),
      artist: String(row.artistName ?? ''),
      coverUrl: typeof row.cover === 'string' ? row.cover : undefined,
      durationSec: typeof row.duration === 'number' ? Math.round(row.duration / 1000) : undefined,
      playCount: typeof row.playCount === 'number' ? row.playCount : undefined,
      browseId: `netease:mv:${id}`
    }
  }

  async resolveMvStream(mvId: string): Promise<MusicStreamPick | null> {
    const data = await this.invoke<{ data?: { url?: string } }>('mv/url', { id: mvId })
    const url = data.data?.url
    if (!url) return null
    return { url, format: url.includes('.mp4') ? 'mp4' : 'mp3' }
  }

  async getRadioCategories(): Promise<MusicRadioCategory[]> {
    try {
      const data = await this.invoke<{ categories?: unknown[] }>('dj/category/recommend')
      return (data.categories ?? []).map((item) => {
        const row = item as Record<string, unknown>
        return {
          id: String(row.id ?? row.categoryId ?? ''),
          title: String(row.name ?? row.categoryName ?? ''),
          coverUrl: typeof row.picWebUrl === 'string' ? row.picWebUrl : undefined
        }
      }).filter((c) => c.id && c.title)
    } catch {
      return []
    }
  }

  async getRadioTracks(categoryId: string, limit = 30): Promise<NormalizedTrack[]> {
    const data = await this.invoke<{ programs?: unknown[] }>('dj/program/byradio', {
      rid: categoryId,
      limit
    })
    const tracks: NormalizedTrack[] = []
    for (const item of data.programs ?? []) {
      const row = item as Record<string, unknown>
      const mainSong = row.mainSong as Record<string, unknown> | undefined
      if (!mainSong) continue
      const mapped = mapNeteaseSong(mainSong)
      if (mapped) tracks.push(mapped)
    }
    return tracks.slice(0, limit)
  }

  async resolveCloudStream(songId: string): Promise<MusicStreamPick | null> {
    const rawId = songId.split('|')[0] || songId
    const data = await this.invoke<{ data?: { downloadUrl?: string; url?: string } }>('user/cloud/download', {
      id: rawId
    })
    const url = data.data?.downloadUrl ?? data.data?.url
    if (!url) return null
    return { url, format: url.includes('.mp4') ? 'mp4' : 'mp3' }
  }
}
