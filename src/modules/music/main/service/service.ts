import { randomUUID } from 'crypto'
import type { DatabaseService } from '../../../../../electron/services/core/database'
import type { AppSettings } from '@shared/types/settings'
import { DEFAULT_VEROME_BASE_URL, VeromeClient } from './veromeClient'
import { MusicDatabase } from './db'
import { StreamCacheService } from './streamCacheService'
import {
  mapTrendingResponse,
  mapVeromeTrack,
  mapArtistResponse
} from './discoveryMapper'
import { getLocalVeromeBaseUrl, probeLocalVerome } from './veromeProcess'
import { JamendoProvider } from './providers/jamendoProvider'
import { AudiusProvider } from './providers/audiusProvider'
import { KuwoProvider } from './providers/kuwoProvider'
import { ItunesProvider } from './providers/itunesProvider'
import { MusicAggregator } from './musicAggregator'
import { MusicProviderRegistry } from './providers/MusicProviderRegistry'
import { DiscoverCacheService, type DiscoverSectionKey } from './discoverCache'
import { MusicPlatformManager } from './platform/MusicPlatformManager'
import { ensureNeteaseApiReady } from './platform/netease/neteaseApiBootstrap'
import { MusicSearchType } from './platform/types'
import { TtlRequestCache } from './ttlRequestCache'
import { MusicServiceLibrary } from './serviceLibrary'
import { MusicServicePlatform } from './servicePlatform'
import { MusicServiceDiscover } from './serviceDiscover'
import type { MusicHistoryRow } from '@modules/music/domain/types'

import type {
  MusicChartsPayload,
  MusicConnectionTestResult,
  MusicDiscoverFeed,
  MusicFavoriteRow,
  MusicHotSearchEntry,
  MusicNeteaseLoginStatus,
  MusicNeteaseQrLogin,
  MusicLyricsResult,
  MusicMoodCategory,
  MusicMoodPlaylist,
  MusicPlatformSessionSnapshot,
  MusicPlatformSubscribedItem,
  MusicPlatformSubscribedKind,
  MusicPlatformUserProfile,
  MusicSearchResult,
  MusicStreamResult,
  MusicTrendingPayload,
  NormalizedTrack
} from '@modules/music/domain/types'

export class MusicService {
  private readonly verome = new VeromeClient(DEFAULT_VEROME_BASE_URL)
  private readonly musicDb: MusicDatabase
  private readonly streamCache: StreamCacheService
  private jamendo: JamendoProvider | null = null
  private audius: AudiusProvider | null = null
  private readonly kuwo = new KuwoProvider()
  private readonly itunes = new ItunesProvider()
  private aggregator: MusicAggregator | null = null
  private registry: MusicProviderRegistry | null = null
  private readonly discoverCache = new DiscoverCacheService()
  private readonly platforms: MusicPlatformManager
  private platformDiscoverFeedInflight: Promise<MusicDiscoverFeed> | null = null
  /** 已登录时平台「我喜欢」trackKey 缓存，用于 isFavorite 与列表红心 */
  private platformLikedKeys: Set<string> | null = null
  private readonly readCache = new TtlRequestCache(45_000)

  constructor(
    private readonly db: DatabaseService,
    basePath: string
  ) {
    this.musicDb = new MusicDatabase(basePath)
    this.streamCache = new StreamCacheService(basePath, this.verome)
    this.platforms = new MusicPlatformManager(basePath)
  }


  private readonly libraryOps = new MusicServiceLibrary(this as never)
  private readonly platformOps = new MusicServicePlatform(this as never)
  private readonly discoverOps = new MusicServiceDiscover(this as never)


  private isNeteasePrimary(): boolean {
    return this.getSettings().musicPrimarySource === 'netease'
  }

  private isPlatformPrimary(): boolean {
    const s = this.getSettings().musicPrimarySource
    return s === 'netease' || s === 'kugou'
  }

  /** 发现页/歌手列表使用的平台：主源为平台时跟随主源，否则回退到已登录的网易/酷狗 */
  private resolveDiscoverPlatform(): import('./platform/IMusicPlatformService').IMusicPlatformService | null {
    const src = this.getSettings().musicPrimarySource
    if (src === 'netease' || src === 'kugou') {
      return this.primaryPlatform()
    }
    const neteaseSnap = this.platforms.netease.getSessionSnapshot()
    if (neteaseSnap.musicU || neteaseSnap.userId) {
      return this.platforms.netease
    }
    const kugouSnap = this.platforms.kugou.getSessionSnapshot()
    if (kugouSnap.musicU || kugouSnap.userId) {
      return this.platforms.kugou
    }
    return null
  }

