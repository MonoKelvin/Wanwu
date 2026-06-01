/** 曲目能力/版权标识（来自网易云 privilege / 音质字段） */
export type MusicTrackBadge = 'vip' | 'trial' | 'hires' | 'lossless' | 'paid'

/** 统一曲目模型（主进程聚合后下发渲染层） */
export interface NormalizedTrack {
  trackKey: string
  provider: 'verome' | 'kuwo' | 'jamendo' | 'audius' | 'itunes' | 'musicbrainz' | 'netease' | 'kugou'
  videoId: string
  title: string
  artist: string
  album?: string
  durationSec?: number
  coverUrl?: string
  browseId?: string
  /** 静态标签：VIP、Hi-Res、无损等 */
  badges?: MusicTrackBadge[]
  /** 当前流是否为试听（通常 30s/60s） */
  isTrial?: boolean
}

export interface MusicSearchResult {
  tracks: NormalizedTrack[]
  albums: Array<{ browseId: string; title: string; artist: string; coverUrl?: string }>
  artists: Array<{ browseId: string; name: string; coverUrl?: string }>
  playlists?: Array<{ playlistId: string; title: string; coverUrl?: string; trackCount?: number }>
}

/** 平台 browseId 约定：netease:album:{id} / netease:artist:{id} / netease:playlist:{id} */
export type NeteaseBrowseRef = `netease:${'album' | 'artist' | 'playlist' | 'toplist'}:${string}`

export interface MusicNeteaseLoginStatus {
  loggedIn: boolean
  loginType: 'none' | 'normal' | 'uid'
  userId?: number
  nickname?: string
  avatarUrl?: string
}

export interface MusicNeteaseQrLogin {
  key: string
  qrUrl: string
  qrImageBase64?: string
}

export interface MusicKugouLoginStatus {
  loggedIn: boolean
  loginType: 'none' | 'normal' | 'uid'
  userId?: number
  nickname?: string
  avatarUrl?: string
}

export type MusicKugouQrLogin = MusicNeteaseQrLogin

export type MusicPlatformId = 'netease' | 'kugou'

export interface MusicPlatformUserStats {
  likedSongCount?: number
  playlistCount?: number
  createdPlaylistCount?: number
  subscribedPlaylistCount?: number
  artistCount?: number
  albumCount?: number
  mvCount?: number
  djCount?: number
}

export interface MusicPlatformUserProfile {
  platform: MusicPlatformId
  loggedIn: boolean
  userId?: number
  nickname?: string
  avatarUrl?: string
  signature?: string
  level?: number
  vipType?: number
  stats?: MusicPlatformUserStats
  /** 当前平台是否支持该能力（用于 UI 降级提示） */
  capabilities?: {
    likedSongs?: boolean
    cloud?: boolean
    subscribedAlbums?: boolean
    subscribedArtists?: boolean
    subscribedMvs?: boolean
    subscribedDjs?: boolean
    personalFm?: boolean
    playlistEdit?: boolean
    cloudUpload?: boolean
    comments?: boolean
    mv?: boolean
    sceneRadio?: boolean
  }
}

export interface MusicSongComment {
  id: string
  userName: string
  content: string
  likedCount?: number
  time?: string
  avatarUrl?: string
}

export interface MusicSongCommentPage {
  comments: MusicSongComment[]
  total?: number
  hasMore?: boolean
}

export interface MusicMvDetail {
  id: string
  title: string
  artist: string
  coverUrl?: string
  durationSec?: number
  playCount?: number
  browseId: string
}

export interface MusicRadioCategory {
  id: string
  title: string
  coverUrl?: string
  subtitle?: string
}

export interface MusicPlatformSessionSnapshot {
  platformId: MusicPlatformId
  loginType: 'none' | 'normal' | 'uid'
  userId?: number
  nickname?: string
  avatarUrl?: string
  refreshedAt?: string
}

export type MusicPlatformSubscribedKind = 'album' | 'artist' | 'mv' | 'dj'

export interface MusicPlatformSubscribedItem {
  id: string
  title: string
  subtitle?: string
  coverUrl?: string
  browseId: string
}

export interface MusicHotSearchEntry {
  keyword: string
  score?: number
}

export interface MusicFavoriteRow {
  trackKey: string
  title: string
  artist: string
  videoId: string
  coverUrl: string | null
  payloadJson: string
  createdAt: string
}

export interface MusicHistoryRow {
  id: string
  trackKey: string
  title: string
  artist: string
  videoId: string
  coverUrl: string | null
  payloadJson: string
  playedAt: string
}

export interface MusicMoodCategory {
  id: string
  title: string
  coverUrl?: string
  /** Verome mood API 返回的 ARGB 色值 */
  color?: number
  browseId?: string
}

export interface MusicChartCard {
  browseId: string
  playlistId?: string
  title: string
  subtitle?: string
  coverUrl?: string
}

export interface MusicMoodPlaylist {
  playlistId: string
  title: string
  coverUrl?: string
}

export interface MusicChartSection {
  kind: 'songs' | 'videos' | 'artists' | 'trending' | 'genres' | 'playlists'
  title: string
  items: NormalizedTrack[] | MusicChartCard[]
}

export interface MusicConnectionTestResult {
  ok: boolean
  baseUrl: string
  latencyMs?: number
  trackCount?: number
  error?: string
  localModeFallback?: boolean
}

export interface MusicProviderHealth {
  id: NormalizedTrack['provider']
  label: string
  enabled: boolean
  streamCapable: boolean
}

export interface MusicArtistPayload {
  name: string
  description?: string
  coverUrl?: string
  tracks: NormalizedTrack[]
  albums: Array<{ browseId: string; title: string; coverUrl?: string }>
}

export interface MusicChartsPayload {
  country?: string
  sections: MusicChartSection[]
}

export interface MusicTrendingPayload {
  country: string
  tracks: NormalizedTrack[]
}

/** 发现页分区数据（服务端去重后一次下发） */
export interface MusicDiscoverFeed {
  forYou: NormalizedTrack[]
  trending: NormalizedTrack[]
  newReleases: NormalizedTrack[]
  chartTracks: NormalizedTrack[]
  chartPlaylists: MusicChartCard[]
}

export type DiscoverSectionKey = keyof MusicDiscoverFeed

export interface MusicStreamResult {
  url: string
  cachedPath?: string
  /** 实际用于播放的曲目（可能与请求不同，例如 Audius 兜底） */
  track?: NormalizedTrack
  /** Howler 解码格式（代理 URL 无扩展名时必须提供） */
  format?: 'mp4' | 'webm' | 'mp3' | 'ogg'
  isTrial?: boolean
}

export interface MusicLyricsResult {
  lrc?: string
  plain?: string
}

export type MusicPlayMode = 'sequence' | 'single' | 'shuffle'
export type MusicPlayerLayoutMode = 'gallery' | 'duet' | 'immersion'
