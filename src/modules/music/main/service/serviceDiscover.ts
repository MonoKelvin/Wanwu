import type { VeromeClient } from './veromeClient'
import type { MusicDatabase } from './db'
import type { StreamCacheService } from './streamCacheService'
import {
  mapChartsResponse,
  mapMoodPlaylistsResponse,
  mapMoodsResponse,
  mapPlaylistTracks,
  mapSearchResponse,
  mapTopTracksResponse,
  mapTrendingResponse,
  mapArtistResponse
} from './discoveryMapper'
import { JamendoProvider } from './providers/jamendoProvider'
import { AudiusProvider } from './providers/audiusProvider'
import { KuwoProvider } from './providers/kuwoProvider'
import { ItunesProvider } from './providers/itunesProvider'
import { MusicAggregator } from './musicAggregator'
import { MusicProviderRegistry } from './providers/MusicProviderRegistry'
import { buildDiscoverFeed, fetchDiscoverSection, type DiscoverFeedDeps } from './discoverFeed'
import { DiscoverCacheService, type DiscoverSectionKey } from './discoverCache'
import { ensurePlayableTrack, enrichTrackCover, hydrateMissingCovers, mergeTrackPlaybackMeta, normalizeForPlayback, promoteTracksToVerome } from './trackPlayback'
import type { MusicPlatformManager } from './platform/MusicPlatformManager'
import type { IMusicPlatformService } from './platform/IMusicPlatformService'
import { MusicSearchType } from './platform/types'
import { parseBrowseId } from './platform/browseId'
import { CHINESE_MOOD_FALLBACK } from './moodLabels'
import { resolvePlayableStream } from './streamResolver'
import type { TtlRequestCache } from './ttlRequestCache'
import { readMusicModuleSettings } from '@modules/music/domain/settings'
import type {
  MusicChartsPayload,
  MusicDiscoverFeed,
  MusicHistoryRow,
  MusicLyricsResult,
  MusicMoodCategory,
  MusicMoodPlaylist,
  MusicSearchResult,
  MusicStreamResult,
  MusicTrendingPayload,
  NormalizedTrack
} from '@modules/music/domain/types'

export interface MusicServiceDiscoverHost {
  verome: VeromeClient
  kuwo: KuwoProvider
  itunes: ItunesProvider
  audius: AudiusProvider | null
  jamendo: JamendoProvider | null
  aggregator: MusicAggregator | null
  registry: MusicProviderRegistry | null
  discoverCache: DiscoverCacheService
  platforms: MusicPlatformManager
  streamCache: StreamCacheService
  musicDb: MusicDatabase
  platformDiscoverFeedInflight: Promise<MusicDiscoverFeed> | null
  readCache: TtlRequestCache
  refreshApiClient(): Promise<unknown>
  isPlatformPrimary(): boolean
  primaryPlatform(): IMusicPlatformService
  resolveDiscoverPlatform(): IMusicPlatformService | null
  discoverCountry(): string
  getSettings(): AppSettings
  listHistory(limit?: number): MusicHistoryRow[]
  readCacheKey(suffix: string): string
}

export class MusicServiceDiscover {
  constructor(readonly host: MusicServiceDiscoverHost) {}

  async search(q: string, filter = 'songs'): Promise<MusicSearchResult> {
    await this.host.refreshApiClient()

    if (this.host.isPlatformPrimary()) {
      const typeMap: Record<string, MusicSearchType> = {
        songs: MusicSearchType.Song,
        albums: MusicSearchType.Album,
        artists: MusicSearchType.Artist,
        playlists: MusicSearchType.Playlist
      }
      const type = typeMap[filter] ?? MusicSearchType.Song
      return this.host.primaryPlatform().cloudSearch(q, type, 30)
    }

    let mapped: MusicSearchResult = { tracks: [], albums: [], artists: [] }

    try {
      const data = await this.host.verome.search(q, filter)
      mapped = mapSearchResponse(data)
    } catch {
      /* Verome 不可用时由聚合器兜底 */
    }

    if (filter === 'songs') {
      const seen = new Set(mapped.tracks.map((t) => t.trackKey))

      try {
        const kuwoHits = await this.host.kuwo.searchTracks(q, 12)
        for (const t of kuwoHits) {
          if (seen.has(t.trackKey)) continue
          seen.add(t.trackKey)
          mapped.tracks.push(t)
        }
      } catch {
        /* ignore */
      }

      if (this.host.aggregator) {
        const extra = await this.host.aggregator.searchTracks(q, 20, this.host.verome)
        for (const t of extra) {
          if (seen.has(t.trackKey)) continue
          if (t.provider === 'itunes' || t.provider === 'musicbrainz' || t.provider === 'kuwo') continue
          seen.add(t.trackKey)
          mapped.tracks.push(t)
        }
      }

      mapped.tracks = await promoteTracksToVerome(this.host.verome, mapped.tracks, 14)

      mapped.tracks = await hydrateMissingCovers(
        { itunes: this.host.itunes, kuwo: this.host.kuwo },
        mapped.tracks,
        Math.min(mapped.tracks.length, 12)
      )
    }

    return mapped
  }

