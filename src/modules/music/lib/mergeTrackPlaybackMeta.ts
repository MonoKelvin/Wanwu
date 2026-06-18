import type { MusicTrackBadge, NormalizedTrack } from '@modules/music/domain/types'

/** 合并试听等播放期元数据到曲目 */
export function mergeTrackPlaybackMeta(
  track: NormalizedTrack,
  meta?: { isTrial?: boolean }
): NormalizedTrack {
  if (!meta?.isTrial) return track
  const badges = new Set<MusicTrackBadge>(track.badges ?? [])
  badges.add('trial')
  return { ...track, isTrial: true, badges: [...badges] }
}
