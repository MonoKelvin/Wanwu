import { randomUUID } from 'crypto'
import type { DatabaseService } from '../core/database'
import type { AppSettings } from '../../../src/shared/types/settings'
import { DEFAULT_VEROME_BASE_URL, VeromeClient } from './veromeClient'
import { MusicDatabase } from './db'
import { StreamCacheService } from './streamCacheService'
import {
  mapChartsResponse,
  mapMoodPlaylistsResponse,
  mapMoodsResponse,
  mapPlaylistTracks,
  mapSearchResponse,
  mapTopTracksResponse,
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
import { buildDiscoverFeed, fetchDiscoverSection, type DiscoverFeedDeps } from './discoverFeed'
import { DiscoverCacheService, type DiscoverSectionKey } from './discoverCache'
import { ensurePlayableTrack, enrichTrackCover, hydrateMissingCovers, normalizeForPlayback, promoteTracksToVerome } from './trackPlayback'
import { MusicPlatformManager } from './platform/MusicPlatformManager'
import { MusicSearchType } from './platform/types'
import { parseBrowseId } from './platform/browseId'
import { CHINESE_MOOD_FALLBACK } from './moodLabels'
import { resolvePlayableStream } from './streamResolver'
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
} from '../../../src/shared/types/music'

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

  constructor(
    private readonly db: DatabaseService,
    basePath: string
  ) {
    this.musicDb = new MusicDatabase(basePath)
    this.streamCache = new StreamCacheService(basePath, this.verome)
    this.platforms = new MusicPlatformManager(basePath)
  }

  private isNeteasePrimary(): boolean {
    return this.getSettings().musicPrimarySource === 'netease'
  }

  private isPlatformPrimary(): boolean {
    const s = this.getSettings().musicPrimarySource
    return s === 'netease' || s === 'kugou'
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
    await this.refreshApiClient()

    if (this.isPlatformPrimary()) {
      const typeMap: Record<string, MusicSearchType> = {
        songs: MusicSearchType.Song,
        albums: MusicSearchType.Album,
        artists: MusicSearchType.Artist,
        playlists: MusicSearchType.Playlist
      }
      const type = typeMap[filter] ?? MusicSearchType.Song
      return this.primaryPlatform().cloudSearch(q, type, 30)
    }

    let mapped: MusicSearchResult = { tracks: [], albums: [], artists: [] }

    try {
      const data = await this.verome.search(q, filter)
      mapped = mapSearchResponse(data)
    } catch {
      /* Verome 不可用时由聚合器兜底 */
    }

    if (filter === 'songs') {
      const seen = new Set(mapped.tracks.map((t) => t.trackKey))

      try {
        const kuwoHits = await this.kuwo.searchTracks(q, 12)
        for (const t of kuwoHits) {
          if (seen.has(t.trackKey)) continue
          seen.add(t.trackKey)
          mapped.tracks.push(t)
        }
      } catch {
        /* ignore */
      }

      if (this.aggregator) {
        const extra = await this.aggregator.searchTracks(q, 20, this.verome)
        for (const t of extra) {
          if (seen.has(t.trackKey)) continue
          if (t.provider === 'itunes' || t.provider === 'musicbrainz' || t.provider === 'kuwo') continue
          seen.add(t.trackKey)
          mapped.tracks.push(t)
        }
      }

      mapped.tracks = await promoteTracksToVerome(this.verome, mapped.tracks, 14)

      mapped.tracks = await hydrateMissingCovers(
        { itunes: this.itunes, kuwo: this.kuwo },
        mapped.tracks,
        Math.min(mapped.tracks.length, 12)
      )
    }

    return mapped
  }

  searchLocalTracks(term: string, limit = 6): NormalizedTrack[] {
    const like = `%${term.trim()}%`
    if (!like.replace(/%/g, '').length) return []
    const db = this.musicDb.getDb()
    const rows = db
      .prepare(
        `SELECT payload_json FROM (
           SELECT payload_json, created_at AS ts FROM music_favorites
           WHERE title LIKE ? OR artist LIKE ?
           UNION ALL
           SELECT payload_json, played_at AS ts FROM music_history
           WHERE title LIKE ? OR artist LIKE ?
         ) ORDER BY ts DESC LIMIT ?`
      )
      .all(like, like, like, like, limit) as Array<{ payload_json: string }>
    const tracks: NormalizedTrack[] = []
    const seen = new Set<string>()
    for (const row of rows) {
      try {
        const t = JSON.parse(row.payload_json) as NormalizedTrack
        if (!seen.has(t.trackKey)) {
          seen.add(t.trackKey)
          tracks.push(t)
        }
      } catch {
        /* skip */
      }
    }
    return tracks
  }

  async searchForQuickAccess(term: string, limit = 6): Promise<NormalizedTrack[]> {
    const local = this.searchLocalTracks(term, Math.min(3, limit))
    await this.refreshApiClient()
    let remote: NormalizedTrack[] = []
    if (this.isPlatformPrimary()) {
      const { MusicSearchType } = await import('./platform/types')
      const result = await this.primaryPlatform().cloudSearch(term, MusicSearchType.Song, limit)
      remote = result.tracks
    } else if (this.aggregator) {
      remote = await this.aggregator.searchTracks(term, limit, this.verome)
    }
    const seen = new Set<string>()
    const merged: NormalizedTrack[] = []
    for (const t of [...local, ...remote]) {
      const k = t.trackKey
      if (seen.has(k)) continue
      seen.add(k)
      merged.push(t)
      if (merged.length >= limit) break
    }
    return merged
  }

  async resolveTrack(track: NormalizedTrack): Promise<NormalizedTrack> {
    await this.refreshApiClient()
    const enriched = enrichTrackCover(track)
    if (enriched.provider === 'netease' || enriched.provider === 'kugou') return enriched
    if (enriched.provider !== 'verome') return enriched
    return ensurePlayableTrack(this.verome, enriched)
  }

  private discoverDeps(): DiscoverFeedDeps {
    return {
      verome: this.verome,
      itunes: this.itunes,
      kuwo: this.kuwo,
      audius: this.audius,
      country: this.discoverCountry(),
      getSimilar: (title, artist) => this.getSimilar(title, artist),
      getRadio: (videoId) => this.getRadio(videoId),
      listHistoryPayload: () => {
        const history = this.listHistory(1)[0]
        if (!history) return null
        try {
          return JSON.parse(history.payloadJson) as NormalizedTrack
        } catch {
          return {
            trackKey: history.trackKey,
            provider: 'verome',
            videoId: history.videoId,
            title: history.title,
            artist: history.artist,
            coverUrl: history.coverUrl ?? undefined
          }
        }
      }
    }
  }

  private discoverSectionKeys(): DiscoverSectionKey[] {
    return ['forYou', 'trending', 'newReleases', 'chartTracks', 'chartPlaylists']
  }

  private isDiscoverSectionEmpty(data: unknown): boolean {
    return Array.isArray(data) && data.length === 0
  }

  private cacheDiscoverFeed(feed: MusicDiscoverFeed): void {
    for (const key of this.discoverSectionKeys()) {
      const existing = this.discoverCache.get(key)
      const incoming = feed[key]
      if (
        this.isDiscoverSectionEmpty(incoming) &&
        existing !== null &&
        !this.isDiscoverSectionEmpty(existing)
      ) {
        continue
      }
      this.discoverCache.set(key, incoming)
    }
  }

  private async ensurePlatformDiscoverFeed(force = false): Promise<MusicDiscoverFeed> {
    if (!force && this.platformDiscoverFeedInflight) {
      return this.platformDiscoverFeedInflight
    }

    const task = (async () => {
      const feed = await this.primaryPlatform().buildDiscoverFeed()
      this.cacheDiscoverFeed(feed)
      return feed
    })()

    this.platformDiscoverFeedInflight = task
    try {
      return await task
    } finally {
      if (this.platformDiscoverFeedInflight === task) {
        this.platformDiscoverFeedInflight = null
      }
    }
  }

  async getDiscoverSection<K extends DiscoverSectionKey>(
    section: K
  ): Promise<MusicDiscoverFeed[K]> {
    await this.refreshApiClient()
    const cached = this.discoverCache.get(section)
    if (cached !== null && !this.isDiscoverSectionEmpty(cached)) return cached

    if (this.isPlatformPrimary()) {
      const feed = await this.ensurePlatformDiscoverFeed()
      return feed[section]
    }

    const data = await fetchDiscoverSection(section, this.discoverDeps())
    this.discoverCache.set(section, data)
    return data
  }

  async refreshDiscoverSection<K extends DiscoverSectionKey>(
    section: K
  ): Promise<MusicDiscoverFeed[K]> {
    await this.refreshApiClient()
    if (this.isPlatformPrimary()) {
      return this.discoverCache.refresh(section, async () => {
        this.platformDiscoverFeedInflight = null
        const feed = await this.primaryPlatform().buildDiscoverFeed()
        this.cacheDiscoverFeed(feed)
        return feed[section]
      })
    }
    return this.discoverCache.refresh(section, () =>
      fetchDiscoverSection(section, this.discoverDeps())
    )
  }

  async getDiscoverFeed(): Promise<MusicDiscoverFeed> {
    await this.refreshApiClient()
    if (this.isPlatformPrimary()) {
      return this.ensurePlatformDiscoverFeed()
    }

    const keys = this.discoverSectionKeys()
    const allCached = keys.every((k) => {
      const v = this.discoverCache.get(k)
      return v !== null && !this.isDiscoverSectionEmpty(v)
    })
    if (allCached) return this.discoverCache.snapshot()

    const feed = await buildDiscoverFeed(this.discoverDeps())
    this.cacheDiscoverFeed(feed)
    return feed
  }

  async getTrending(): Promise<MusicTrendingPayload> {
    await this.refreshApiClient()
    if (this.isPlatformPrimary()) {
      return this.primaryPlatform().getTrending()
    }
    const country = this.discoverCountry()
    try {
      const data = await this.verome.getTrending(country)
      return mapTrendingResponse(data, country)
    } catch {
      return { country, tracks: [] }
    }
  }

  async getCharts(): Promise<MusicChartsPayload> {
    await this.refreshApiClient()
    if (this.isPlatformPrimary()) {
      return this.primaryPlatform().getCharts()
    }
    const country = this.discoverCountry()
    let payload: MusicChartsPayload = { sections: [], country }
    try {
      const data = await this.verome.getCharts(country)
      payload = mapChartsResponse(data)
      payload.country = country
    } catch {
      /* fallback below */
    }

    const hasTrackSections = payload.sections.some(
      (s) => s.kind === 'songs' || s.kind === 'trending' || s.kind === 'videos'
    )
    if (!hasTrackSections) {
      try {
        const top = await this.verome.getTopTracks(country)
        const tracks = mapTopTracksResponse(top)
        if (tracks.length) {
          payload.sections.unshift({
            kind: 'songs',
            title: '热门歌曲',
            items: tracks
          })
        }
      } catch {
        /* ignore */
      }
    }

    return payload
  }

  async getMoods(): Promise<MusicMoodCategory[]> {
    await this.refreshApiClient()
    if (this.isPlatformPrimary()) {
      const moods = await this.primaryPlatform().getMoodCategories()
      if (moods.length) return moods
      return CHINESE_MOOD_FALLBACK
    }
    try {
      const data = await this.verome.getMoods()
      const moods = mapMoodsResponse(data)
      if (moods.length) return moods
    } catch {
      /* fallback below */
    }
    return CHINESE_MOOD_FALLBACK
  }

  async getMoodPlaylists(categoryId: string): Promise<MusicMoodPlaylist[]> {
    await this.refreshApiClient()
    const slug = decodeURIComponent(categoryId.trim())

    if (this.isPlatformPrimary()) {
      const summaries = await this.primaryPlatform().getPlaylistSummaries(slug, 20)
      if (summaries.length) {
        return summaries.map((p) => ({
          playlistId: p.id,
          title: p.title,
          coverUrl: p.coverUrl
        }))
      }
      return this.primaryPlatform()
        .getPersonalizedPlaylists(12)
        .catch(() => [])
    }

    let playlists: MusicMoodPlaylist[] = []
    try {
      const data = await this.verome.getMoodPlaylists(slug)
      playlists = mapMoodPlaylistsResponse(data)
    } catch {
      /* fallback below */
    }
    if (playlists.length) return playlists

    try {
      const kuwoTracks = await this.kuwo.searchTracks(slug, 14)
      const promoted = await promoteTracksToVerome(this.verome, kuwoTracks, 12)
      if (promoted.length) {
        return promoted.map((t) => ({
          playlistId: t.videoId,
          title: t.title,
          coverUrl: t.coverUrl
        }))
      }
    } catch {
      /* ignore */
    }

    try {
      const searchData = await this.verome.search(`${slug} playlist`, 'songs')
      const tracks = mapSearchResponse(searchData).tracks.slice(0, 12)
      if (tracks.length) {
        return tracks.map((t) => ({
          playlistId: t.videoId,
          title: t.title,
          coverUrl: t.coverUrl
        }))
      }
    } catch {
      /* ignore */
    }

    try {
      const trending = await this.getTrending()
      return trending.tracks.slice(0, 8).map((t) => ({
        playlistId: t.videoId,
        title: t.title,
        coverUrl: t.coverUrl
      }))
    } catch {
      return []
    }
  }

  async getPlaylistTracks(playlistId: string): Promise<NormalizedTrack[]> {
    await this.refreshApiClient()
    const ref = parseBrowseId(playlistId)
    if (this.isPlatformPrimary() || ref) {
      const platform = ref ? this.platforms.get(ref.platform) : this.primaryPlatform()
      return platform.getPlaylistTracks(playlistId)
    }
    const data = await this.verome.getPlaylist(playlistId)
    return mapPlaylistTracks(data)
  }

  async getRadio(videoId: string): Promise<NormalizedTrack[]> {
    await this.refreshApiClient()
    if (this.isPlatformPrimary()) {
      return this.primaryPlatform().getPersonalFm()
    }
    const data = (await this.verome.getRadio(videoId)) as { tracks?: unknown[] }
    return mapPlaylistTracks(data)
  }

  async getSimilar(title: string, artist: string): Promise<NormalizedTrack[]> {
    await this.refreshApiClient()
    const data = await this.verome.getSimilar(title, artist, '12')
    return mapPlaylistTracks(Array.isArray(data) ? data : { tracks: data })
  }

  async getForYouFromHistory(): Promise<NormalizedTrack[]> {
    const feed = await this.getDiscoverFeed()
    return feed.forYou
  }

  async getSong(videoId: string): Promise<unknown> {
    await this.refreshApiClient()
    return this.verome.getSong(videoId)
  }

  async getAlbum(browseId: string): Promise<{ album: unknown; tracks: NormalizedTrack[] }> {
    await this.refreshApiClient()
    const ref = parseBrowseId(browseId)
    if (this.isPlatformPrimary() || ref) {
      const platform = ref ? this.platforms.get(ref.platform) : this.primaryPlatform()
      return platform.getAlbum(browseId)
    }
    const data = (await this.verome.getAlbum(browseId)) as Record<string, unknown>
    const tracks = mapPlaylistTracks(data.tracks ?? data.songs ?? data)
    return { album: data, tracks }
  }

  async getArtist(browseId: string): Promise<ReturnType<typeof mapArtistResponse>> {
    await this.refreshApiClient()
    const ref = parseBrowseId(browseId)
    if (this.isPlatformPrimary() || ref) {
      const platform = ref ? this.platforms.get(ref.platform) : this.primaryPlatform()
      return platform.getArtist(browseId)
    }
    const data = await this.verome.getArtist(browseId)
    return mapArtistResponse(data)
  }

  async getLyrics(
    title: string,
    artist: string,
    hint?: Pick<NormalizedTrack, 'provider' | 'videoId' | 'trackKey'>
  ): Promise<MusicLyricsResult> {
    const tryKuwoId = async (musicId: string): Promise<MusicLyricsResult | null> => {
      const result = await this.kuwo.getLyrics(musicId)
      return result.lrc || result.plain ? result : null
    }

    if ((hint?.provider === 'netease' || hint?.provider === 'kugou') && hint.videoId) {
      try {
        const lyric = await this.platforms.get(hint.provider).getLyrics(hint.videoId)
        if (lyric.lrc || lyric.plain) return lyric
      } catch {
        /* ignore */
      }
    }

    if (hint?.provider === 'kuwo' && hint.videoId) {
      const kuwoLyric = await tryKuwoId(hint.videoId)
      if (kuwoLyric) return kuwoLyric
    }

    try {
      const musicId = await this.kuwo.findMusicId(title, artist)
      if (musicId) {
        const kuwoLyric = await tryKuwoId(musicId)
        if (kuwoLyric) return kuwoLyric
      }
    } catch {
      /* ignore */
    }

    try {
      await this.refreshApiClient()
      const data = (await this.verome.getLyrics(title, artist)) as {
        lyrics?: string
        syncedLyrics?: string
        lrc?: string
      }
      const lrc = data.lrc ?? data.syncedLyrics
      const plain = data.lyrics
      if (lrc || plain) return { lrc, plain }
    } catch {
      /* ignore */
    }

    return {}
  }

  async resolveStream(
    track: NormalizedTrack,
    useCache = true,
    qualityOverride?: import('./platform/types').MusicPlatformQuality
  ): Promise<MusicStreamResult> {
    await this.refreshApiClient()
    const normalized =
      track.provider === 'netease' || track.provider === 'kugou'
        ? enrichTrackCover(track)
        : await normalizeForPlayback(this.verome, track)

    const quality = qualityOverride ?? this.getSettings().musicNeteaseQuality

    if (normalized.provider === 'netease' || normalized.provider === 'kugou') {
      try {
        const picked = await this.platforms.get(normalized.provider).resolveStream(normalized.videoId, quality)
        if (picked?.url) {
          const cached = await this.streamCache.resolveWithCache(
            normalized,
            { url: picked.url, format: picked.format },
            useCache
          )
          return {
            url: cached.url,
            cachedPath: cached.cachedPath,
            track: enrichTrackCover(normalized),
            format: cached.format
          }
        }
      } catch {
        /* fallback to registry */
      }
    }

    const resolved = await resolvePlayableStream(normalized, {
      registry: this.registry,
      streamCache: this.streamCache,
      verome: this.verome,
      audius: this.audius,
      jamendo: this.jamendo
    })

    if (!resolved) throw new Error('无法获取音频流地址')

    let playableTrack = resolved.track
    if (!playableTrack.coverUrl) {
      const hydrated = await hydrateMissingCovers(
        { itunes: this.itunes, kuwo: this.kuwo },
        [playableTrack],
        2
      )
      playableTrack = hydrated[0] ?? playableTrack
    }

    const cached = await this.streamCache.resolveWithCache(
      playableTrack,
      { url: resolved.url, format: resolved.format },
      useCache
    )
    return {
      url: cached.url,
      cachedPath: cached.cachedPath,
      track: enrichTrackCover(playableTrack),
      format: cached.format
    }
  }

  listFavorites(): MusicFavoriteRow[] {
    const rows = this.musicDb
      .getDb()
      .prepare(
        'SELECT track_key, title, artist, video_id, cover_url, payload_json, created_at FROM music_favorites ORDER BY created_at DESC'
      )
      .all() as Array<{
      track_key: string
      title: string
      artist: string
      video_id: string
      cover_url: string | null
      payload_json: string
      created_at: string
    }>
    return rows.map((r) => ({
      trackKey: r.track_key,
      title: r.title,
      artist: r.artist,
      videoId: r.video_id,
      coverUrl: r.cover_url,
      payloadJson: r.payload_json,
      createdAt: r.created_at
    }))
  }

  isFavorite(trackKey: string): boolean {
    const row = this.musicDb
      .getDb()
      .prepare('SELECT 1 FROM music_favorites WHERE track_key = ?')
      .get(trackKey)
    return !!row
  }

  toggleFavorite(track: NormalizedTrack): boolean {
    const db = this.musicDb.getDb()
    const existing = db.prepare('SELECT 1 FROM music_favorites WHERE track_key = ?').get(track.trackKey)
    const nextLiked = !existing
    if (existing) {
      db.prepare('DELETE FROM music_favorites WHERE track_key = ?').run(track.trackKey)
    } else {
      db.prepare(
        `INSERT INTO music_favorites (track_key, title, artist, video_id, cover_url, payload_json, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).run(
        track.trackKey,
        track.title,
        track.artist,
        track.videoId,
        track.coverUrl ?? null,
        JSON.stringify(track),
        new Date().toISOString()
      )
    }
    if (track.provider === 'netease' || track.provider === 'kugou') {
      void this.platforms
        .get(track.provider)
        .likeSong(track.videoId, nextLiked)
        .catch(() => {})
    }
    return nextLiked
  }

  listHistory(limit = 50): MusicHistoryRow[] {
    this.compactHistoryDuplicates()
    const rows = this.musicDb
      .getDb()
      .prepare(
        `SELECT id, track_key, title, artist, video_id, cover_url, payload_json, played_at
         FROM music_history ORDER BY played_at DESC LIMIT ?`
      )
      .all(limit) as Array<{
      id: string
      track_key: string
      title: string
      artist: string
      video_id: string
      cover_url: string | null
      payload_json: string
      played_at: string
    }>
    return rows.map((r) => ({
      id: r.id,
      trackKey: r.track_key,
      title: r.title,
      artist: r.artist,
      videoId: r.video_id,
      coverUrl: r.cover_url,
      payloadJson: r.payload_json,
      playedAt: r.played_at
    }))
  }

  appendHistory(track: NormalizedTrack): void {
    const db = this.musicDb.getDb()
    const playedAt = new Date().toISOString()
    const payload = JSON.stringify(track)
    const tx = db.transaction(() => {
      db.prepare('DELETE FROM music_history WHERE track_key = ?').run(track.trackKey)
      db.prepare(
        `INSERT INTO music_history (id, track_key, title, artist, video_id, cover_url, payload_json, played_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        randomUUID(),
        track.trackKey,
        track.title,
        track.artist,
        track.videoId,
        track.coverUrl ?? null,
        payload,
        playedAt
      )
    })
    tx()
  }

  /** 保留每首歌最近一条播放记录，删除更早的重复项 */
  private compactHistoryDuplicates(): void {
    this.musicDb.getDb().exec(`
      DELETE FROM music_history
      WHERE id IN (
        SELECT h1.id
        FROM music_history h1
        INNER JOIN music_history h2
          ON h1.track_key = h2.track_key AND h1.played_at < h2.played_at
      )
    `)
  }

  clearHistory(): void {
    this.musicDb.getDb().prepare('DELETE FROM music_history').run()
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

  async neteaseGetLoginStatus(): Promise<MusicNeteaseLoginStatus> {
    await this.refreshApiClient()
    return this.netease().getLoginStatus()
  }

  neteaseGetSessionSnapshot() {
    return this.netease().getSessionSnapshot()
  }

  async neteaseLoginQrKey(): Promise<MusicNeteaseQrLogin> {
    await this.refreshApiClient()
    return this.netease().loginQrKey()
  }

  async neteaseLoginQrCheck(key: string) {
    await this.refreshApiClient()
    return this.netease().loginQrCheck(key)
  }

  async neteaseSendCaptcha(phone: string, countryCode = 86) {
    await this.refreshApiClient()
    return this.netease().sendPhoneCaptcha(phone, countryCode)
  }

  async neteaseLoginPhone(phone: string, captcha: string, countryCode = 86) {
    await this.refreshApiClient()
    return this.netease().loginPhone(phone, captcha, countryCode)
  }

  async neteaseLoginCookie(musicU: string) {
    await this.refreshApiClient()
    this.netease().setMusicUCookie(musicU)
    return this.netease().getLoginStatus()
  }

  async neteaseLogout() {
    await this.refreshApiClient()
    await this.netease().logout()
  }

  async neteaseRefreshLogin() {
    await this.refreshApiClient()
    await this.netease().refreshLoginIfNeeded()
    return this.netease().getLoginStatus()
  }

  // --- 酷狗登录 ---

  async kugouGetLoginStatus(): Promise<MusicNeteaseLoginStatus> {
    await this.refreshApiClient()
    return this.platforms.kugou.getLoginStatus()
  }

  async kugouLoginQrKey(): Promise<MusicNeteaseQrLogin> {
    await this.refreshApiClient()
    return this.platforms.kugou.loginQrKey()
  }

  async kugouLoginQrCheck(key: string) {
    await this.refreshApiClient()
    return this.platforms.kugou.loginQrCheck(key)
  }

  async kugouSendCaptcha(phone: string, countryCode = 86) {
    await this.refreshApiClient()
    return this.platforms.kugou.sendPhoneCaptcha(phone, countryCode)
  }

  async kugouLoginPhone(phone: string, captcha: string, countryCode = 86) {
    await this.refreshApiClient()
    return this.platforms.kugou.loginPhone(phone, captcha, countryCode)
  }

  async kugouLoginCookie(token: string) {
    await this.refreshApiClient()
    this.platforms.kugou.setMusicUCookie(token)
    return this.platforms.kugou.getLoginStatus()
  }

  async kugouLogout() {
    await this.refreshApiClient()
    await this.platforms.kugou.logout()
  }

  async kugouRefreshLogin() {
    await this.refreshApiClient()
    await this.platforms.kugou.refreshLoginIfNeeded()
    return this.platforms.kugou.getLoginStatus()
  }

  async searchHot(limit = 10): Promise<MusicHotSearchEntry[]> {
    await this.refreshApiClient()
    if (!this.isPlatformPrimary()) return []
    return this.primaryPlatform().searchHot(limit)
  }

  async searchSuggest(keywords: string) {
    await this.refreshApiClient()
    if (!this.isPlatformPrimary()) return []
    return this.primaryPlatform().searchSuggest(keywords)
  }

  async searchDefault(): Promise<string> {
    await this.refreshApiClient()
    if (!this.isPlatformPrimary()) return ''
    return this.primaryPlatform().searchDefault()
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
    await this.refreshApiClient()
    if (!this.isPlatformPrimary()) return []
    return this.primaryPlatform().getDailyRecommend()
  }

  async getPersonalFm(): Promise<NormalizedTrack[]> {
    await this.refreshApiClient()
    if (!this.isPlatformPrimary()) return []
    return this.primaryPlatform().getPersonalFm()
  }

  async trashPersonalFm(songId: string): Promise<void> {
    await this.refreshApiClient()
    if (!this.isPlatformPrimary()) return
    await this.primaryPlatform().trashPersonalFm(songId)
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

  async getNeteaseArtistList(limit = 30) {
    await this.refreshApiClient()
    if (!this.isPlatformPrimary()) return []
    return this.primaryPlatform().getArtistList('-1', -1, '-1', limit)
  }

  async getNeteaseNewAlbums(limit = 12) {
    await this.refreshApiClient()
    if (!this.isPlatformPrimary()) return []
    return this.primaryPlatform().getNewAlbums(limit)
  }

  // --- 平台账号（随 musicPrimarySource，Verome 主源时默认走网易库） ---

  getPlatformSessionSnapshot(): MusicPlatformSessionSnapshot {
    return this.accountPlatform().getSessionSnapshot()
  }

  async getPlatformLoginStatus(): Promise<MusicNeteaseLoginStatus> {
    await this.refreshApiClient()
    return this.accountPlatform().getLoginStatus()
  }

  async getPlatformUserProfile(): Promise<MusicPlatformUserProfile> {
    await this.refreshApiClient()
    const platform = this.accountPlatform()
    const profile = await platform.getUserProfile()
    return { ...profile, platform: this.accountPlatformId() }
  }

  async refreshPlatformLogin(): Promise<MusicNeteaseLoginStatus> {
    await this.refreshApiClient()
    const platform = this.accountPlatform()
    await platform.refreshLoginIfNeeded()
    return platform.getLoginStatus()
  }

  async getPlatformUserPlaylists() {
    await this.refreshApiClient()
    return this.accountPlatform().getUserPlaylists()
  }

  async getPlatformLikedTracks(limit = 50): Promise<NormalizedTrack[]> {
    await this.refreshApiClient()
    const platform = this.accountPlatform()
    if (this.accountPlatformId() === 'kugou') {
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
    await this.refreshApiClient()
    return this.accountPlatform().getUserCloud(limit)
  }

  async getPlatformSubscribed(
    kind: MusicPlatformSubscribedKind,
    limit = 30
  ): Promise<MusicPlatformSubscribedItem[]> {
    await this.refreshApiClient()
    return this.accountPlatform().getSubscribed(kind, limit)
  }

  // --- 统一平台登录（随 musicPrimarySource） ---

  async platformLoginQrKey() {
    await this.refreshApiClient()
    return this.accountPlatform().loginQrKey()
  }

  async platformLoginQrCheck(key: string) {
    await this.refreshApiClient()
    return this.accountPlatform().loginQrCheck(key)
  }

  async platformSendCaptcha(phone: string, countryCode = 86) {
    await this.refreshApiClient()
    return this.accountPlatform().sendPhoneCaptcha(phone, countryCode)
  }

  async platformLoginPhone(phone: string, captcha: string, countryCode = 86) {
    await this.refreshApiClient()
    return this.accountPlatform().loginPhone(phone, captcha, countryCode)
  }

  async platformLoginCookie(credential: string) {
    await this.refreshApiClient()
    const platform = this.accountPlatform()
    platform.setMusicUCookie(credential)
    return platform.getLoginStatus()
  }

  async platformLogout() {
    await this.refreshApiClient()
    await this.accountPlatform().logout()
  }

  async platformLikeSong(songId: string, like: boolean): Promise<void> {
    await this.refreshApiClient()
    if (!this.isPlatformPrimary()) return
    await this.primaryPlatform().likeSong(songId, like)
  }

  async getNewSongs(limit = 30): Promise<NormalizedTrack[]> {
    await this.refreshApiClient()
    if (!this.isPlatformPrimary()) return []
    return this.primaryPlatform().getNewSongs(limit)
  }

  async getNewAlbums(limit = 12) {
    await this.refreshApiClient()
    if (!this.isPlatformPrimary()) return []
    return this.primaryPlatform().getNewAlbums(limit)
  }

  async getToplists() {
    await this.refreshApiClient()
    if (!this.isPlatformPrimary()) return []
    return this.primaryPlatform().getToplists()
  }

  async getToplistTracks(toplistId: string, limit = 50): Promise<NormalizedTrack[]> {
    await this.refreshApiClient()
    if (!this.isPlatformPrimary()) return []
    return this.primaryPlatform().getToplistTracks(toplistId, limit)
  }

  async createPlatformPlaylist(name: string) {
    await this.refreshApiClient()
    return this.accountPlatform().createPlaylist(name)
  }

  async deletePlatformPlaylist(playlistId: string) {
    await this.refreshApiClient()
    await this.accountPlatform().deletePlaylist(playlistId)
  }

  async addPlatformPlaylistTracks(playlistId: string, songIds: string[]) {
    await this.refreshApiClient()
    await this.accountPlatform().addPlaylistTracks(playlistId, songIds)
  }

  async removePlatformPlaylistTracks(playlistId: string, songIds: string[]) {
    await this.refreshApiClient()
    await this.accountPlatform().removePlaylistTracks(playlistId, songIds)
  }

  async followPlatformArtist(artistId: string, follow: boolean) {
    await this.refreshApiClient()
    await this.accountPlatform().followArtist(artistId, follow)
  }

  async getPlatformSongComments(songId: string, page = 1) {
    await this.refreshApiClient()
    if (!this.isPlatformPrimary()) return { comments: [], hasMore: false }
    return this.primaryPlatform().getSongComments(songId, page)
  }

  async getPlatformMvDetail(browseId: string) {
    await this.refreshApiClient()
    const ref = parseBrowseId(browseId)
    const platform = ref ? this.platforms.get(ref.platform) : this.primaryPlatform()
    return platform.getMvDetail(browseId)
  }

  async resolvePlatformMvStream(mvId: string) {
    await this.refreshApiClient()
    if (!this.isPlatformPrimary()) return null
    return this.primaryPlatform().resolveMvStream(mvId)
  }

  async getPlatformRadioCategories() {
    await this.refreshApiClient()
    if (!this.isPlatformPrimary()) return []
    return this.primaryPlatform().getRadioCategories()
  }

  async getPlatformRadioTracks(categoryId: string, limit = 30) {
    await this.refreshApiClient()
    if (!this.isPlatformPrimary()) return []
    return this.primaryPlatform().getRadioTracks(categoryId, limit)
  }
}
