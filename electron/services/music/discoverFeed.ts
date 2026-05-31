import type {
  MusicChartCard,
  MusicChartsPayload,
  MusicChartSection,
  MusicDiscoverFeed,
  NormalizedTrack
} from '../../../src/shared/types/music'
import {
  mapChartsResponse,
  mapPlaylistTracks,
  mapSearchResponse,
  mapTopTracksResponse,
  mapTrendingResponse
} from './discoveryMapper'
import {
  enrichTracksCovers,
  hydrateMissingCovers,
  promoteTracksToVerome,
  type CoverHydrationDeps
} from './trackPlayback'
import type { DiscoverSectionKey } from './discoverCache'
import type { VeromeClient } from './veromeClient'
import type { KuwoProvider } from './providers/kuwoProvider'
import type { ItunesProvider } from './providers/itunesProvider'
import type { AudiusProvider } from './providers/audiusProvider'

const CHINESE_SEARCH_QUERIES = ['华语流行', '中文歌曲', 'Mandopop', '周杰伦', '邓紫棋', '抖音热歌', '经典老歌']
const KUWO_SEARCH_QUERIES = ['华语流行', '中文热歌', '周杰伦', '邓紫棋', '经典老歌', '抖音']

export type DiscoverFeedDeps = {
  verome: VeromeClient
  itunes: ItunesProvider
  kuwo: KuwoProvider
  audius: AudiusProvider | null
  country: string
  getSimilar: (title: string, artist: string) => Promise<NormalizedTrack[]>
  getRadio: (videoId: string) => Promise<NormalizedTrack[]>
  listHistoryPayload: () => NormalizedTrack | null
}

function coverDeps(deps: DiscoverFeedDeps): CoverHydrationDeps {
  return { itunes: deps.itunes, kuwo: deps.kuwo }
}

async function mergeVeromeCatalog(deps: DiscoverFeedDeps): Promise<NormalizedTrack[]> {
  const tracks: NormalizedTrack[] = []

  const [trending, top, charts] = await Promise.allSettled([
    deps.verome
      .getTrending(deps.country)
      .then((data) => mapTrendingResponse(data, deps.country).tracks),
    deps.verome.getTopTracks(deps.country).then(mapTopTracksResponse),
    deps.verome.getCharts(deps.country).then((data) => {
      const payload = mapChartsResponse(data)
      const { chartTracks, newReleases } = extractChartSections(payload)
      return [...chartTracks, ...newReleases]
    })
  ])

  if (trending.status === 'fulfilled') tracks.push(...trending.value)
  if (top.status === 'fulfilled') tracks.push(...top.value)
  if (charts.status === 'fulfilled') tracks.push(...charts.value)

  const used = new Set<string>()
  return dedupeTracks(enrichTracksCovers(tracks), used)
}

async function finalizeDiscoverTracks(
  deps: DiscoverFeedDeps,
  tracks: NormalizedTrack[],
  limit: number,
  coverLookups: number,
  promoteLookups = 16
): Promise<NormalizedTrack[]> {
  const used = new Set<string>()
  const deduped = dedupeTracks(tracks, used)
  const promoted = await promoteTracksToVerome(deps.verome, deduped, promoteLookups)
  const sliced = promoted.slice(0, limit)
  return hydrateMissingCovers(coverDeps(deps), sliced, coverLookups)
}

/** 酷我榜 + 并行 Verome/酷我搜索，仅收集元数据（后续 promote 到 Verome 可播） */
async function fetchChineseCatalogRaw(deps: DiscoverFeedDeps): Promise<NormalizedTrack[]> {
  const tracks: NormalizedTrack[] = []

  const veromeJobs = CHINESE_SEARCH_QUERIES.map((q) =>
    deps.verome
      .search(q, 'songs')
      .then((data) => mapSearchResponse(data).tracks.slice(0, 6))
      .catch(() => [] as NormalizedTrack[])
  )
  const kuwoJobs = KUWO_SEARCH_QUERIES.map((q) =>
    deps.kuwo.searchTracks(q, 8).catch(() => [] as NormalizedTrack[])
  )

  const [veromeBatches, kuwoBatches, kuwoCharts] = await Promise.all([
    Promise.all(veromeJobs),
    Promise.all(kuwoJobs),
    deps.kuwo.fetchChartTracks(24).catch(() => [] as NormalizedTrack[])
  ])

  tracks.push(...kuwoCharts)
  for (const batch of kuwoBatches) tracks.push(...batch)
  for (const batch of veromeBatches) tracks.push(...batch)

  if (deps.audius) {
    try {
      tracks.push(...(await deps.audius.searchTracks('mandopop chinese c-pop', 8)))
    } catch {
      /* ignore */
    }
  }

  const used = new Set<string>()
  return dedupeTracks(enrichTracksCovers(tracks), used)
}

