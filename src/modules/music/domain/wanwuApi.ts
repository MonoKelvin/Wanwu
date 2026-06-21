import type { MusicNeteaseQuality } from '@modules/music/domain/settings'
import type {
  DiscoverSectionKey,
  MusicArtistPayload,
  MusicChartsPayload,
  MusicConnectionTestResult,
  MusicDiscoverFeed,
  MusicFavoriteRow,
  MusicHistoryRow,
  MusicHotSearchEntry,
  MusicKugouLoginStatus,
  MusicKugouQrLogin,
  MusicLyricsResult,
  MusicMoodCategory,
  MusicMoodPlaylist,
  MusicMvDetail,
  MusicNeteaseLoginStatus,
  MusicNeteaseQrLogin,
  MusicPlatformSessionSnapshot,
  MusicPlatformSubscribedItem,
  MusicPlatformSubscribedKind,
  MusicPlatformUserProfile,
  MusicProviderHealth,
  MusicRadioCategory,
  MusicSearchResult,
  MusicSongCommentPage,
  MusicStreamResult,
  MusicTrendingPayload,
  NormalizedTrack
} from '@modules/music/domain/types'

/** 音乐 IPC 能力块 */
export interface WanwuMusicApi {
  music: {
    search: (q: string, filter?: string) => Promise<MusicSearchResult>
    resolveTrack: (track: NormalizedTrack) => Promise<NormalizedTrack>
    getTrending: () => Promise<MusicTrendingPayload>
    getCharts: () => Promise<MusicChartsPayload>
    getMoods: () => Promise<MusicMoodCategory[]>
    getMoodPlaylists: (categoryId: string) => Promise<MusicMoodPlaylist[]>
    getPlaylistTracks: (playlistId: string) => Promise<NormalizedTrack[]>
    getForYou: () => Promise<NormalizedTrack[]>
    getDiscoverFeed: () => Promise<MusicDiscoverFeed>
    getDiscoverSection: <K extends DiscoverSectionKey>(section: K) => Promise<MusicDiscoverFeed[K]>
    refreshDiscoverSection: <K extends DiscoverSectionKey>(section: K) => Promise<MusicDiscoverFeed[K]>
    getAlbum: (browseId: string) => Promise<{ album: unknown; tracks: NormalizedTrack[] }>
    getArtist: (browseId: string) => Promise<MusicArtistPayload>
    getProviderHealth: () => Promise<MusicProviderHealth[]>
    getLyrics: (
      title: string,
      artist: string,
      hint?: Pick<NormalizedTrack, 'provider' | 'videoId' | 'trackKey'>
    ) => Promise<MusicLyricsResult>
    resolveStream: (
      track: NormalizedTrack,
      useCache?: boolean,
      quality?: MusicNeteaseQuality
    ) => Promise<MusicStreamResult>
    testConnection: () => Promise<MusicConnectionTestResult>
    getRadio: (videoId: string) => Promise<NormalizedTrack[]>
    listFavorites: () => Promise<MusicFavoriteRow[]>
    isFavorite: (trackKey: string) => Promise<boolean>
    toggleFavorite: (track: NormalizedTrack) => Promise<boolean>
    syncPlatformFavorites: (limit?: number) => Promise<void>
    listHistory: (limit?: number) => Promise<MusicHistoryRow[]>
    appendHistory: (track: NormalizedTrack) => Promise<void>
    clearHistory: () => Promise<void>
    neteaseGetLoginStatus: () => Promise<MusicNeteaseLoginStatus>
    neteaseLoginQrKey: () => Promise<MusicNeteaseQrLogin>
    neteaseLoginQrCheck: (key: string) => Promise<{ status: number; message?: string; cookie?: string }>
    neteaseSendCaptcha: (phone: string, countryCode?: number) => Promise<unknown>
    neteaseLoginPhone: (phone: string, captcha: string, countryCode?: number) => Promise<unknown>
    neteaseLoginCookie: (musicU: string) => Promise<MusicNeteaseLoginStatus>
    neteaseLogout: () => Promise<void>
    neteaseRefreshLogin: () => Promise<MusicNeteaseLoginStatus>
    kugouGetLoginStatus: () => Promise<MusicKugouLoginStatus>
    kugouLoginQrKey: () => Promise<MusicKugouQrLogin>
    kugouLoginQrCheck: (key: string) => Promise<{ status: number; message?: string; cookie?: string }>
    kugouSendCaptcha: (phone: string, countryCode?: number) => Promise<unknown>
    kugouLoginPhone: (phone: string, captcha: string, countryCode?: number) => Promise<unknown>
    kugouLoginCookie: (token: string) => Promise<MusicKugouLoginStatus>
    kugouLogout: () => Promise<void>
    kugouRefreshLogin: () => Promise<MusicKugouLoginStatus>
    neteaseSearchHot: (limit?: number) => Promise<MusicHotSearchEntry[]>
    searchHot: (limit?: number) => Promise<MusicHotSearchEntry[]>
    neteaseSearchSuggest: (keywords: string) => Promise<Array<{ keyword: string; type?: string }>>
    searchSuggest: (keywords: string) => Promise<Array<{ keyword: string; type?: string }>>
    neteaseSearchDefault: () => Promise<string>
    searchDefault: () => Promise<string>
    getDailyRecommend: () => Promise<NormalizedTrack[]>
    getPersonalFm: () => Promise<NormalizedTrack[]>
    trashPersonalFm: (songId: string) => Promise<void>
    getNeteaseUserPlaylists: () => Promise<
      Array<{ id: string; title: string; coverUrl?: string; trackCount?: number; creatorName?: string }>
    >
    getNeteaseLikedTracks: (limit?: number) => Promise<NormalizedTrack[]>
    getNeteaseUserCloud: (limit?: number) => Promise<NormalizedTrack[]>
    getNeteaseArtistList: (limit?: number, offset?: number) => Promise<MusicSearchResult['artists']>
    getNeteaseNewAlbums: (limit?: number) => Promise<MusicSearchResult['albums']>
    getPlatformSessionSnapshot: () => Promise<MusicPlatformSessionSnapshot>
    getPlatformLoginStatus: () => Promise<MusicNeteaseLoginStatus>
    getPlatformUserProfile: () => Promise<MusicPlatformUserProfile>
    refreshPlatformLogin: () => Promise<MusicNeteaseLoginStatus>
    getPlatformUserPlaylists: () => Promise<
      Array<{ id: string; title: string; coverUrl?: string; trackCount?: number; creatorName?: string }>
    >
    getPlatformLikedTracks: (limit?: number) => Promise<NormalizedTrack[]>
    getPlatformUserCloud: (limit?: number) => Promise<NormalizedTrack[]>
    getPlatformSubscribed: (
      kind: MusicPlatformSubscribedKind,
      limit?: number
    ) => Promise<MusicPlatformSubscribedItem[]>
    platformLoginQrKey: () => Promise<MusicNeteaseQrLogin>
    platformLoginQrCheck: (key: string) => Promise<{ status: number; message?: string; cookie?: string }>
    platformSendCaptcha: (phone: string, countryCode?: number) => Promise<unknown>
    platformLoginPhone: (phone: string, captcha: string, countryCode?: number) => Promise<unknown>
    platformLoginCookie: (credential: string) => Promise<MusicNeteaseLoginStatus>
    platformLogout: () => Promise<void>
    platformLikeSong: (songId: string, like: boolean) => Promise<void>
    getNewSongs: (limit?: number) => Promise<NormalizedTrack[]>
    getNewAlbums: (limit?: number, seed?: number) => Promise<MusicSearchResult['albums']>
    getToplists: () => Promise<Array<{ id: string; title: string; coverUrl?: string; updateFrequency?: string }>>
    getToplistTracks: (toplistId: string, limit?: number) => Promise<NormalizedTrack[]>
    createPlatformPlaylist: (name: string) => Promise<{ id: string; title: string; coverUrl?: string }>
    deletePlatformPlaylist: (playlistId: string) => Promise<void>
    addPlatformPlaylistTracks: (playlistId: string, songIds: string[]) => Promise<void>
    removePlatformPlaylistTracks: (playlistId: string, songIds: string[]) => Promise<void>
    followPlatformArtist: (artistId: string, follow: boolean) => Promise<void>
    getPlatformSongComments: (songId: string, page?: number) => Promise<MusicSongCommentPage>
    getPlatformMvDetail: (browseId: string) => Promise<MusicMvDetail | null>
    resolvePlatformMvStream: (mvId: string) => Promise<{ url: string; format: string } | null>
    getPlatformRadioCategories: () => Promise<MusicRadioCategory[]>
    getPlatformRadioTracks: (categoryId: string, limit?: number) => Promise<NormalizedTrack[]>
  }
}

declare module '@shared/types/api' {
  interface WanwuApi extends WanwuMusicApi {}
}
