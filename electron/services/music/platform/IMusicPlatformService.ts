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
} from '../../../../src/shared/types/music'
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
} from './types'

/** 高层音乐平台服务（业务语义，与具体 API path 解耦） */
export interface IMusicPlatformService {
  readonly platformId: 'netease' | 'kugou'

  getSessionSnapshot(): MusicPlatformSessionSnapshot
  getLoginStatus(): Promise<MusicPlatformLoginStatus>
  clearSession(): void
  setMusicUCookie(musicU: string): void
  refreshLoginIfNeeded(): Promise<void>

  loginQrKey(): Promise<MusicPlatformQrLoginState>
  loginQrCheck(key: string): Promise<{ status: number; message?: string; cookie?: string }>
  sendPhoneCaptcha(phone: string, countryCode?: number): Promise<unknown>
  loginPhone(phone: string, captcha: string, countryCode?: number): Promise<unknown>
  logout(): Promise<void>

  searchDefault(): Promise<string>
  searchHot(limit?: number): Promise<MusicHotSearchItem[]>
  searchSuggest(keywords: string): Promise<MusicSearchSuggestItem[]>
  cloudSearch(keywords: string, type: MusicSearchType, limit?: number, offset?: number): Promise<MusicSearchResult>

  resolveStream(songId: string, quality: MusicPlatformQuality): Promise<MusicStreamPick | null>
  getLyrics(songId: string): Promise<MusicLyricsResult>
  getSongDetail(songId: string): Promise<NormalizedTrack | null>

  getPlaylistTracks(playlistId: string): Promise<NormalizedTrack[]>
  getPlaylistSummaries(category?: string, limit?: number): Promise<MusicPlaylistSummary[]>
  getToplists(): Promise<MusicToplistSummary[]>
  getToplistTracks(toplistId: string, limit?: number): Promise<NormalizedTrack[]>

  getDailyRecommend(): Promise<NormalizedTrack[]>
  getPersonalFm(): Promise<NormalizedTrack[]>
  trashPersonalFm(songId: string): Promise<void>
  getPersonalizedPlaylists(limit?: number): Promise<MusicMoodPlaylist[]>

  getNewSongs(limit?: number): Promise<NormalizedTrack[]>
  getNewAlbums(limit?: number): Promise<MusicSearchResult['albums']>
  getArtistList(area?: string, type?: number, initial?: string, limit?: number): Promise<MusicSearchResult['artists']>

  getAlbum(browseId: string): Promise<{ album: unknown; tracks: NormalizedTrack[] }>
  getArtist(browseId: string): Promise<import('../../../../src/shared/types/music').MusicArtistPayload>
  getMoodCategories(): Promise<MusicMoodCategory[]>

  getUserPlaylists(): Promise<MusicPlaylistSummary[]>
  getLikedSongIds(): Promise<number[]>
  likeSong(songId: string, like: boolean): Promise<void>
  getUserCloud(limit?: number): Promise<NormalizedTrack[]>
  getUserProfile(): Promise<MusicPlatformUserProfile>
  getSubscribed(kind: MusicPlatformSubscribedKind, limit?: number): Promise<MusicPlatformSubscribedItem[]>

  buildDiscoverFeed(): Promise<MusicDiscoverFeed>
  getTrending(): Promise<MusicTrendingPayload>
  getCharts(): Promise<MusicChartsPayload>
}
