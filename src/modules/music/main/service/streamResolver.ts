import { mapSearchResponse } from './discoveryMapper'
import type { VeromeClient } from './veromeClient'
import type { MusicProviderRegistry } from './providers/MusicProviderRegistry'
import type { AudiusProvider } from './providers/audiusProvider'
import type { JamendoProvider } from './providers/jamendoProvider'
import type { StreamCacheService } from './streamCacheService'
import type { NormalizedTrack } from '@modules/music/domain/types'
import type { PickedStream } from './streamUrl'

function providerScore(provider: NormalizedTrack['provider']): number {
  switch (provider) {
    case 'netease':
      return -1
    case 'kugou':
      return 0
    case 'verome':
      return 1
    case 'audius':
      return 2
    case 'jamendo':
      return 3
    default:
      return 9
  }
}

export async function tryResolveStreamForTrack(
  track: NormalizedTrack,
  deps: {
    registry: MusicProviderRegistry | null
    streamCache: StreamCacheService
    verome: VeromeClient
  }
): Promise<PickedStream | null> {
  if (track.provider === 'itunes' || track.provider === 'musicbrainz' || track.provider === 'kuwo') {
    return null
  }

  try {
    const picked = await deps.registry?.resolveStream(track)
    if (picked) return picked
  } catch {
    /* try fallback below */
  }

  if (track.provider === 'verome') {
    try {
      return await deps.streamCache.resolveVeromeStream(track.videoId, {
        title: track.title,
        artist: track.artist
      })
    } catch {
      /* ignore */
    }
  }

  return null
}

export async function collectStreamCandidates(
  track: NormalizedTrack,
  deps: {
    verome: VeromeClient
    audius: AudiusProvider | null
    jamendo: JamendoProvider | null
  }
): Promise<NormalizedTrack[]> {
  const out: NormalizedTrack[] = []
  const seen = new Set<string>()

  const push = (list: NormalizedTrack[]) => {
    for (const t of list) {
      if (seen.has(t.trackKey)) continue
      if (t.provider === 'itunes' || t.provider === 'musicbrainz' || t.provider === 'kuwo') continue
      seen.add(t.trackKey)
      out.push(t)
    }
  }

  const q = `${track.title} ${track.artist}`.trim()

  if (
    track.provider === 'verome' ||
    track.provider === 'audius' ||
    track.provider === 'jamendo' ||
    track.provider === 'netease' ||
    track.provider === 'kugou'
  ) {
    push([track])
  }

  if (q) {
    try {
      const data = await deps.verome.search(q, 'songs')
      push(mapSearchResponse(data).tracks.slice(0, 8))
    } catch {
      /* ignore */
    }
    if (track.title.trim() !== q) {
      try {
        const data = await deps.verome.search(track.title.trim(), 'songs')
        push(mapSearchResponse(data).tracks.slice(0, 4))
      } catch {
        /* ignore */
      }
    }
  }

  if (q && deps.audius) {
    try {
      push(await deps.audius.searchTracks(q, 4))
    } catch {
      /* ignore */
    }
  }

  if (q && deps.jamendo) {
    try {
      push(await deps.jamendo.searchTracks(q, 3))
    } catch {
      /* ignore */
    }
  }

  return out
}

export async function resolvePlayableStream(
  track: NormalizedTrack,
  deps: {
    registry: MusicProviderRegistry | null
    streamCache: StreamCacheService
    verome: VeromeClient
    audius: AudiusProvider | null
    jamendo: JamendoProvider | null
  }
): Promise<{ url: string; format: PickedStream['format']; track: NormalizedTrack } | null> {
  const candidates = await collectStreamCandidates(track, deps)
  const ordered = [...candidates].sort((a, b) => {
    const scoreA = providerScore(a.provider)
    const scoreB = providerScore(b.provider)
    if (scoreA !== scoreB) return scoreA - scoreB
    if (a.trackKey === track.trackKey) return -1
    if (b.trackKey === track.trackKey) return 1
    return 0
  })

  for (const candidate of ordered) {
    const picked = await tryResolveStreamForTrack(candidate, deps)
    if (picked) return { url: picked.url, format: picked.format, track: candidate }
  }
  return null
}
