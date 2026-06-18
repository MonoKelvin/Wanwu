import { normalizeLinkUrl } from './linkUrl'

export type LinkReachabilityIssue = 'invalid_syntax' | 'network' | 'http_status' | 'timeout'

export interface LinkCheckResult {
  unreachable: boolean
  issue?: LinkReachabilityIssue
}

const TIMEOUT_MS = 12_000
const USER_AGENT = 'Mozilla/5.0 (compatible; WanwuLinkChecker/1.0)'

export function checkLinkSyntax(raw: string): LinkCheckResult {
  const t = raw?.trim()
  if (!t) return { unreachable: true, issue: 'invalid_syntax' }
  try {
    normalizeLinkUrl(t)
    return { unreachable: false }
  } catch {
    return { unreachable: true, issue: 'invalid_syntax' }
  }
}

function isBadHttpStatus(status: number): boolean {
  if (status >= 200 && status < 400) return false
  if (status === 401 || status === 403) return false
  if (status === 404 || status === 410) return true
  return status >= 400
}

async function requestUrl(url: string, method: 'HEAD' | 'GET'): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const headers: Record<string, string> = { 'User-Agent': USER_AGENT }
    if (method === 'GET') headers.Range = 'bytes=0-0'
    return await fetch(url, {
      method,
      redirect: 'follow',
      signal: controller.signal,
      headers
    })
  } finally {
    clearTimeout(timer)
  }
}

/** 语法合法后探测网络可达性（HEAD → GET 回退） */
export async function checkLinkReachability(rawUrl: string): Promise<LinkCheckResult> {
  const syntax = checkLinkSyntax(rawUrl)
  if (syntax.unreachable) return syntax

  let url: string
  try {
    url = normalizeLinkUrl(rawUrl)
  } catch {
    return { unreachable: true, issue: 'invalid_syntax' }
  }

  const methods: Array<'HEAD' | 'GET'> = ['HEAD', 'GET']
  let lastIssue: LinkReachabilityIssue = 'network'

  for (const method of methods) {
    try {
      const res = await requestUrl(url, method)
      if (isBadHttpStatus(res.status)) {
        return { unreachable: true, issue: 'http_status' }
      }
      return { unreachable: false }
    } catch (e) {
      const aborted = e instanceof Error && e.name === 'AbortError'
      lastIssue = aborted ? 'timeout' : 'network'
    }
  }

  return { unreachable: true, issue: lastIssue }
}

export async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  if (!items.length) return []
  const results = new Array<R>(items.length)
  let next = 0

  async function worker() {
    while (next < items.length) {
      const i = next++
      results[i] = await fn(items[i]!, i)
    }
  }

  const workers = Math.min(Math.max(1, concurrency), items.length)
  await Promise.all(Array.from({ length: workers }, () => worker()))
  return results
}
