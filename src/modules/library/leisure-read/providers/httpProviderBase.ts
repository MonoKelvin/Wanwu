import type { LeisureReadTabId, LeisureReadContent } from '@modules/library/leisure-read/domain/types'
import { hashContentId } from '@modules/library/leisure-read/domain/types'
import type { FetchFn, IContentProvider } from '@modules/library/leisure-read/providers/types'

export function createJsonProvider(config: {
  id: string
  url: string
  tab: LeisureReadTabId
  headers?: Record<string, string>
  map: (data: unknown) => Omit<LeisureReadContent, 'tab' | 'contentId' | 'providerId'>
}): (fetchFn: FetchFn) => IContentProvider {
  return (fetchFn) => ({
    id: config.id,
    async fetch(tab, signal) {
      const res = await fetchFn(config.url, { signal, headers: config.headers })
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
}): (fetchFn: FetchFn) => IContentProvider {
  return (fetchFn) => ({
    id: config.id,
    async fetch(tab, signal) {
      const res = await fetchFn(config.url, { signal })
      if (!res.ok) throw new Error(String(res.status))
      const body = (await res.text()).trim()
      if (!body) throw new Error('empty_body')
      return {
        tab,
        contentId: hashContentId(body),
        providerId: config.id,
        body
      }
    }
  })
}
