import { resolveTrackCoverUrl, upgradeCoverUrl } from '../../../src/shared/utils/musicCoverUrl'
import { mapSearchResponse } from './discoveryMapper'
import type { ItunesProvider } from './providers/itunesProvider'
import type { KuwoProvider } from './providers/kuwoProvider'
import type { VeromeClient } from './veromeClient'
import type { MusicTrackBadge, NormalizedTrack } from '../../../src/shared/types/music'

export type CoverHydrationDeps = {
  itunes: ItunesProvider
  kuwo: KuwoProvider
}

const normTitle = (s: string) => s.trim().toLowerCase().replace(/\s+/g, '')

function pickCoverCandidate(
  candidates: NormalizedTrack[],
  titleNorm: string,
  artistNorm: string
): NormalizedTrack | undefined {
  return (
    candidates.find(
      (c) => c.coverUrl && normTitle(c.title) === titleNorm && normTitle(c.artist) === artistNorm
    ) ??
    candidates.find(
      (c) =>
        c.coverUrl &&
        normTitle(c.title) === titleNorm &&
        (normTitle(c.artist).includes(artistNorm) || artistNorm.includes(normTitle(c.artist)))
    ) ??
    candidates.find((c) => c.coverUrl && normTitle(c.title).includes(titleNorm.slice(0, 4))) ??
    candidates.find((c) => c.coverUrl) ??
    candidates[0]
  )
}

async function lookupCoverHit(
  deps: CoverHydrationDeps,
  track: NormalizedTrack
): Promise<NormalizedTrack | undefined> {
  const titleNorm = normTitle(track.title)
  const artistNorm = normTitle(track.artist)
  const queries = [`${track.title} ${track.artist}`.trim(), track.title.trim()].filter(Boolean)

  for (const q of queries) {
    try {
      const itunesHits = await deps.itunes.searchTracks(q, 6)
      const hit = pickCoverCandidate(itunesHits, titleNorm, artistNorm)
      if (hit?.coverUrl) return hit
    } catch {
      /* ignore */
    }
  }

  for (const q of queries) {
    try {
      const kuwoHits = await deps.kuwo.searchTracks(q, 8)
      const hit = pickCoverCandidate(kuwoHits, titleNorm, artistNorm)
      if (hit?.coverUrl) return hit
    } catch {
      /* ignore */
    }
  }

  return undefined
}

const YOUTUBE_ID = /^[a-zA-Z0-9_-]{11}$/

export function isValidYoutubeVideoId(id: string | undefined): boolean {
  return !!id && YOUTUBE_ID.test(id.trim())
}

export function enrichTrackCover(track: NormalizedTrack): NormalizedTrack {
  const coverUrl =
    resolveTrackCoverUrl(track, 'card') ??
    upgradeCoverUrl(track.coverUrl, 'card')
  if (coverUrl) return { ...track, coverUrl }
  return track
}

export function mergeTrackPlaybackMeta(
  track: NormalizedTrack,
  meta?: { isTrial?: boolean }
): NormalizedTrack {
  if (!meta?.isTrial) return track
  const badges = new Set<MusicTrackBadge>(track.badges ?? [])
  badges.add('trial')
  return { ...track, isTrial: true, badges: [...badges] }
}

/** iTunes 优先，酷我仅作封面/元数据补全（不用于音源流） */
export async function hydrateMissingCovers(
  deps: CoverHydrationDeps,
  tracks: NormalizedTrack[],
  maxLookups = 24
): Promise<NormalizedTrack[]> {
  const out = tracks.map((t) => enrichTrackCover(t))
  let lookups = 0

  for (let i = 0; i < out.length && lookups < maxLookups; i++) {
    const track = out[i]!
    if (track.coverUrl) continue
    lookups++
    try {
      const hit = await lookupCoverHit(deps, track)
      if (hit?.coverUrl) {
        out[i] = enrichTrackCover({
          ...track,
          coverUrl: hit.coverUrl,
          album: track.album ?? hit.album
        })
      }
    } catch {
      /* ignore */
    }
  }

  return out
}

