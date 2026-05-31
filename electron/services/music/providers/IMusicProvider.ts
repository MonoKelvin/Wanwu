import type { NormalizedTrack } from '../../../src/shared/types/music'
import type { PickedStream } from '../streamUrl'

/** 可插拔音乐数据源接口 */
export interface IMusicProvider {
  readonly id: NormalizedTrack['provider']
  readonly label: string
  enabled(): boolean
  searchTracks?(query: string, limit?: number): Promise<NormalizedTrack[]>
  resolveStream?(track: NormalizedTrack): Promise<PickedStream>
}

export interface MusicProviderHealth {
  id: NormalizedTrack['provider']
  label: string
  enabled: boolean
  streamCapable: boolean
}
