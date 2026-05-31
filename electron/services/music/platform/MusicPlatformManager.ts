import type { AppSettings } from '../../../../src/shared/types/settings'
import type { IMusicPlatformService } from './IMusicPlatformService'
import { KugouPlatformService } from './kugou/kugouPlatformService'
import { NeteasePlatformService } from './netease/neteasePlatformService'
import type { MusicPlatformId } from './types'

export class MusicPlatformManager {
  readonly netease: NeteasePlatformService
  readonly kugou: KugouPlatformService

  constructor(basePath: string) {
    this.netease = new NeteasePlatformService(basePath)
    this.kugou = new KugouPlatformService(basePath)
  }

  applySettings(settings: AppSettings): void {
    this.netease.configure({
      realIp: settings.musicNeteaseRealIp,
      proxy: settings.musicNeteaseProxy
    })
    this.kugou.configure({
      proxy: settings.musicNeteaseProxy
    })
  }

  primary(settings: AppSettings): IMusicPlatformService {
    return settings.musicPrimarySource === 'kugou' ? this.kugou : this.netease
  }

  get(platformId: MusicPlatformId): IMusicPlatformService {
    return platformId === 'kugou' ? this.kugou : this.netease
  }
}
