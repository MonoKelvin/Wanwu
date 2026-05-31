import type { NormalizedTrack } from '../../../../src/shared/types/music'
import type { AppSettings } from '../../../../src/shared/types/settings'
import type { PickedStream } from '../streamUrl'
import type { IMusicProvider } from './IMusicProvider'
import type { KugouPlatformService } from '../platform/kugou/kugouPlatformService'
import { MusicSearchType } from '../platform/types'

export class KugouMusicProvider implements IMusicProvider {
  readonly id = 'kugou' as const
  readonly label = '酷狗'

  constructor(
    private readonly platform: KugouPlatformService,
    private readonly getSettings: () => AppSettings
  ) {}

  enabled(): boolean {
    return this.platform.isReady()
  }

  async searchTracks(query: string, limit = 20): Promise<NormalizedTrack[]> {
    const result = await this.platform.cloudSearch(query, MusicSearchType.Song, limit)
    return result.tracks
  }

  async resolveStream(track: NormalizedTrack): Promise<PickedStream> {
    const quality = this.getSettings().musicNeteaseQuality
    const picked = await this.platform.resolveStream(track.videoId, quality)
    if (!picked?.url) throw new Error('酷狗无法解析流地址')
    return { url: picked.url, format: picked.format }
  }
}