  private primaryPlatform() {
    return this.platforms.primary(this.getSettings())
  }

  private netease() {
    return this.platforms.netease
  }

  private accountPlatformId(): 'netease' | 'kugou' {
    return this.getSettings().musicPrimarySource === 'kugou' ? 'kugou' : 'netease'
  }

  private accountPlatform() {
    return this.platforms.get(this.accountPlatformId())
  }

  private readCacheKey(suffix: string): string {
    return `${this.accountPlatformId()}:${suffix}`
  }

  private getSettings(): AppSettings {
    return this.db.getAppSettings()
  }

  async refreshApiClient(): Promise<{ localModeFallback?: boolean }> {
    const s = this.getSettings()
    let base = s.musicApiBaseUrl?.trim() || DEFAULT_VEROME_BASE_URL
    let localModeFallback = false
    if (s.musicApiMode === 'local') {
      const port = s.musicApiLocalPort ?? 8000
      const ok = await probeLocalVerome(port)
      if (ok) {
        base = getLocalVeromeBaseUrl(port)
      } else {
        localModeFallback = true
      }
    }
    this.verome.setBaseUrl(base)
    if (s.musicJamendoClientId?.trim()) {
      this.jamendo = new JamendoProvider(s.musicJamendoClientId.trim())
    } else {
      this.jamendo = null
    }
    this.audius = new AudiusProvider(s.musicAudiusApiKey?.trim() || undefined)
    this.platforms.applySettings(s)
    await ensureNeteaseApiReady()
    await this.platforms.netease.refreshLoginIfNeeded()
    await this.platforms.kugou.refreshLoginIfNeeded()
    this.registry = new MusicProviderRegistry(
      this.verome,
      this.kuwo,
      this.jamendo,
      this.audius,
      this.platforms.netease,
      this.platforms.kugou,
      () => this.getSettings()
    )
    this.aggregator = new MusicAggregator()
    this.aggregator.bindRegistry(this.registry)
    return { localModeFallback }
  }

  async getProviderHealth() {
    await this.refreshApiClient()
    return this.registry?.listHealth() ?? []
  }

  async testConnection(): Promise<MusicConnectionTestResult> {
    const s = this.getSettings()
    await this.refreshApiClient()
    const start = Date.now()

    if (this.isPlatformPrimary()) {
      const src = this.getSettings().musicPrimarySource
      const platform = this.primaryPlatform()
      try {
        if (src === 'kugou') {
          const probe = await platform.cloudSearch('周杰伦', MusicSearchType.Song, 3)
          const tracks = await platform.getNewSongs(3)
          return {
            ok: probe.tracks.length > 0 || tracks.length > 0,
            baseUrl: `${src}://embedded`,
            latencyMs: Date.now() - start,
            trackCount: probe.tracks.length || tracks.length,
            localModeFallback: false
          }
        }
        const hot = await platform.searchHot(1)
        return {
          ok: true,
          baseUrl: `${src}://embedded`,
          latencyMs: Date.now() - start,
          trackCount: hot.length,
          localModeFallback: false
        }
      } catch (e) {
        return {
          ok: false,
          baseUrl: `${src}://embedded`,
          latencyMs: Date.now() - start,
          error: e instanceof Error ? e.message : String(e),
          localModeFallback: false
        }
      }
    }

    const { localModeFallback } = { localModeFallback: false }
    const baseUrl = this.verome.getBaseUrl()
    try {
      const country = this.discoverCountry()
      const data = await this.verome.getTrending(country)
      const payload = mapTrendingResponse(data, country)
      return {
        ok: true,
        baseUrl,
        latencyMs: Date.now() - start,
        trackCount: payload.tracks.length,
        localModeFallback
      }
    } catch (e) {
      return {
        ok: false,
        baseUrl,
        latencyMs: Date.now() - start,
        error: e instanceof Error ? e.message : String(e),
        localModeFallback
      }
    }
  }

  private discoverCountry(): string {
    return this.getSettings().musicDiscoverCountry?.trim() || 'China'
  }


  async search(q: string, filter = 'songs'): Promise<MusicSearchResult> {
    return this.discoverOps.search(q, filter)
  }

  searchLocalTracks(...args: Parameters<MusicServiceDiscover['searchLocalTracks']>) {
    return this.discoverOps.searchLocalTracks(...args)
  }

  async searchForQuickAccess(term: string, limit = 6): Promise<NormalizedTrack[]> {
    return this.discoverOps.searchForQuickAccess(term, limit)
  }

