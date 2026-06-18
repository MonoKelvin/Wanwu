import type { MusicDiscoverFeed, NormalizedTrack } from '@modules/music/domain/types'
import { mapToplistChartCards } from './mapper'

function dedupeTracks(tracks: NormalizedTrack[]): NormalizedTrack[] {
  const out: NormalizedTrack[] = []
  const seen = new Set<string>()
  for (const t of tracks) {
    if (seen.has(t.trackKey)) continue
    seen.add(t.trackKey)
    out.push(t)
  }
  return out
}

export interface KugouDiscoverSource {
  getDailyRecommend(): Promise<NormalizedTrack[]>
  getPersonalFm(): Promise<NormalizedTrack[]>
  getNewSongs(limit: number): Promise<NormalizedTrack[]>
  getToplists(): Promise<Array<{ id: string; title: string }>>
  getToplistTracks(toplistId: string, limit: number): Promise<NormalizedTrack[]>
  getPlaylistSummaries(category: string, limit: number): Promise<
    Array<{ id: string; title: string; coverUrl?: string; trackCount?: number }>
  >
  getRecommendSongs(limit: number): Promise<NormalizedTrack[]>
  getStyleRecommend(limit: number): Promise<NormalizedTrack[]>
  getTopCardTracks(cardId: number, limit: number): Promise<NormalizedTrack[]>
}

export async function buildKugouDiscoverFeed(source: KugouDiscoverSource): Promise<MusicDiscoverFeed> {
  const [daily, fm, newSongs, toplists, playlists, recommended, styled, cardTracks] = await Promise.all([
    source.getDailyRecommend().catch(() => []),
    source.getPersonalFm().catch(() => []),
    source.getNewSongs(24).catch(() => []),
    source.getToplists().catch(() => []),
    source.getPlaylistSummaries('0', 12).catch(() => []),
    source.getRecommendSongs(20).catch(() => []),
    source.getStyleRecommend(20).catch(() => []),
    source.getTopCardTracks(1, 16).catch(() => [])
  ])

  let chartTracks: NormalizedTrack[] = []
  for (const list of toplists.slice(0, 3)) {
    if (chartTracks.length >= 24) break
    const rows = await source.getToplistTracks(list.id, 24).catch(() => [])
    chartTracks = dedupeTracks([...chartTracks, ...rows])
  }
  if (!chartTracks.length) {
    chartTracks = dedupeTracks([
      ...cardTracks,
      ...newSongs.slice(0, 24),
      ...recommended.slice(0, 16),
      ...styled.slice(0, 12),
      ...daily.slice(0, 12)
    ]).slice(0, 40)
  }

  let chartPlaylists = playlists.map((p) => ({
    browseId: p.id.startsWith('rank:')
      ? `kugou:toplist:${p.id.slice('rank:'.length)}`
      : `kugou:playlist:${p.id}`,
    title: p.title,
    coverUrl: p.coverUrl,
    trackCount: p.trackCount
  }))
  if (!chartPlaylists.length && toplists.length) {
    chartPlaylists = mapToplistChartCards(toplists).slice(0, 12)
  }

  const forYou = dedupeTracks([
    ...daily,
    ...recommended,
    ...styled,
    ...cardTracks,
    ...newSongs.slice(0, 16)
  ]).slice(0, 32)

  const trending = dedupeTracks([...fm, ...daily, ...chartTracks, ...recommended]).slice(0, 32)

  return {
    forYou: forYou.length ? forYou : chartTracks.slice(0, 16),
    trending: trending.length ? trending : forYou.slice(0, 16),
    newReleases: newSongs,
    chartTracks,
    chartPlaylists
  }
}
