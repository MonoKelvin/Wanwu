import type { MusicPlatformId } from './types'

export function parseBrowseId(
  browseId: string
): { platform: MusicPlatformId; kind: string; id: string } | null {
  const m = browseId.match(/^(netease|kugou):([^:]+):(.+)$/)
  if (!m) return null
  return { platform: m[1] as MusicPlatformId, kind: m[2]!, id: m[3]! }
}
