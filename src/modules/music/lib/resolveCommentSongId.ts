import type { NormalizedTrack } from '@shared/types/music'

/** 平台评论 API 使用的歌曲 ID */
export function resolveCommentSongId(track: NormalizedTrack | null | undefined): string {
  if (!track) return ''
  const vid = track.videoId?.trim()
  if (vid) return vid.split('|')[0]!
  const key = track.trackKey.trim()
  if (!key) return ''
  const colon = key.lastIndexOf(':')
  if (colon >= 0) return key.slice(colon + 1)
  return key
}
