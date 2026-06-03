import type { AppSettings } from '../../../../src/shared/types/settings'
import type { IMusicPlatformService } from './IMusicPlatformService'
import { KugouPlatformService } from './kugou/kugouPlatformService'
import { NeteasePlatformService } from './netease/neteasePlatformService'
import type { MusicPlatformId } from './types'

export class MusicPlatformManager {
  private _netease: NeteasePlatformService | null = null
  private _kugou: KugouPlatformService | null = null
  private lastSettings: AppSettings | null = null

  constructor(private readonly basePath: string) {}

  get netease(): NeteasePlatformService {
    if (!this._netease) {
      this._netease = new NeteasePlatformService(this.basePath)
      if (this.lastSettings) this.configureNetease(this.lastSettings)
    }
    return this._netease
  }

  get kugou(): KugouPlatformService {
    if (!this._kugou) {
      this._kugou = new KugouPlatformService(this.basePath)
      if (this.lastSettings) this.configureKugou(this.lastSettings)
    }
    return this._kugou
  }

  applySettings(settings: AppSettings): void {
    this.lastSettings = settings
    if (this._netease) this.configureNetease(settings)
    if (this._kugou) this.configureKugou(settings)
  }

  primary(settings: AppSettings): IMusicPlatformService {
    return settings.musicPrimarySource === 'kugou' ? this.kugou : this.netease
  }

  get(platformId: MusicPlatformId): IMusicPlatformService {
    return platformId === 'kugou' ? this.kugou : this.netease
  }

  private configureNetease(settings: AppSettings): void {
    this._netease?.configure({
      realIp: settings.musicNeteaseRealIp,
      proxy: settings.musicNeteaseProxy
    })
  }

  private configureKugou(settings: AppSettings): void {
    this._kugou?.configure({
      proxy: settings.musicNeteaseProxy
    })
  }
}
