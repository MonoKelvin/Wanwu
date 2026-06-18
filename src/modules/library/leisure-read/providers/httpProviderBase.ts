import type { LeisureReadTabId, LeisureReadContent } from '@modules/library/leisure-read/domain/types'
import { hashContentId } from '@modules/library/leisure-read/domain/types'
import type { FetchFn, IContentProvider } from '@modules/library/leisure-read/providers/types'

export function createJsonProvider(config: {
  id: string
  url: string
  tab: LeisureReadTabId
  headers?: Record<string, string>
  timeoutMs?: number
  map: (data: unknown) => Omit<LeisureReadContent, 'tab' | 'contentId' | 'providerId'>
}): (fetchFn: FetchFn) => IContentProvider {
  return (fetchFn) => ({
    id: config.id,
    async fetch(tab, signal) {
      const res = await fetchFn(config.url, {
        signal,
        headers: config.headers,
        timeoutMs: config.timeoutMs
      })
      if (!res.ok) throw new Error(String(res.status))
      const data = await res.json()
      const mapped = config.map(data)
      const contentId = hashContentId(mapped.body + (mapped.title ?? '') + (mapped.subtitle ?? ''))
      return { tab, contentId, providerId: config.id, ...mapped }
    }
  })
}

export function createTextProvider(config: {
  id: string
  url: string
  tab: LeisureReadTabId
  timeoutMs?: number
  map?: (text: string) => Omit<LeisureReadContent, 'tab' | 'contentId' | 'providerId'>
}): (fetchFn: FetchFn) => IContentProvider {
  return (fetchFn) => ({
    id: config.id,
    async fetch(tab, signal) {
      const res = await fetchFn(config.url, { signal, timeoutMs: config.timeoutMs })
      if (!res.ok) throw new Error(String(res.status))
      const text = (await res.text()).trim()
      if (!text) throw new Error('empty_body')
      const mapped = config.map ? config.map(text) : { body: text }
      if (!mapped.body?.trim()) throw new Error('empty_body')
      const contentId = hashContentId(
        mapped.body + (mapped.title ?? '') + (mapped.subtitle ?? '') + (mapped.answer ?? '')
      )
      return { tab, contentId, providerId: config.id, ...mapped }
    }
  })
}

export function normalizeArticleText(raw: string): string {
  return raw
    .replace(/\r\r/g, '\n\n')
    .replace(/\r/g, '\n')
    .replace(/\\r\\r/g, '\n\n')
    .replace(/\\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