export function dedupeTracks(tracks: NormalizedTrack[], used: Set<string>): NormalizedTrack[] {
  const out: NormalizedTrack[] = []
  for (const t of tracks) {
    if (used.has(t.trackKey)) continue
    used.add(t.trackKey)
    out.push(t)
  }
  return out
}

function isTrackSection(
  section: MusicChartSection
): section is MusicChartSection & { items: NormalizedTrack[] } {
  if (!section.items.length) return false
  return 'videoId' in (section.items[0] as object)
}

function extractChartSections(payload: MusicChartsPayload): {
  newReleases: NormalizedTrack[]
  chartTracks: NormalizedTrack[]
  chartPlaylists: MusicChartCard[]
} {
  const newReleases: NormalizedTrack[] = []
  const chartTracks: NormalizedTrack[] = []
  const chartPlaylists: MusicChartCard[] = []

  for (const section of payload.sections) {
    if (section.kind === 'playlists' || section.kind === 'genres') {
      chartPlaylists.push(...(section.items as MusicChartCard[]))
      continue
    }
    if (!isTrackSection(section)) continue

    const title = section.title.toLowerCase()
    if (section.kind === 'videos' || /新|new|latest|release|上线/.test(title)) {
      newReleases.push(...section.items)
      continue
    }
    if (section.kind === 'trending') continue
    if (
      section.kind === 'songs' ||
      /chart|排行|rank|top|热门|billboard|hit/.test(title)
    ) {
      chartTracks.push(...section.items)
    }
  }

  return { newReleases, chartTracks, chartPlaylists }
}

async function fetchTrendingSection(deps: DiscoverFeedDeps): Promise<NormalizedTrack[]> {
  const [chinese, veromeCatalog] = await Promise.all([
    fetchChineseCatalogRaw(deps),
    mergeVeromeCatalog(deps)
  ])
  const used = new Set<string>()
  const tracks = [
    ...dedupeTracks(chinese, used),
    ...dedupeTracks(veromeCatalog, used)
  ]
  return finalizeDiscoverTracks(deps, tracks, 32, 10, 22)
}

async function fetchForYouSection(deps: DiscoverFeedDeps): Promise<NormalizedTrack[]> {
  let tracks: NormalizedTrack[] = []
  const last = deps.listHistoryPayload()

  if (last) {
    try {
      tracks = enrichTracksCovers(await deps.getSimilar(last.title, last.artist))
    } catch {
      tracks = []
    }
  }

  let trendingSeed: NormalizedTrack[] = []
  try {
    const data = await deps.verome.getTrending(deps.country)
    trendingSeed = mapTrendingResponse(data, deps.country).tracks
  } catch {
    trendingSeed = []
  }

  if (!tracks.length && trendingSeed[0]) {
    try {
      tracks = enrichTracksCovers(await deps.getRadio(trendingSeed[0].videoId))
    } catch {
      tracks = []
    }
  }

  if (!tracks.length && trendingSeed[0]) {
    try {
      const related = await deps.verome.getRelated(trendingSeed[0].videoId)
      tracks = enrichTracksCovers(mapPlaylistTracks(related))
    } catch {
      tracks = []
    }
  }

  const chinese = await fetchChineseCatalogRaw(deps)
  const used = new Set(tracks.map((t) => t.trackKey))
  tracks = [...tracks, ...dedupeTracks(chinese, used)]

  if (tracks.length < 8) {
    const catalog = await mergeVeromeCatalog(deps)
    tracks = [...tracks, ...dedupeTracks(catalog, used)]
  }

  if (!tracks.length && deps.audius) {
    try {
      tracks = enrichTracksCovers(await deps.audius.trending(16))
    } catch {
      tracks = []
    }
  }

  return finalizeDiscoverTracks(deps, tracks, 24, 8, 18)
}

