/** 底层音乐平台 ID（与 NormalizedTrack.provider 中平台型 provider 对齐） */
export type MusicPlatformId = 'netease' | 'kugou'

export type MusicPlatformLoginType = 'none' | 'normal' | 'uid'

export type MusicPlatformQuality =
  | 'standard'
  | 'higher'
  | 'exhigh'
  | 'lossless'
  | 'hires'
  | 'jyeffect'
  | 'sky'
  | 'dolby'
  | 'jymaster'

/** cloudsearch / 综合搜索 type */
export enum MusicSearchType {
  Song = 1,
  Album = 10,
  Artist = 100,
  Playlist = 1000,
  Mv = 1004,
  Radio = 1009,
  All = 1018
}

export interface MusicPlatformLoginStatus {
  loggedIn: boolean
  loginType: MusicPlatformLoginType
  userId?: number
  nickname?: string
  avatarUrl?: string
}

export interface MusicPlatformSessionSnapshot {
  platformId: MusicPlatformId
  loginType: MusicPlatformLoginType
  musicU?: string
  userId?: number
  nickname?: string
  avatarUrl?: string
  refreshedAt?: string
}

export interface MusicPlatformInvokeOptions {
  cookie?: Record<string, string | undefined>
  realIp?: string
  proxy?: string
  method?: 'GET' | 'POST'
  body?: Record<string, unknown>
}

export interface MusicPlatformQrLoginState {
  key: string
  qrUrl: string
  qrImageBase64?: string
}

export interface MusicHotSearchItem {
  keyword: string
  score?: number
}

export interface MusicSearchSuggestItem {
  keyword: string
  type?: string
}

export interface MusicPlaylistSummary {
  id: string
  title: string
  coverUrl?: string
  trackCount?: number
  creatorName?: string
}

export interface MusicToplistSummary {
  id: string
  title: string
  coverUrl?: string
  updateFrequency?: string
}

export interface MusicStreamPick {
  url: string
  format: 'mp3' | 'mp4' | 'ogg' | 'webm'
  br?: number
  isTrial?: boolean
}