  searchLocalTracks(term: string, limit = 6): NormalizedTrack[] {
    const like = `%${term.trim()}%`
    if (!like.replace(/%/g, '').length) return []
    const db = this.host.musicDb.getDb()
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
    await this.host.refreshApiClient()
    let remote: NormalizedTrack[] = []
    if (this.host.isPlatformPrimary()) {
      const { MusicSearchType } = await import('./platform/types')
      const result = await this.host.primaryPlatform().cloudSearch(term, MusicSearchType.Song, limit)
      remote = result.tracks
    } else if (this.host.aggregator) {
      remote = await this.host.aggregator.searchTracks(term, limit, this.host.verome)
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
    await this.host.refreshApiClient()
    const enriched = enrichTrackCover(track)
    if (enriched.provider === 'netease' || enriched.provider === 'kugou') return enriched
    if (enriched.provider !== 'verome') return enriched
    return ensurePlayableTrack(this.host.verome, enriched)
  }

  private discoverDeps(): DiscoverFeedDeps {
    return {
      verome: this.host.verome,
      itunes: this.host.itunes,
      kuwo: this.host.kuwo,
      audius: this.host.audius,
      country: this.host.discoverCountry(),
      getSimilar: (title, artist) => this.getSimilar(title, artist),
      getRadio: (videoId) => this.getRadio(videoId),
      listHistoryPayload: () => {
        const history = this.host.listHistory(1)[0]
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
      const existing = this.host.discoverCache.get(key)
      const incoming = feed[key]
      if (
        this.isDiscoverSectionEmpty(incoming) &&
        existing !== null &&
        !this.isDiscoverSectionEmpty(existing)
      ) {
        continue
      }
      this.host.discoverCache.set(key, incoming)
    }
  }

  private async ensurePlatformDiscoverFeed(
    platform: import('./platform/IMusicPlatformService').IMusicPlatformService,
    force = false
  ): Promise<MusicDiscoverFeed> {
    if (!force && this.host.platformDiscoverFeedInflight) {
      return this.host.platformDiscoverFeedInflight
    }

    const task = (async () => {
      const feed = await platform.buildDiscoverFeed()
      this.cacheDiscoverFeed(feed)
      return feed
    })()

    this.host.platformDiscoverFeedInflight = task
    try {
      return await task
    } finally {
      if (this.host.platformDiscoverFeedInflight === task) {
        this.host.platformDiscoverFeedInflight = null
      }
    }
  }

  async getDiscoverSection<K extends DiscoverSectionKey>(
    section: K
  ): Promise<MusicDiscoverFeed[K]> {
    await this.host.refreshApiClient()
    const cached = this.host.discoverCache.get(section)
    if (cached !== null && !this.isDiscoverSectionEmpty(cached)) return cached

    const platform = this.host.resolveDiscoverPlatform()
    if (platform) {
      const feed = await this.ensurePlatformDiscoverFeed(platform)
      return feed[section]
    }

    const data = await fetchDiscoverSection(section, this.discoverDeps())
    this.host.discoverCache.set(section, data)
    return data
  }

  async refreshDiscoverSection<K extends DiscoverSectionKey>(
    section: K
  ): Promise<MusicDiscoverFeed[K]> {
    await this.host.refreshApiClient()
    const platform = this.host.resolveDiscoverPlatform()
    if (platform) {
      return this.host.discoverCache.refresh(section, async () => {
        const feed = await this.ensurePlatformDiscoverFeed(platform, true)
        return feed[section]
      })
    }
    return this.host.discoverCache.refresh(section, () =>
      fetchDiscoverSection(section, this.discoverDeps())
    )
  }

  async getDiscoverFeed(): Promise<MusicDiscoverFeed> {
    await this.host.refreshApiClient()
    const platform = this.host.resolveDiscoverPlatform()
    if (platform) {
      return this.ensurePlatformDiscoverFeed(platform)
    }

    const keys = this.discoverSectionKeys()
    const allCached = keys.every((k) => {
      const v = this.host.discoverCache.get(k)
      return v !== null && !this.isDiscoverSectionEmpty(v)
    })
    if (allCached) return this.host.discoverCache.snapshot()

    const feed = await buildDiscoverFeed(this.discoverDeps())
    this.cacheDiscoverFeed(feed)
    return feed
  }

  async getTrending(): Promise<MusicTrendingPayload> {
    await this.host.refreshApiClient()
    if (this.host.isPlatformPrimary()) {
      return this.host.primaryPlatform().getTrending()
    }
    const country = this.host.discoverCountry()
    try {
      const data = await this.host.verome.getTrending(country)
      return mapTrendingResponse(data, country)
    } catch {
      return { country, tracks: [] }
    }
  }

  async getCharts(): Promise<MusicChartsPayload> {
    return this.host.readCache.run(this.host.readCacheKey('charts'), async () => {
      await this.host.refreshApiClient()
      if (this.host.isPlatformPrimary()) {
        return this.host.primaryPlatform().getCharts()
      }
      const country = this.host.discoverCountry()
      let payload: MusicChartsPayload = { sections: [], country }
      try {
        const data = await this.host.verome.getCharts(country)
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
          const top = await this.host.verome.getTopTracks(country)
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
    })
  }

  async getMoods(): Promise<MusicMoodCategory[]> {
    return this.host.readCache.run(this.host.readCacheKey('moods'), async () => {
      await this.host.refreshApiClient()
      if (this.host.isPlatformPrimary()) {
        const moods = await this.host.primaryPlatform().getMoodCategories()
        if (moods.length) return moods
        return CHINESE_MOOD_FALLBACK
      }
      try {
        const data = await this.host.verome.getMoods()
        const moods = mapMoodsResponse(data)
        if (moods.length) return moods
      } catch {
        /* fallback below */
      }
      return CHINESE_MOOD_FALLBACK
    })
  }

  async getMoodPlaylists(categoryId: string): Promise<MusicMoodPlaylist[]> {
    await this.host.refreshApiClient()
    const slug = decodeURIComponent(categoryId.trim())

    if (this.host.isPlatformPrimary()) {
      const summaries = await this.host.primaryPlatform().getPlaylistSummaries(slug, 20)
      if (summaries.length) {
        return summaries.map((p) => ({
          playlistId: p.id,
          title: p.title,
          coverUrl: p.coverUrl
        }))
      }
      return this.host.primaryPlatform()
        .getPersonalizedPlaylists(12)
        .catch(() => [])
    }

    let playlists: MusicMoodPlaylist[] = []
    try {
      const data = await this.host.verome.getMoodPlaylists(slug)
      playlists = mapMoodPlaylistsResponse(data)
    } catch {
      /* fallback below */
    }
    if (playlists.length) return playlists

    try {
      const kuwoTracks = await this.host.kuwo.searchTracks(slug, 14)
      const promoted = await promoteTracksToVerome(this.host.verome, kuwoTracks, 12)
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
      const searchData = await this.host.verome.search(`${slug} playlist`, 'songs')
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
    await this.host.refreshApiClient()
    const ref = parseBrowseId(playlistId)
    if (this.host.isPlatformPrimary() || ref) {
      const platform = ref ? this.host.platforms.get(ref.platform) : this.host.primaryPlatform()
      return platform.getPlaylistTracks(playlistId)
    }
    const data = await this.host.verome.getPlaylist(playlistId)
    return mapPlaylistTracks(data)
  }

  async getRadio(videoId: string): Promise<NormalizedTrack[]> {
    await this.host.refreshApiClient()
    if (this.host.isPlatformPrimary()) {
      return this.host.primaryPlatform().getPersonalFm()
    }
    const data = (await this.host.verome.getRadio(videoId)) as { tracks?: unknown[] }
    return mapPlaylistTracks(data)
  }

  async getSimilar(title: string, artist: string): Promise<NormalizedTrack[]> {
    await this.host.refreshApiClient()
    const data = await this.host.verome.getSimilar(title, artist, '12')
    return mapPlaylistTracks(Array.isArray(data) ? data : { tracks: data })
  }

  async getForYouFromHistory(): Promise<NormalizedTrack[]> {
    const feed = await this.getDiscoverFeed()
    return feed.forYou
  }

  async getSong(videoId: string): Promise<unknown> {
    await this.host.refreshApiClient()
    return this.host.verome.getSong(videoId)
  }

  async getAlbum(browseId: string): Promise<{ album: unknown; tracks: NormalizedTrack[] }> {
    await this.host.refreshApiClient()
    const ref = parseBrowseId(browseId)
    if (this.host.isPlatformPrimary() || ref) {
      const platform = ref ? this.host.platforms.get(ref.platform) : this.host.primaryPlatform()
      return platform.getAlbum(browseId)
    }
    const data = (await this.host.verome.getAlbum(browseId)) as Record<string, unknown>
    const tracks = mapPlaylistTracks(data.tracks ?? data.songs ?? data)
    return { album: data, tracks }
  }

  async getArtist(browseId: string): Promise<ReturnType<typeof mapArtistResponse>> {
    await this.host.refreshApiClient()
    const ref = parseBrowseId(browseId)
    if (this.host.isPlatformPrimary() || ref) {
      const platform = ref ? this.host.platforms.get(ref.platform) : this.host.primaryPlatform()
      return platform.getArtist(browseId)
    }
    const data = await this.host.verome.getArtist(browseId)
    return mapArtistResponse(data)
  }

  async getLyrics(
    title: string,
    artist: string,
    hint?: Pick<NormalizedTrack, 'provider' | 'videoId' | 'trackKey'>
  ): Promise<MusicLyricsResult> {
    const tryKuwoId = async (musicId: string): Promise<MusicLyricsResult | null> => {
      const result = await this.host.kuwo.getLyrics(musicId)
      return result.lrc || result.plain ? result : null
    }

    if ((hint?.provider === 'netease' || hint?.provider === 'kugou') && hint.videoId) {
      try {
        const lyric = await this.host.platforms.get(hint.provider).getLyrics(hint.videoId)
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
      const musicId = await this.host.kuwo.findMusicId(title, artist)
      if (musicId) {
        const kuwoLyric = await tryKuwoId(musicId)
        if (kuwoLyric) return kuwoLyric
      }
    } catch {
      /* ignore */
    }

    try {
      await this.host.refreshApiClient()
      const data = (await this.host.verome.getLyrics(title, artist)) as {
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
    await this.host.refreshApiClient()
    const normalized =
      track.provider === 'netease' || track.provider === 'kugou'
        ? enrichTrackCover(track)
        : await normalizeForPlayback(this.host.verome, track)

    const quality = qualityOverride ?? readMusicModuleSettings(this.host.getSettings()).neteaseQuality

    if (normalized.provider === 'netease' || normalized.provider === 'kugou') {
      try {
        const picked = await this.host.platforms.get(normalized.provider).resolveStream(normalized.videoId, quality)
        if (picked?.url) {
          const cached = await this.host.streamCache.resolveWithCache(
            normalized,
            { url: picked.url, format: picked.format },
            false
          )
          const playable = mergeTrackPlaybackMeta(enrichTrackCover(normalized), {
            isTrial: picked.isTrial
          })
          return {
            url: cached.url,
            cachedPath: cached.cachedPath,
            track: playable,
            format: cached.format,
            isTrial: picked.isTrial
          }
        }
      } catch {
        /* fallback to registry */
      }
    }

    const resolved = await resolvePlayableStream(normalized, {
      registry: this.host.registry,
      streamCache: this.host.streamCache,
      verome: this.host.verome,
      audius: this.host.audius,
      jamendo: this.host.jamendo
    })

    if (!resolved) throw new Error('无法获取音频流地址')

    let playableTrack = resolved.track
    if (!playableTrack.coverUrl) {
      const hydrated = await hydrateMissingCovers(
        { itunes: this.host.itunes, kuwo: this.host.kuwo },
        [playableTrack],
        2
      )
      playableTrack = hydrated[0] ?? playableTrack
    }

    const cached = await this.host.streamCache.resolveWithCache(
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


}
