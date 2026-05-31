import type { NormalizedTrack } from '../../../../src/shared/types/music'

const MB_SEARCH = 'https://musicbrainz.org/ws/2/recording'

/** MusicBrainz 元数据搜索（无直链播放，用于补全/兜底展示） */
export class MusicBrainzProvider {
  async searchRecordings(query: string, limit = 4): Promise<NormalizedTrack[]> {
    const url = new URL(MB_SEARCH)
    url.searchParams.set('query', query)
    url.searchParams.set('fmt', 'json')
    url.searchParams.set('limit', String(Math.min(limit, 8)))
    const res = await fetch(url.toString(), {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Wanwu/1.0 (https://github.com/MonoStudio/Wanwu; music-module)'
      }
    })
    if (!res.ok) return []
    const data = (await res.json()) as {
      recordings?: Array<{
        id?: string
        title?: string
        'artist-credit'?: Array<{ name?: string }>
        length?: number
      }>
    }
    return (data.recordings ?? [])
      .map((rec) => {
        const id = rec.id ?? ''
        const title = rec.title ?? ''
        if (!id || !title) return null
        const artist = rec['artist-credit']?.map((a) => a.name).filter(Boolean).join(', ') ?? ''
        return {
          trackKey: `musicbrainz:${id}`,
          provider: 'musicbrainz' as const,
          videoId: id,
          title,
          artist: artist || 'Unknown',
          durationSec: rec.length ? Math.round(rec.length / 1000) : undefined
        }
      })
      .filter((x): x is NormalizedTrack => x !== null)
  }
}