  async resolveTrack(...args: Parameters<MusicServiceDiscover['resolveTrack']>) {
    return this.discoverOps.resolveTrack(...args)
  }

  async getDiscoverSection<K extends DiscoverSectionKey>(section: K): Promise<MusicDiscoverFeed[K]> {
    return this.discoverOps.getDiscoverSection(section)
  }

  async refreshDiscoverSection<K extends DiscoverSectionKey>(section: K): Promise<MusicDiscoverFeed[K]> {
    return this.discoverOps.refreshDiscoverSection(section)
  }

  async getDiscoverFeed(...args: Parameters<MusicServiceDiscover['getDiscoverFeed']>) {
    return this.discoverOps.getDiscoverFeed(...args)
  }

  async getTrending(...args: Parameters<MusicServiceDiscover['getTrending']>) {
    return this.discoverOps.getTrending(...args)
  }

  async getCharts(...args: Parameters<MusicServiceDiscover['getCharts']>) {
    return this.discoverOps.getCharts(...args)
  }

  async getMoods(...args: Parameters<MusicServiceDiscover['getMoods']>) {
    return this.discoverOps.getMoods(...args)
  }

  async getMoodPlaylists(categoryId: string): Promise<MusicMoodPlaylist[]> {
    return this.discoverOps.getMoodPlaylists(categoryId)
  }

  async getPlaylistTracks(playlistId: string): Promise<NormalizedTrack[]> {
    return this.discoverOps.getPlaylistTracks(playlistId)
  }

  async getRadio(...args: Parameters<MusicServiceDiscover['getRadio']>) {
    return this.discoverOps.getRadio(...args)
  }

  async getSimilar(title: string, artist: string): Promise<NormalizedTrack[]> {
    return this.discoverOps.getSimilar(title, artist)
  }

  async getForYouFromHistory(...args: Parameters<MusicServiceDiscover['getForYouFromHistory']>) {
    return this.discoverOps.getForYouFromHistory(...args)
  }

  async getSong(...args: Parameters<MusicServiceDiscover['getSong']>) {
    return this.discoverOps.getSong(...args)
  }

  async getAlbum(browseId: string): Promise<{ album: unknown; tracks: NormalizedTrack[] }> {
    return this.discoverOps.getAlbum(browseId)
  }

  async getArtist(browseId: string): Promise<ReturnType<typeof mapArtistResponse>> {
    return this.discoverOps.getArtist(browseId)
  }

  async getLyrics(
    title: string,
    artist: string,
    hint?: Pick<NormalizedTrack, 'provider' | 'videoId' | 'trackKey'>
  ): Promise<MusicLyricsResult> {
    return this.discoverOps.getLyrics(title, artist, hint)
  }

  async resolveStream(
    track: NormalizedTrack,
    useCache = true,
    qualityOverride?: import('./platform/types').MusicPlatformQuality
  ): Promise<MusicStreamResult> {
    return this.discoverOps.resolveStream(track, useCache, qualityOverride)
  }

  listFavorites(): MusicFavoriteRow[] {
    return this.libraryOps.listFavorites()
  }

  isFavorite(trackKey: string): boolean {
    return this.libraryOps.isFavorite(trackKey)
  }

  async refreshPlatformLikedCache(): Promise<void> {
    return this.libraryOps.refreshPlatformLikedCache()
  }

  async syncPlatformFavorites(limit = 300): Promise<void> {
    return this.libraryOps.syncPlatformFavorites(limit)
  }

  async toggleFavorite(track: NormalizedTrack): Promise<boolean> {
    return this.libraryOps.toggleFavorite(track)
  }

  listHistory(limit = 50): MusicHistoryRow[] {
    return this.libraryOps.listHistory(limit)
  }

  appendHistory(track: NormalizedTrack): void {
    this.libraryOps.appendHistory(track)
  }

  clearHistory(): void {
    this.libraryOps.clearHistory()
  }


  close(): void {
    this.musicDb.close()
  }

  trackFromVideoId(videoId: string, title: string, artist: string, coverUrl?: string): NormalizedTrack {
    if (this.isPlatformPrimary()) {
      const provider = this.getSettings().musicPrimarySource === 'kugou' ? 'kugou' : 'netease'
      return {
        trackKey: `${provider}:${videoId}`,
        provider,
        videoId,
        title,
        artist,
        coverUrl
      }
    }
    return (
      mapVeromeTrack({ videoId, title, artist, thumbnail: coverUrl }) ?? {
        trackKey: `verome:${videoId}`,
        provider: 'verome',
        videoId,
        title,
        artist,
        coverUrl
      }
    )
  }

  // --- 网易云登录 / 搜索辅助 ---

