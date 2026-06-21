/** 主进程 HTTP 请求封装：统一超时、User-Agent 与 GBK 解码 */
const DEFAULT_TIMEOUT_MS = 8000

type FetchInit = RequestInit & { timeoutMs?: number; encoding?: 'utf-8' | 'gbk' }

async function fetchWithTimeout(url: string, init?: FetchInit): Promise<Response> {
  const timeoutMs = init?.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const { timeoutMs: _omit, encoding: _enc, ...rest } = init ?? {}
    const res = await fetch(url, {
      ...rest,
      signal: ctrl.signal,
      headers: {
        Accept: '*/*',
        'User-Agent': 'WanwuWeather/1.0',
        ...rest.headers
      }
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return res
  } finally {
    clearTimeout(timer)
  }
}

export async function fetchText(url: string, init?: FetchInit): Promise<string> {
  const res = await fetchWithTimeout(url, init)
  const buf = await res.arrayBuffer()
  const encoding = init?.encoding ?? 'utf-8'
  return new TextDecoder(encoding).decode(buf)
}

export async function fetchJson<T>(url: string, init?: FetchInit): Promise<T> {
  if (init?.encoding && init.encoding !== 'utf-8') {
    const text = await fetchText(url, init)
    return JSON.parse(text.trim()) as T
  }
  const res = await fetchWithTimeout(url, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...init?.headers
    }
  })
  return (await res.json()) as T
}
