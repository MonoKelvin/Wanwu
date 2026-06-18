import type { NormalizedTrack } from '@modules/music/domain/types'
import { upgradeCoverUrl } from '@shared/utils/musicCoverUrl'

const AUDIUS_BASE = 'https://api.audius.co/v1'

/** 可选第二源：Audius（公开读接口，无需 Bearer） */
export class AudiusProvider {
  constructor(private readonly apiKey?: string) {}

  private headers(): Record<string, string> {
    if (this.apiKey?.trim()) {
      return { Authorization: `Bearer ${this.apiKey.trim()}` }
    }
    return {}
  }

  async searchTracks(query: string, limit = 6): Promise<NormalizedTrack[]> {
    const url = `${AUDIUS_BASE}/tracks/search?query=${encodeURIComponent(query)}&limit=${limit}`
    const res = await fetch(url, { headers: this.headers() })
    if (!res.ok) return []
    const data = (await res.json()) as { data?: Array<Record<string, unknown>> }
    return (data.data ?? [])
      .map((t) => this.mapTrack(t))
      .filter((x): x is NormalizedTrack => x !== null)
  }

  async trending(limit = 12): Promise<NormalizedTrack[]> {
    const url = `${AUDIUS_BASE}/tracks/trending?limit=${limit}`
    const res = await fetch(url, { headers: this.headers() })
    if (!res.ok) return []
    const data = (await res.json()) as { data?: Array<Record<string, unknown>> }
    return (data.data ?? [])
      .map((t) => this.mapTrack(t))
      .filter((x): x is NormalizedTrack => x !== null)
  }

  async resolveStreamUrl(trackId: string): Promise<string> {
    const url = `${AUDIUS_BASE}/tracks/${encodeURIComponent(trackId)}/stream`
    const res = await fetch(url, {
      headers: this.headers(),
      redirect: 'follow'
    })
    if (!res.ok) throw new Error(`Audius stream ${res.status}`)
    if (res.url && !res.url.includes('/tracks/')) return res.url
    const data = (await res.json().catch(() => null)) as { data?: string } | null
    if (data?.data) return data.data
    throw new Error('Audius 无法解析流地址')
  }

  private mapTrack(t: Record<string, unknown>): NormalizedTrack | null {
    const id = String(t.id ?? '')
    if (!id) return null
    const user = t.user as { name?: string } | undefined
    return {
      trackKey: `audius:${id}`,
      provider: 'audius',
      videoId: id,
      title: String(t.title ?? ''),
      artist: user?.name ?? 'Audius',
      durationSec: typeof t.duration === 'number' ? t.duration : undefined,
      coverUrl: upgradeCoverUrl(
        (t.artwork as { _480x480?: string; _1000x1000?: string; _150x150?: string } | undefined)
          ?._480x480 ??
          (t.artwork as { _1000x1000?: string } | undefined)?._1000x1000 ??
          (t.artwork as { _150x150?: string } | undefined)?._150x150,
        'card'
      )
    }
  }
}
