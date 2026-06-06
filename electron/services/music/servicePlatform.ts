import type { AppSettings } from '../../../src/shared/types/settings'
import type {
  MusicHotSearchEntry,
  MusicNeteaseLoginStatus,
  MusicNeteaseQrLogin,
  MusicPlatformSessionSnapshot,
  MusicPlatformSubscribedItem,
  MusicPlatformSubscribedKind,
  MusicPlatformUserProfile,
  NormalizedTrack
} from '../../../src/shared/types/music'
import type { MusicPlatformManager } from './platform/MusicPlatformManager'
import type { IMusicPlatformService } from './platform/IMusicPlatformService'
import type { NeteasePlatformService } from './platform/netease/neteasePlatformService'
import type { TtlRequestCache } from './ttlRequestCache'
import { parseBrowseId } from './platform/browseId'

export interface MusicServicePlatformHost {
  refreshApiClient(): Promise<unknown>
  netease(): NeteasePlatformService
  platforms: MusicPlatformManager
  primaryPlatform(): IMusicPlatformService
  accountPlatform(): IMusicPlatformService
  accountPlatformId(): 'netease' | 'kugou'
  isPlatformPrimary(): boolean
  getSettings(): AppSettings
  readCache: TtlRequestCache
  readCacheKey(suffix: string): string
  platformLikedKeys: Set<string> | null
}

export class MusicServicePlatform {
  constructor(readonly host: MusicServicePlatformHost) {}

  async neteaseGetLoginStatus(): Promise<MusicNeteaseLoginStatus> {
    await this.host.refreshApiClient()
    return this.host.netease().getLoginStatus()
  }

  neteaseGetSessionSnapshot() {
    return this.host.netease().getSessionSnapshot()
  }

  async neteaseLoginQrKey(): Promise<MusicNeteaseQrLogin> {
    await this.host.refreshApiClient()
    return this.host.netease().loginQrKey()
  }

  async neteaseLoginQrCheck(key: string) {
    await this.host.refreshApiClient()
    return this.host.netease().loginQrCheck(key)
  }

  async neteaseSendCaptcha(phone: string, countryCode = 86) {
    await this.host.refreshApiClient()
    return this.host.netease().sendPhoneCaptcha(phone, countryCode)
  }

  async neteaseLoginPhone(phone: string, captcha: string, countryCode = 86) {
    await this.host.refreshApiClient()
    return this.host.netease().loginPhone(phone, captcha, countryCode)
  }

  async neteaseLoginCookie(musicU: string) {
    await this.host.refreshApiClient()
    this.host.netease().setMusicUCookie(musicU)
    return this.host.netease().getLoginStatus()
  }

  async neteaseLogout() {
    await this.host.refreshApiClient()
    await this.host.netease().logout()
  }

  async neteaseRefreshLogin() {
    await this.host.refreshApiClient()
    await this.host.netease().refreshLoginIfNeeded()
    return this.host.netease().getLoginStatus()
  }

  // --- 酷狗登录 ---

  async kugouGetLoginStatus(): Promise<MusicNeteaseLoginStatus> {
    await this.host.refreshApiClient()
    return this.host.platforms.kugou.getLoginStatus()
  }

  async kugouLoginQrKey(): Promise<MusicNeteaseQrLogin> {
    await this.host.refreshApiClient()
    return this.host.platforms.kugou.loginQrKey()
  }

  async kugouLoginQrCheck(key: string) {
    await this.host.refreshApiClient()
    return this.host.platforms.kugou.loginQrCheck(key)
  }

  async kugouSendCaptcha(phone: string, countryCode = 86) {
    await this.host.refreshApiClient()
    return this.host.platforms.kugou.sendPhoneCaptcha(phone, countryCode)
  }

  async kugouLoginPhone(phone: string, captcha: string, countryCode = 86) {
    await this.host.refreshApiClient()
    return this.host.platforms.kugou.loginPhone(phone, captcha, countryCode)
  }

  async kugouLoginCookie(token: string) {
    await this.host.refreshApiClient()
    this.host.platforms.kugou.setMusicUCookie(token)
    return this.host.platforms.kugou.getLoginStatus()
  }

  async kugouLogout() {
    await this.host.refreshApiClient()
    await this.host.platforms.kugou.logout()
  }

  async kugouRefreshLogin() {
    await this.host.refreshApiClient()
    await this.host.platforms.kugou.refreshLoginIfNeeded()
    return this.host.platforms.kugou.getLoginStatus()
  }

  async searchHot(limit = 10): Promise<MusicHotSearchEntry[]> {
    await this.host.refreshApiClient()
    if (!this.host.isPlatformPrimary()) return []
    return this.host.primaryPlatform().searchHot(limit)
  }

  async searchSuggest(keywords: string) {
    await this.host.refreshApiClient()
    if (!this.host.isPlatformPrimary()) return []
    return this.host.primaryPlatform().searchSuggest(keywords)
  }

