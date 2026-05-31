import type { NormalizedTrack } from '../../../../src/shared/types/music'
import { upgradeCoverUrl } from '../../../../src/shared/utils/musicCoverUrl'

const JAMENDO_BASE = 'https://api.jamendo.com/v3.0'

/** 可选第二源：Jamendo（需 client_id，默认不启用） */
export class JamendoProvider {
  constructor(private readonly clientId: string) {}

  async searchTracks(query: string, limit = 12): Promise<NormalizedTrack[]> {
    if (!this.clientId) return []
    const url = new URL(`${JAMENDO_BASE}/tracks/`)
    url.searchParams.set('client_id', this.clientId)
    url.searchParams.set('format', 'json')
    url.searchParams.set('limit', String(limit))
    url.searchParams.set('namesearch', query)
    url.searchParams.set('include', 'musicinfo')
    const res = await fetch(url)
    if (!res.ok) return []
    const data = (await res.json()) as { results?: Array<Record<string, unknown>> }
    return (data.results ?? [])
      .map((t) => this.mapTrack(t))
      .filter((x): x is NormalizedTrack => x !== null)
  }

  async resolveStreamUrl(trackId: string): Promise<string> {
    if (!this.clientId) throw new Error('Jamendo client_id 未配置')
    const url = new URL(`${JAMENDO_BASE}/tracks/`)
    url.searchParams.set('client_id', this.clientId)
    url.searchParams.set('format', 'json')
    url.searchParams.set('id', trackId)
    const res = await fetch(url)
    if (!res.ok) throw new Error(`Jamendo ${res.status}`)
    const data = (await res.json()) as { results?: Array<Record<string, unknown>> }
    const row = data.results?.[0]
    const audio =
      (row?.audio as string | undefined) ||
      (row?.audiodownload as string | undefined) ||
      (row?.audiodownload_allowed as string | undefined)
    if (!audio) throw new Error('Jamendo 曲目无 audio 字段')
    return audio
  }

  private mapTrack(t: Record<string, unknown>): NormalizedTrack | null {
    const id = String(t.id ?? '')
    if (!id) return null
    return {
      trackKey: `jamendo:${id}`,
      provider: 'jamendo',
      videoId: id,
      title: String(t.name ?? ''),
      artist: String(t.artist_name ?? ''),
      durationSec: typeof t.duration === 'number' ? t.duration : undefined,
      coverUrl: upgradeCoverUrl(String(t.image ?? t.album_image ?? ''), 'card') || undefined,
      album: t.album_name ? String(t.album_name) : undefined
    }
  }
}
