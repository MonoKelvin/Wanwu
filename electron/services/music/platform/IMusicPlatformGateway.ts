import type { MusicPlatformId, MusicPlatformInvokeOptions } from './types'

/** 底层 API 网关：统一 invoke(path) 适配网易云 / 酷狗等 Node API 包 */
export interface IMusicPlatformGateway {
  readonly platformId: MusicPlatformId
  readonly label: string
  isAvailable(): boolean
  invoke<T = unknown>(
    path: string,
    params?: Record<string, unknown>,
    options?: MusicPlatformInvokeOptions
  ): Promise<T>
}
