import type { MusicModuleSettings } from '@modules/music/domain/settings'
import type { IMusicPlatformService } from './IMusicPlatformService'
import { KugouPlatformService } from './kugou/kugouPlatformService'
import { NeteasePlatformService } from './netease/neteasePlatformService'
import type { MusicPlatformId } from './types'

export class MusicPlatformManager {
  private _netease: NeteasePlatformService | null = null
  private _kugou: KugouPlatformService | null = null
  private lastSettings: MusicModuleSettings | null = null

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

  applySettings(settings: MusicModuleSettings): void {
    this.lastSettings = settings
    if (this._netease) this.configureNetease(settings)
    if (this._kugou) this.configureKugou(settings)
  }

  primary(settings: MusicModuleSettings): IMusicPlatformService {
    return settings.primarySource === 'kugou' ? this.kugou : this.netease
  }

  get(platformId: MusicPlatformId): IMusicPlatformService {
    return platformId === 'kugou' ? this.kugou : this.netease
  }

  private configureNetease(settings: MusicModuleSettings): void {
    this._netease?.configure({
      realIp: settings.neteaseRealIp,
      proxy: settings.neteaseProxy
    })
  }

  private configureKugou(settings: MusicModuleSettings): void {
    this._kugou?.configure({
      proxy: settings.neteaseProxy
    })
  }
}
