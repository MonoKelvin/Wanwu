import type { VeromeClient } from './veromeClient'
import type { JamendoProvider } from './providers/jamendoProvider'
import type { AudiusProvider } from './providers/audiusProvider'
import { MusicProviderRegistry } from './providers/MusicProviderRegistry'
import { mapSearchResponse } from './discoveryMapper'
import { findVeromeTrackByQuery } from './trackPlayback'
import type { NormalizedTrack } from '@modules/music/domain/types'

const PROVIDER_PRIORITY: NormalizedTrack['provider'][] = ['verome', 'audius', 'jamendo']

function dedupeTracks(tracks: NormalizedTrack[]): NormalizedTrack[] {
  const seen = new Set<string>()
  const out: NormalizedTrack[] = []
  for (const t of tracks) {
    const key = `${t.title.toLowerCase()}|${t.artist.toLowerCase()}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(t)
  }
  return out
}

export class MusicAggregator {
  private registry: MusicProviderRegistry | null = null

  bindRegistry(registry: MusicProviderRegistry): void {
    this.registry = registry
  }

  async searchTracks(query: string, limit = 12, verome?: VeromeClient): Promise<NormalizedTrack[]> {
    const q = query.trim()
    if (!q) return []

    const merged: NormalizedTrack[] = []

    if (verome) {
      try {
        const data = await verome.search(q, 'songs')
        merged.push(...mapSearchResponse(data).tracks)
      } catch {
        /* ignore */
      }
    }

    const tasks: Array<Promise<NormalizedTrack[]>> = []
    for (const p of this.registry?.searchProviders() ?? []) {
      if (p.id === 'verome') continue
      tasks.push(p.searchTracks!(q, 8).catch(() => []))
    }

    const chunks = await Promise.all(tasks)
    const bucket = new Map<NormalizedTrack['provider'], NormalizedTrack[]>()
    for (const t of merged) {
      const arr = bucket.get(t.provider) ?? []
      arr.push(t)
      bucket.set(t.provider, arr)
    }
    for (const list of chunks) {
      for (const t of list) {
        const arr = bucket.get(t.provider) ?? []
        arr.push(t)
        bucket.set(t.provider, arr)
      }
    }

    const out: NormalizedTrack[] = []
    for (const p of PROVIDER_PRIORITY) {
      out.push(...(bucket.get(p) ?? []))
    }
    return dedupeTracks(out).slice(0, limit)
  }

  /** 非 Verome 源保留原 provider，仅在 Verome 可搜索时补充元数据 */
  async resolvePlayableTrack(
    track: NormalizedTrack,
    verome: VeromeClient
  ): Promise<NormalizedTrack> {
    if (track.provider === 'verome') return track

    const found = await findVeromeTrackByQuery(verome, track.title, track.artist, track)
    if (found) return found

    return track
  }
}
