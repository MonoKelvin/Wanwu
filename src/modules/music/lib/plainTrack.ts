import { toRaw } from 'vue'
import type { NormalizedTrack } from '@modules/music/domain/types'

/** IPC 入参须为可 structured clone 的纯对象，Vue reactive proxy 会导致 clone 失败 */
export function plainTrack(track: NormalizedTrack): NormalizedTrack {
  const t = toRaw(track)
  return {
    trackKey: t.trackKey,
    provider: t.provider,
    videoId: t.videoId,
    title: t.title,
    artist: t.artist,
    album: t.album,
    durationSec: t.durationSec,
    coverUrl: t.coverUrl,
    browseId: t.browseId,
    badges: t.badges?.length ? [...t.badges] : undefined,
    isTrial: t.isTrial
  }
}
