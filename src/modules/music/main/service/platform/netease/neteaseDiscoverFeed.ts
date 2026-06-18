import { MusicSearchType } from '../types'
import { mapToplistChartCards } from './mapper'
import type { MusicDiscoverFeed, MusicMoodPlaylist, NormalizedTrack } from '@modules/music/domain/types'
import type { MusicToplistSummary } from '../types'

export interface NeteaseDiscoverSource {
  getDailyRecommend(): Promise<NormalizedTrack[]>
  getPersonalFm(): Promise<NormalizedTrack[]>
  getPersonalizedPlaylists(limit: number): Promise<MusicMoodPlaylist[]>
  getNewSongs(limit: number): Promise<NormalizedTrack[]>
  getToplists(): Promise<MusicToplistSummary[]>
  getToplistTracks(toplistId: string, limit: number): Promise<NormalizedTrack[]>
  getPlaylistSummaries(category: string, limit: number): Promise<Array<{ id: string; title: string; coverUrl?: string }>>
  searchHot(limit: number): Promise<Array<{ keyword: string }>>
  cloudSearch(keywords: string, type: MusicSearchType, limit: number): Promise<{ tracks: NormalizedTrack[] }>
}

async function fallbackDiscoverTracks(source: NeteaseDiscoverSource, limit = 24): Promise<NormalizedTrack[]> {
  try {
    const hot = await source.searchHot(Math.min(8, limit))
    const tracks: NormalizedTrack[] = []
    const seen = new Set<string>()
    for (const item of hot) {
      if (!item.keyword.trim()) continue
      const result = await source.cloudSearch(item.keyword, MusicSearchType.Song, 4)
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

export async function buildNeteaseDiscoverFeed(source: NeteaseDiscoverSource): Promise<MusicDiscoverFeed> {
  const [daily, fm, personalized, newSongs, toplists, hotPlaylists] = await Promise.allSettled([
    source.getDailyRecommend(),
    source.getPersonalFm(),
    source.getPersonalizedPlaylists(8),
    source.getNewSongs(24),
    source.getToplists(),
    source.getPlaylistSummaries('华语', 12)
  ])

  const newSongsVal = newSongs.status === 'fulfilled' ? newSongs.value : []
  const personalizedVal = personalized.status === 'fulfilled' ? personalized.value : []
  const toplistSummaries = toplists.status === 'fulfilled' ? toplists.value : []

  let chartTracks: NormalizedTrack[] = []
  if (toplistSummaries[0]) {
    chartTracks = await source.getToplistTracks(toplistSummaries[0].id, 40).catch(() => [])
  }
  if (!chartTracks.length && toplistSummaries[1]) {
    chartTracks = await source.getToplistTracks(toplistSummaries[1].id, 40).catch(() => [])
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
    const fallback = await fallbackDiscoverTracks(source, 24)
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