  async searchDefault(): Promise<string> {
    await this.host.refreshApiClient()
    if (!this.host.isPlatformPrimary()) return ''
    return this.host.primaryPlatform().searchDefault()
  }

  async neteaseSearchHot(limit = 10): Promise<MusicHotSearchEntry[]> {
    return this.searchHot(limit)
  }

  async neteaseSearchSuggest(keywords: string) {
    return this.searchSuggest(keywords)
  }

  async neteaseSearchDefault(): Promise<string> {
    return this.searchDefault()
  }

  async getDailyRecommend(): Promise<NormalizedTrack[]> {
    await this.host.refreshApiClient()
    if (!this.host.isPlatformPrimary()) return []
    return this.host.primaryPlatform().getDailyRecommend()
  }

  async getPersonalFm(): Promise<NormalizedTrack[]> {
    await this.host.refreshApiClient()
    if (!this.host.isPlatformPrimary()) return []
    return this.host.primaryPlatform().getPersonalFm()
  }

  async trashPersonalFm(songId: string): Promise<void> {
    await this.host.refreshApiClient()
    if (!this.host.isPlatformPrimary()) return
    await this.host.primaryPlatform().trashPersonalFm(songId)
  }

  async getNeteaseUserPlaylists() {
    return this.getPlatformUserPlaylists()
  }

  async getNeteaseLikedTracks(limit = 50): Promise<NormalizedTrack[]> {
    return this.getPlatformLikedTracks(limit)
  }

  async getNeteaseUserCloud(limit = 50): Promise<NormalizedTrack[]> {
    return this.getPlatformUserCloud(limit)
  }

  async getNeteaseArtistList(limit = 30, offset = 0) {
    return this.host.readCache.run(this.host.readCacheKey(`artists:${limit}:${offset}`), async () => {
      await this.host.refreshApiClient()
      if (!this.host.isPlatformPrimary()) return []
      return this.host.primaryPlatform().getArtistList('-1', -1, '-1', limit, offset)
    })
  }

  async getNeteaseNewAlbums(limit = 12) {
    await this.host.refreshApiClient()
    if (!this.host.isPlatformPrimary()) return []
    return this.host.primaryPlatform().getNewAlbums(limit)
  }

  // --- 平台账号（随 musicPrimarySource，Verome 主源时默认走网易库） ---

  getPlatformSessionSnapshot(): MusicPlatformSessionSnapshot {
    return this.host.accountPlatform().getSessionSnapshot()
  }

  async getPlatformLoginStatus(): Promise<MusicNeteaseLoginStatus> {
    await this.host.refreshApiClient()
    return this.host.accountPlatform().getLoginStatus()
  }

  async getPlatformUserProfile(): Promise<MusicPlatformUserProfile> {
    await this.host.refreshApiClient()
    const platform = this.host.accountPlatform()
    const profile = await platform.getUserProfile()
    return { ...profile, platform: this.host.accountPlatformId() }
  }

  async refreshPlatformLogin(): Promise<MusicNeteaseLoginStatus> {
    await this.host.refreshApiClient()
    const platform = this.host.accountPlatform()
    await platform.refreshLoginIfNeeded()
    return platform.getLoginStatus()
  }

  async getPlatformUserPlaylists() {
    await this.host.refreshApiClient()
    return this.host.accountPlatform().getUserPlaylists()
  }

  async getPlatformLikedTracks(limit = 50): Promise<NormalizedTrack[]> {
    await this.host.refreshApiClient()
    const platform = this.host.accountPlatform()
    if (this.host.accountPlatformId() === 'kugou') {
      const playlists = await platform.getUserPlaylists()
      const fav = playlists.find((p) => /我喜欢|收藏|最爱|默认/.test(p.title))
      if (!fav) return []
      const tracks = await platform.getPlaylistTracks(`kugou:playlist:${fav.id}`)
      return tracks.slice(0, limit)
    }
    const ids = await platform.getLikedSongIds()
    const tracks: NormalizedTrack[] = []
    for (const id of ids.slice(0, limit)) {
      const t = await platform.getSongDetail(String(id))
      if (t) tracks.push(t)
    }
    return tracks
  }

  async getPlatformUserCloud(limit = 50): Promise<NormalizedTrack[]> {
    await this.host.refreshApiClient()
    return this.host.accountPlatform().getUserCloud(limit)
  }

  async getPlatformSubscribed(
    kind: MusicPlatformSubscribedKind,
    limit = 30
  ): Promise<MusicPlatformSubscribedItem[]> {
    await this.host.refreshApiClient()
    return this.host.accountPlatform().getSubscribed(kind, limit)
  }

  // --- 统一平台登录（随 musicPrimarySource） ---

