import { pathCase } from 'change-case'
import type { IMusicPlatformGateway } from './IMusicPlatformGateway'
import type { MusicPlatformId, MusicPlatformInvokeOptions } from './types'

type ApiModule = Record<string, unknown>

function parseCookieHeader(cookie?: Record<string, string | undefined>): Record<string, string> {
  if (!cookie) return {}
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(cookie)) {
    if (v) out[k] = v
  }
  return out
}

export type MusicGatewayPathStyle = 'camelCase' | 'snakeCase'

function normalizeRequestKey(requestPath: string, pathStyle: MusicGatewayPathStyle): string {
  const cleaned = requestPath.replace(/^\//, '')
  return pathStyle === 'snakeCase' ? cleaned.replace(/\//g, '_') : cleaned
}

function findApiFunction(
  apiModule: ApiModule,
  requestPath: string,
  pathStyle: MusicGatewayPathStyle
): ((params: unknown) => Promise<{ body: unknown }>) | null {
  const normalized = normalizeRequestKey(requestPath, pathStyle)
  const key = Object.keys(apiModule).find((name) => {
    if (typeof apiModule[name] !== 'function') return false
    if (name === normalized) return true
    if (pathStyle === 'camelCase') return pathCase(name) === normalized
    return false
  })
  if (!key) return null
  return apiModule[key] as (params: unknown) => Promise<{ body: unknown }>
}

/** 动态路由网关：path 如 login/qr/key → loginQrKey */
export class DynamicModuleGateway implements IMusicPlatformGateway {
  constructor(
    readonly platformId: MusicPlatformId,
    readonly label: string,
    private readonly apiModule: ApiModule | null,
    private readonly pathStyle: MusicGatewayPathStyle = 'camelCase'
  ) {}

  isAvailable(): boolean {
    return !!this.apiModule
  }

  async invoke<T = unknown>(
    path: string,
    params: Record<string, unknown> = {},
    options: MusicPlatformInvokeOptions = {}
  ): Promise<T> {
    if (!this.apiModule) {
      throw new Error(`${this.label} API 模块未安装`)
    }
    const fn = findApiFunction(this.apiModule, path, this.pathStyle)
    if (!fn) {
      throw new Error(`${this.label} API 不存在: ${path}`)
    }
    const payload = {
      ...params,
      ...(options.body ?? {}),
      ...(options.realIp ? { realIP: options.realIp } : {}),
      ...(options.proxy ? { proxy: options.proxy } : {}),
      cookie: parseCookieHeader(options.cookie)
    }
    const result = await fn(payload)
    return result.body as T
  }
}
