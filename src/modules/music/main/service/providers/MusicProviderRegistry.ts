import type { MusicModuleSettings } from '@modules/music/domain/settings'
import type { NormalizedTrack } from '@modules/music/domain/types'
import type { VeromeClient } from '../veromeClient'
import type { JamendoProvider } from './jamendoProvider'
import type { AudiusProvider } from './audiusProvider'
import type { KuwoProvider } from './kuwoProvider'
import type { NeteasePlatformService } from '../platform/netease/neteasePlatformService'
import type { KugouPlatformService } from '../platform/kugou/kugouPlatformService'
import { NeteaseMusicProvider } from './neteaseProvider'
import { KugouMusicProvider } from './kugouProvider'
import { ItunesProvider } from './itunesProvider'
import { MusicBrainzProvider } from './musicbrainzProvider'
import type { IMusicProvider, MusicProviderHealth } from './IMusicProvider'
import { pickBestAudioStream, type AudioStreamFormat, type PickedStream } from '../streamUrl'

class VeromeStreamProvider implements IMusicProvider {
  readonly id = 'verome' as const
  readonly label = 'Verome'

  constructor(private readonly verome: VeromeClient) {}

  enabled(): boolean {
    return true
  }

  async resolveStream(track: NormalizedTrack): Promise<PickedStream> {
    let picked: PickedStream | undefined
    try {
      const streamData = await this.verome.getStream(track.videoId)
      picked = pickBestAudioStream(streamData)
      if (!picked) {
        const song = await this.verome.getSong(track.videoId)
        picked = pickBestAudioStream(song)
      }
    } catch {
      const song = await this.verome.getSong(track.videoId).catch(() => null)
      picked = song ? pickBestAudioStream(song) : undefined
    }

    if (!picked) throw new Error('Verome 无法解析流地址')

    return {
      url: picked.url.startsWith('http') ? this.verome.proxyUrl(picked.url) : picked.url,
      format: picked.format,
      mimeType: picked.mimeType
    }
  }
}

class JamendoMusicProvider implements IMusicProvider {
  readonly id = 'jamendo' as const
  readonly label = 'Jamendo'

  constructor(private readonly inner: JamendoProvider | null) {}

  enabled(): boolean {
    return !!this.inner
  }

  searchTracks(query: string, limit = 12): Promise<NormalizedTrack[]> {
    return this.inner?.searchTracks(query, limit) ?? Promise.resolve([])
  }

  async resolveStream(track: NormalizedTrack): Promise<PickedStream> {
    if (!this.inner) throw new Error('Jamendo 未启用')
    const url = await this.inner.resolveStreamUrl(track.videoId)
    return { url, format: 'mp3' }
  }
}

class AudiusMusicProvider implements IMusicProvider {
  readonly id = 'audius' as const
  readonly label = 'Audius'

  constructor(private readonly inner: AudiusProvider | null) {}

  enabled(): boolean {
    return !!this.inner
  }

  searchTracks(query: string, limit = 6): Promise<NormalizedTrack[]> {
    return this.inner?.searchTracks(query, limit) ?? Promise.resolve([])
  }

  async resolveStream(track: NormalizedTrack): Promise<PickedStream> {
    if (!this.inner) throw new Error('Audius 未启用')
    const url = await this.inner.resolveStreamUrl(track.videoId)
    return { url, format: 'mp3' }
  }
}

class KuwoMusicProvider implements IMusicProvider {
  readonly id = 'kuwo' as const
  readonly label = '酷我'

  constructor(private readonly inner: KuwoProvider) {}

  enabled(): boolean {
    return true
  }

  searchTracks(query: string, limit = 12): Promise<NormalizedTrack[]> {
    return this.inner.searchTracks(query, limit)
  }
}

class ItunesMusicProvider implements IMusicProvider {
  readonly id = 'itunes' as const
  readonly label = 'iTunes'
  private readonly inner = new ItunesProvider()

  enabled(): boolean {
    return true
  }

  searchTracks(query: string, limit = 6): Promise<NormalizedTrack[]> {
    return this.inner.searchTracks(query, limit)
  }
}

class MusicBrainzMusicProvider implements IMusicProvider {
  readonly id = 'musicbrainz' as const
  readonly label = 'MusicBrainz'
  private readonly inner = new MusicBrainzProvider()

  enabled(): boolean {
    return true
  }

  searchTracks(query: string, limit = 4): Promise<NormalizedTrack[]> {
    return this.inner.searchRecordings(query, limit)
  }
}

export class MusicProviderRegistry {
  private readonly providers: IMusicProvider[]

  constructor(
    verome: VeromeClient,
    kuwo: KuwoProvider,
    jamendo: JamendoProvider | null,
    audius: AudiusProvider | null,
    netease: NeteasePlatformService | null,
    kugou: KugouPlatformService | null,
    getSettings: () => MusicModuleSettings
  ) {
    this.providers = [
      ...(netease ? [new NeteaseMusicProvider(netease, getSettings)] : []),
      ...(kugou ? [new KugouMusicProvider(kugou, getSettings)] : []),
      new KuwoMusicProvider(kuwo),
      new VeromeStreamProvider(verome),
      new JamendoMusicProvider(jamendo),
      new AudiusMusicProvider(audius),
      new ItunesMusicProvider(),
      new MusicBrainzMusicProvider()
    ]
  }

  listHealth(): MusicProviderHealth[] {
    return this.providers.map((p) => ({
      id: p.id,
      label: p.label,
      enabled: p.enabled(),
      streamCapable: !!p.resolveStream
    }))
  }

  searchProviders(): IMusicProvider[] {
    return this.providers.filter(
      (p) =>
        p.enabled() &&
        p.searchTracks &&
        p.id !== 'itunes' &&
        p.id !== 'musicbrainz' &&
        p.id !== 'kuwo'
    )
  }

  getProvider(id: NormalizedTrack['provider']): IMusicProvider | undefined {
    return this.providers.find((p) => p.id === id)
  }

  async resolveStream(track: NormalizedTrack): Promise<PickedStream | null> {
    const provider = this.getProvider(track.provider)
    if (!provider?.enabled() || !provider.resolveStream) return null
    return provider.resolveStream(track)
  }
}

export type { AudioStreamFormat, PickedStream }