  neteaseGetSessionSnapshot() {
    return this.platformOps.neteaseGetSessionSnapshot()
  }

  async neteaseLoginQrCheck(key: string) {
    return this.platformOps.neteaseLoginQrCheck(key)
  }

  async neteaseSendCaptcha(phone: string, countryCode = 86) {
    return this.platformOps.neteaseSendCaptcha(phone, countryCode)
  }

  async neteaseLoginPhone(phone: string, captcha: string, countryCode = 86) {
    return this.platformOps.neteaseLoginPhone(phone, captcha, countryCode)
  }

  async neteaseLoginCookie(musicU: string) {
    return this.platformOps.neteaseLoginCookie(musicU)
  }

  async neteaseLogout() {
    return this.platformOps.neteaseLogout()
  }

  async neteaseRefreshLogin() {
    return this.platformOps.neteaseRefreshLogin()
  }

  async kugouLoginQrCheck(key: string) {
    return this.platformOps.kugouLoginQrCheck(key)
  }

  async kugouSendCaptcha(phone: string, countryCode = 86) {
    return this.platformOps.kugouSendCaptcha(phone, countryCode)
  }

  async kugouLoginPhone(phone: string, captcha: string, countryCode = 86) {
    return this.platformOps.kugouLoginPhone(phone, captcha, countryCode)
  }

  async kugouLoginCookie(token: string) {
    return this.platformOps.kugouLoginCookie(token)
  }

  async kugouLogout() {
    return this.platformOps.kugouLogout()
  }

  async kugouRefreshLogin() {
    return this.platformOps.kugouRefreshLogin()
  }

  async searchSuggest(keywords: string) {
    return this.platformOps.searchSuggest(keywords)
  }

  async neteaseSearchSuggest(keywords: string) {
    return this.platformOps.neteaseSearchSuggest(keywords)
  }

  async getNeteaseUserPlaylists() {
    return this.platformOps.getNeteaseUserPlaylists()
  }

  async getNeteaseArtistList(limit = 30, offset = 0) {
    return this.platformOps.getNeteaseArtistList(limit, offset)
  }

  async getNeteaseNewAlbums(limit = 12) {
    return this.platformOps.getNeteaseNewAlbums(limit)
  }

  async getPlatformUserPlaylists() {
    return this.platformOps.getPlatformUserPlaylists()
  }

  async platformLoginQrKey() {
    return this.platformOps.platformLoginQrKey()
  }

  async platformLoginQrCheck(key: string) {
    return this.platformOps.platformLoginQrCheck(key)
  }

  async platformSendCaptcha(phone: string, countryCode = 86) {
    return this.platformOps.platformSendCaptcha(phone, countryCode)
  }

  async platformLoginPhone(phone: string, captcha: string, countryCode = 86) {
    return this.platformOps.platformLoginPhone(phone, captcha, countryCode)
  }

  async platformLoginCookie(credential: string) {
    return this.platformOps.platformLoginCookie(credential)
  }

  async platformLogout() {
    return this.platformOps.platformLogout()
  }

  async getNewAlbums(limit = 12, seed = 0) {
    return this.platformOps.getNewAlbums(limit, seed)
  }

  async getToplists() {
    return this.platformOps.getToplists()
  }

  async createPlatformPlaylist(name: string) {
    return this.platformOps.createPlatformPlaylist(name)
  }

  async deletePlatformPlaylist(playlistId: string) {
    return this.platformOps.deletePlatformPlaylist(playlistId)
  }

  async addPlatformPlaylistTracks(playlistId: string, songIds: string[]) {
    return this.platformOps.addPlatformPlaylistTracks(playlistId, songIds)
  }

  async removePlatformPlaylistTracks(playlistId: string, songIds: string[]) {
    return this.platformOps.removePlatformPlaylistTracks(playlistId, songIds)
  }

  async followPlatformArtist(artistId: string, follow: boolean) {
    return this.platformOps.followPlatformArtist(artistId, follow)
  }

  async getPlatformSongComments(songId: string, page = 1) {
    return this.platformOps.getPlatformSongComments(songId, page)
  }

  async getPlatformMvDetail(browseId: string) {
    return this.platformOps.getPlatformMvDetail(browseId)
  }

  async resolvePlatformMvStream(mvId: string) {
    return this.platformOps.resolvePlatformMvStream(mvId)
  }

  async getPlatformRadioCategories() {
    return this.platformOps.getPlatformRadioCategories()
  }

  async getPlatformRadioTracks(categoryId: string, limit = 30) {
    return this.platformOps.getPlatformRadioTracks(categoryId, limit)
  }

}