  async platformLoginQrKey() {
    await this.host.refreshApiClient()
    return this.host.accountPlatform().loginQrKey()
  }

  async platformLoginQrCheck(key: string) {
    await this.host.refreshApiClient()
    return this.host.accountPlatform().loginQrCheck(key)
  }

  async platformSendCaptcha(phone: string, countryCode = 86) {
    await this.host.refreshApiClient()
    return this.host.accountPlatform().sendPhoneCaptcha(phone, countryCode)
  }

  async platformLoginPhone(phone: string, captcha: string, countryCode = 86) {
    await this.host.refreshApiClient()
    return this.host.accountPlatform().loginPhone(phone, captcha, countryCode)
  }

  async platformLoginCookie(credential: string) {
    await this.host.refreshApiClient()
    const platform = this.host.accountPlatform()
    platform.setMusicUCookie(credential)
    return platform.getLoginStatus()
  }

  async platformLogout() {
    await this.host.refreshApiClient()
    await this.host.accountPlatform().logout()
    this.host.platformLikedKeys = null
  }

  async platformLikeSong(songId: string, like: boolean): Promise<void> {
    await this.host.refreshApiClient()
    const platform = this.host.accountPlatform()
    const status = await platform.getLoginStatus()
    if (!status.loggedIn) throw new Error('请先登录音乐平台账号')
    await platform.likeSong(songId, like)
  }

  async getNewSongs(limit = 30): Promise<NormalizedTrack[]> {
    return this.host.readCache.run(this.host.readCacheKey(`newSongs:${limit}`), async () => {
      await this.host.refreshApiClient()
      if (!this.host.isPlatformPrimary()) return []
      return this.host.primaryPlatform().getNewSongs(limit)
    })
  }

  async getNewAlbums(limit = 12, seed = 0) {
    return this.host.readCache.run(this.host.readCacheKey(`newAlbums:${limit}:${seed}`), async () => {
      await this.host.refreshApiClient()
      if (!this.host.isPlatformPrimary()) return []
      const platform = this.host.primaryPlatform()
      if (this.host.accountPlatformId() === 'kugou') {
        return platform.getNewAlbums(limit, Math.max(1, seed + 1))
      }
      return platform.getNewAlbums(limit, Math.max(0, seed) * limit)
    })
  }

  async getToplists() {
    await this.host.refreshApiClient()
    if (!this.host.isPlatformPrimary()) return []
    return this.host.primaryPlatform().getToplists()
  }

  async getToplistTracks(toplistId: string, limit = 50): Promise<NormalizedTrack[]> {
    await this.host.refreshApiClient()
    if (!this.host.isPlatformPrimary()) return []
    return this.host.primaryPlatform().getToplistTracks(toplistId, limit)
  }

  async createPlatformPlaylist(name: string) {
    await this.host.refreshApiClient()
    return this.host.accountPlatform().createPlaylist(name)
  }

  async deletePlatformPlaylist(playlistId: string) {
    await this.host.refreshApiClient()
    await this.host.accountPlatform().deletePlaylist(playlistId)
  }

  async addPlatformPlaylistTracks(playlistId: string, songIds: string[]) {
    await this.host.refreshApiClient()
    await this.host.accountPlatform().addPlaylistTracks(playlistId, songIds)
  }

  async removePlatformPlaylistTracks(playlistId: string, songIds: string[]) {
    await this.host.refreshApiClient()
    await this.host.accountPlatform().removePlaylistTracks(playlistId, songIds)
  }

  async followPlatformArtist(artistId: string, follow: boolean) {
    await this.host.refreshApiClient()
    await this.host.accountPlatform().followArtist(artistId, follow)
  }

  async getPlatformSongComments(songId: string, page = 1) {
    await this.host.refreshApiClient()
    if (!this.host.isPlatformPrimary()) return { comments: [], hasMore: false }
    return this.host.primaryPlatform().getSongComments(songId, page)
  }

  async getPlatformMvDetail(browseId: string) {
    await this.host.refreshApiClient()
    const ref = parseBrowseId(browseId)
    const platform = ref ? this.host.platforms.get(ref.platform) : this.host.primaryPlatform()
    return platform.getMvDetail(browseId)
  }

  async resolvePlatformMvStream(mvId: string) {
    await this.host.refreshApiClient()
    if (!this.host.isPlatformPrimary()) return null
    return this.host.primaryPlatform().resolveMvStream(mvId)
  }

  async getPlatformRadioCategories() {
    await this.host.refreshApiClient()
    if (!this.host.isPlatformPrimary()) return []
    return this.host.primaryPlatform().getRadioCategories()
  }

  async getPlatformRadioTracks(categoryId: string, limit = 30) {
    await this.host.refreshApiClient()
    if (!this.host.isPlatformPrimary()) return []
    return this.host.primaryPlatform().getRadioTracks(categoryId, limit)
  }
}
