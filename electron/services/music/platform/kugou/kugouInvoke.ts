import type { PlatformSessionStore } from '../sessionStore'
import { loadKugouApiModule } from './loadKugouApi'
import { parseKugouJsonBody } from './kugouResponse'

type KugouApiResponse = { body?: unknown; cookie?: string[] }

function resolveKugouFn(api: Record<string, unknown>, path: string) {
  const key = path.replace(/^\//, '').replace(/\//g, '_')
  const fn = api[key]
  return typeof fn === 'function' ? (fn as (p: Record<string, unknown>) => Promise<KugouApiResponse>) : null
}

/**
 * 调用酷狗 API 并持久化响应 Set-Cookie（见 KuGouMusicApi #161、官方调用前须知）。
 */
export async function invokeKugou(
  session: PlatformSessionStore,
  path: string,
  params: Record<string, unknown> = {},
  proxy?: string
): Promise<unknown> {
  const api = loadKugouApiModule()
  if (!api) throw new Error('酷狗 API 模块加载失败')

  const fn = resolveKugouFn(api, path)
  if (!fn) throw new Error(`酷狗 API 不存在: ${path}`)

  const payload: Record<string, unknown> = {
    ...params,
    cookie: session.cookieObject()
  }
  if (proxy) payload.proxy = proxy

  const res = await fn(payload)
  if (Array.isArray(res?.cookie) && res.cookie.length) {
    session.mergeKugouCookieStrings(res.cookie)
  }
  return parseKugouJsonBody(res?.body ?? res)
}
