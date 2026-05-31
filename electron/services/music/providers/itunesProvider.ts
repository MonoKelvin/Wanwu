import type { NormalizedTrack } from '../../../../src/shared/types/music'
import { upgradeCoverUrl } from '../../../../src/shared/utils/musicCoverUrl'

const ITUNES_SEARCH = 'https://itunes.apple.com/search'

/** Apple iTunes Search API（无需 key，约 20 次/分钟） */
export class ItunesProvider {
  async searchTracks(query: string, limit = 6): Promise<NormalizedTrack[]> {
    const url = new URL(ITUNES_SEARCH)
    url.searchParams.set('term', query)
    url.searchParams.set('media', 'music')
    url.searchParams.set('entity', 'musicTrack')
    url.searchParams.set('limit', String(Math.min(limit, 10)))
    const res = await fetch(url.toString(), { headers: { Accept: 'application/json' } })
    if (!res.ok) return []
    const data = (await res.json()) as { results?: Array<Record<string, unknown>> }
    return (data.results ?? [])
      .map((row) => {
        const trackId = String(row.trackId ?? '')
        const title = String(row.trackName ?? '')
        const artist = String(row.artistName ?? '')
        if (!trackId || !title) return null
        return {
          trackKey: `itunes:${trackId}`,
          provider: 'itunes' as const,
          videoId: trackId,
          title,
          artist,
          album: String(row.collectionName ?? ''),
          durationSec:
            typeof row.trackTimeMillis === 'number'
              ? Math.round(row.trackTimeMillis / 1000)
              : undefined,
          coverUrl: upgradeCoverUrl(String(row.artworkUrl100 ?? row.artworkUrl60 ?? ''), 'card')
        }
      })
      .filter((x): x is NormalizedTrack => x !== null)
  }
}
