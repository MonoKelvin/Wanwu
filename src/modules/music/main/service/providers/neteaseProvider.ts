import type { NormalizedTrack } from '@modules/music/domain/types'
import type { MusicModuleSettings, MusicNeteaseQuality } from '@modules/music/domain/settings'
import type { PickedStream } from '../streamUrl'
import type { IMusicProvider } from './IMusicProvider'
import type { NeteasePlatformService } from '../platform/netease/neteasePlatformService'
import { MusicSearchType } from '../platform/types'

export class NeteaseMusicProvider implements IMusicProvider {
  readonly id = 'netease' as const
  readonly label = '网易云'

  constructor(
    private readonly platform: NeteasePlatformService,
    private readonly getSettings: () => MusicModuleSettings
  ) {}

  enabled(): boolean {
    return true
  }

  async searchTracks(query: string, limit = 20): Promise<NormalizedTrack[]> {
    const result = await this.platform.cloudSearch(query, MusicSearchType.Song, limit)
    return result.tracks
  }

  async resolveStream(track: NormalizedTrack): Promise<PickedStream> {
    const quality = this.getSettings().neteaseQuality
    const picked = await this.platform.resolveStream(track.videoId, quality)
    if (!picked?.url) throw new Error('网易云无法解析流地址')
    return { url: picked.url, format: picked.format }
  }
}
