import type { MusicChartCard, MusicDiscoverFeed, NormalizedTrack } from '../../../src/shared/types/music'

export type DiscoverSectionKey = keyof MusicDiscoverFeed

type SectionData<K extends DiscoverSectionKey> = MusicDiscoverFeed[K]

interface CacheEntry {
  data: unknown
  updatedAt: number
}

const REFRESH_INTERVAL_MS = 120_000

export class DiscoverCacheService {
  private readonly entries = new Map<DiscoverSectionKey, CacheEntry>()
  private readonly inflight = new Map<DiscoverSectionKey, Promise<unknown>>()

  get<K extends DiscoverSectionKey>(key: K): SectionData<K> | null {
    const entry = this.entries.get(key)
    return (entry?.data as SectionData<K> | undefined) ?? null
  }

  set<K extends DiscoverSectionKey>(key: K, data: SectionData<K>): void {
    this.entries.set(key, { data, updatedAt: Date.now() })
  }

  snapshot(): MusicDiscoverFeed {
    return {
      forYou: (this.get('forYou') ?? []) as NormalizedTrack[],
      trending: (this.get('trending') ?? []) as NormalizedTrack[],
      newReleases: (this.get('newReleases') ?? []) as NormalizedTrack[],
      chartTracks: (this.get('chartTracks') ?? []) as NormalizedTrack[],
      chartPlaylists: (this.get('chartPlaylists') ?? []) as MusicChartCard[]
    }
  }

  isStale(key: DiscoverSectionKey, maxAgeMs = REFRESH_INTERVAL_MS): boolean {
    const entry = this.entries.get(key)
    if (!entry) return true
    return Date.now() - entry.updatedAt > maxAgeMs
  }

  async refresh<K extends DiscoverSectionKey>(
    key: K,
    fetcher: () => Promise<SectionData<K>>
  ): Promise<SectionData<K>> {
    const pending = this.inflight.get(key)
    if (pending) return pending as Promise<SectionData<K>>

    const task = fetcher()
      .then((data) => {
        this.set(key, data)
        return data
      })
      .finally(() => {
        this.inflight.delete(key)
      })

    this.inflight.set(key, task)
    return task
  }
}