async function fetchNewReleasesSection(deps: DiscoverFeedDeps): Promise<NormalizedTrack[]> {
  let tracks: NormalizedTrack[] = []

  try {
    const chartsData = await deps.verome.getCharts(deps.country)
    const payload = mapChartsResponse(chartsData)
    tracks = enrichTracksCovers(extractChartSections(payload).newReleases)
  } catch {
    tracks = []
  }

  let trendingSeed: NormalizedTrack[] = []
  try {
    const data = await deps.verome.getTrending(deps.country)
    trendingSeed = mapTrendingResponse(data, deps.country).tracks
  } catch {
    trendingSeed = []
  }

  if (!tracks.length && trendingSeed[1]) {
    try {
      const related = await deps.verome.getRelated(trendingSeed[1].videoId)
      tracks = enrichTracksCovers(mapPlaylistTracks(related))
    } catch {
      tracks = []
    }
  }

  if (tracks.length < 6) {
    try {
      const data = await deps.verome.search('华语 新歌', 'songs')
      const used = new Set(tracks.map((t) => t.trackKey))
      tracks = [...tracks, ...dedupeTracks(enrichTracksCovers(mapSearchResponse(data).tracks), used)]
    } catch {
      /* ignore */
    }
  }

  if (tracks.length < 6) {
    const chinese = await fetchChineseCatalogRaw(deps)
    const used = new Set(tracks.map((t) => t.trackKey))
    tracks = [...tracks, ...dedupeTracks(chinese, used)]
  }

  if (!tracks.length && deps.audius) {
    try {
      tracks = enrichTracksCovers(await deps.audius.trending(14))
    } catch {
      tracks = []
    }
  }

  if (tracks.length < 8) {
    const catalog = await mergeVeromeCatalog(deps)
    const used = new Set(tracks.map((t) => t.trackKey))
    tracks = [...tracks, ...dedupeTracks(catalog, used)]
  }

  return finalizeDiscoverTracks(deps, tracks, 24, 8, 16)
}

async function fetchChartTracksSection(deps: DiscoverFeedDeps): Promise<NormalizedTrack[]> {
  let tracks: NormalizedTrack[] = []

  try {
    const chartsData = await deps.verome.getCharts(deps.country)
    const payload = mapChartsResponse(chartsData)
    tracks = enrichTracksCovers(extractChartSections(payload).chartTracks)
  } catch {
    tracks = []
  }

  if (tracks.length < 10) {
    try {
      const top = await deps.verome.getTopTracks(deps.country)
      const used = new Set(tracks.map((t) => t.trackKey))
      tracks = [
        ...tracks,
        ...dedupeTracks(enrichTracksCovers(mapTopTracksResponse(top)), used)
      ]
    } catch {
      /* ignore */
    }
  }

  if (tracks.length < 8) {
    try {
      const data = await deps.verome.search('华语 热歌 排行榜', 'songs')
      const used = new Set(tracks.map((t) => t.trackKey))
      tracks = [
        ...tracks,
        ...dedupeTracks(enrichTracksCovers(mapSearchResponse(data).tracks.slice(0, 16)), used)
      ]
    } catch {
      /* ignore */
    }
  }

  if (tracks.length < 8) {
    const chinese = await fetchChineseCatalogRaw(deps)
    const used = new Set(tracks.map((t) => t.trackKey))
    tracks = [...tracks, ...dedupeTracks(chinese, used)]
  }

  if (tracks.length < 6 && deps.audius) {
    try {
      const used = new Set(tracks.map((t) => t.trackKey))
      tracks = [
        ...tracks,
        ...dedupeTracks(enrichTracksCovers(await deps.audius.trending(12)), used)
      ]
    } catch {
      /* ignore */
    }
  }

  return finalizeDiscoverTracks(deps, tracks, 40, 8, 20)
}

async function fetchChartPlaylistsSection(deps: DiscoverFeedDeps): Promise<MusicChartCard[]> {
  try {
    const chartsData = await deps.verome.getCharts(deps.country)
    const payload = mapChartsResponse(chartsData)
    return extractChartSections(payload).chartPlaylists
  } catch {
    return []
  }
}

export async function fetchDiscoverSection(
  key: DiscoverSectionKey,
  deps: DiscoverFeedDeps
): Promise<MusicDiscoverFeed[DiscoverSectionKey]> {
  switch (key) {
    case 'forYou':
      return fetchForYouSection(deps)
    case 'trending':
      return fetchTrendingSection(deps)
    case 'newReleases':
      return fetchNewReleasesSection(deps)
    case 'chartTracks':
      return fetchChartTracksSection(deps)
    case 'chartPlaylists':
      return fetchChartPlaylistsSection(deps)
    default:
      return []
  }
}

export async function buildDiscoverFeed(deps: DiscoverFeedDeps): Promise<MusicDiscoverFeed> {
  const used = new Set<string>()
  const trending = dedupeTracks(await fetchTrendingSection(deps), used)
  const forYou = dedupeTracks(await fetchForYouSection(deps), used)
  const newReleases = dedupeTracks(await fetchNewReleasesSection(deps), used)
  const chartTracks = dedupeTracks(await fetchChartTracksSection(deps), used)
  const chartPlaylists = await fetchChartPlaylistsSection(deps)

  return { forYou, trending, newReleases, chartTracks, chartPlaylists }
}