/** @deprecated 使用 hydrateMissingCovers */
export async function hydrateMissingCoversFromKuwo(
  kuwo: KuwoProvider,
  tracks: NormalizedTrack[],
  maxLookups = 16
): Promise<NormalizedTrack[]> {
  return hydrateMissingCovers({ itunes: new ItunesProvider(), kuwo }, tracks, maxLookups)
}

export function enrichTracksCovers(tracks: NormalizedTrack[]): NormalizedTrack[] {
  return tracks.map(enrichTrackCover)
}

export async function findVeromeTrackByQuery(
  verome: VeromeClient,
  title: string,
  artist: string,
  seed: NormalizedTrack
): Promise<NormalizedTrack | null> {
  const q = `${title} ${artist}`.trim()
  if (!q) return null

  try {
    const data = await verome.search(q, 'songs')
    const candidate = mapSearchResponse(data).tracks[0]
    if (!candidate) return null
    return enrichTrackCover({
      ...candidate,
      coverUrl: candidate.coverUrl ?? seed.coverUrl,
      album: seed.album ?? candidate.album
    })
  } catch {
    return null
  }
}

const PLAYABLE_PROVIDERS = new Set<NormalizedTrack['provider']>(['verome', 'audius', 'jamendo', 'netease', 'kugou'])

/** 将酷我/元数据曲目批量反查为 Verome 可播条目（并行，带上限） */
export async function promoteTracksToVerome(
  verome: VeromeClient,
  tracks: NormalizedTrack[],
  maxLookups = 16
): Promise<NormalizedTrack[]> {
  const seen = new Set<string>()
  const out: NormalizedTrack[] = []
  const needResolve: NormalizedTrack[] = []

  for (const track of tracks) {
    const enriched = enrichTrackCover(track)
    if (PLAYABLE_PROVIDERS.has(enriched.provider)) {
      if (enriched.provider === 'verome' && !isValidYoutubeVideoId(enriched.videoId)) {
        needResolve.push(enriched)
        continue
      }
      if (seen.has(enriched.trackKey)) continue
      seen.add(enriched.trackKey)
      out.push(enriched)
      continue
    }
    needResolve.push(enriched)
  }

  const batch = needResolve.slice(0, maxLookups)
  const resolved = await Promise.all(
    batch.map((t) => findVeromeTrackByQuery(verome, t.title, t.artist, t))
  )
  for (const r of resolved) {
    if (!r || !PLAYABLE_PROVIDERS.has(r.provider)) continue
    if (seen.has(r.trackKey)) continue
    seen.add(r.trackKey)
    out.push(r)
  }
  return out
}

export function filterPlayableTracks(tracks: NormalizedTrack[]): NormalizedTrack[] {
  return tracks.filter((t) => PLAYABLE_PROVIDERS.has(t.provider))
}

/** 播放前轻量修正：补封面、修正无效 videoId */
export async function ensurePlayableTrack(
  verome: VeromeClient,
  track: NormalizedTrack
): Promise<NormalizedTrack> {
  const enriched = enrichTrackCover(track)
  if (enriched.provider !== 'verome') return enriched
  if (isValidYoutubeVideoId(enriched.videoId)) return enriched
  const found = await findVeromeTrackByQuery(verome, enriched.title, enriched.artist, enriched)
  return found ?? enriched
}

/** 播放前归一化：非 Verome 曲目反查 Verome，Verome 曲目修正无效 videoId */
export async function normalizeForPlayback(
  verome: VeromeClient,
  track: NormalizedTrack
): Promise<NormalizedTrack> {
  const enriched = enrichTrackCover(track)
  if (enriched.provider === 'verome') {
    return ensurePlayableTrack(verome, enriched)
  }
  if (
    enriched.provider === 'audius' ||
    enriched.provider === 'jamendo' ||
    enriched.provider === 'netease' ||
    enriched.provider === 'kugou'
  ) {
    return enriched
  }
  const found = await findVeromeTrackByQuery(verome, enriched.title, enriched.artist, enriched)
  return found ?? enriched
}
