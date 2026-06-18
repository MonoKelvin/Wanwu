import type { LeisureReadTabId } from '@modules/library/leisure-read/domain/types'
import { joinFooter, hashContentId } from '@modules/library/leisure-read/domain/types'
import {
  resolveJinrishiciToken,
  writeJinrishiciToken
} from '@modules/library/leisure-read/main/jinrishiciToken'
import type { FetchFn, IContentProvider } from '@modules/library/leisure-read/providers/types'

interface JinrishiciSentenceResponse {
  status?: string
  errCode?: number
  data?: {
    content?: string
    origin?: { title?: string; dynasty?: string; author?: string }
  }
  token?: string
}

function mapSentence(data: JinrishiciSentenceResponse): { body: string; footer?: string } {
  const content = data.data?.content?.trim()
  if (!content) throw new Error('missing jinrishici content')
  const origin = data.data?.origin
  const authorLine = origin?.author
    ? [origin.dynasty, origin.author].filter(Boolean).join(' · ')
    : undefined
  return {
    body: content,
    footer: joinFooter([authorLine, origin?.title])
  }
}

/** 今日诗词 v2：Token + 智能推荐（见 https://www.jinrishici.com/doc/ ） */
export function createJinrishiciV2Provider(fetchFn: FetchFn): IContentProvider {
  return {
    id: 'jinrishici-v2',
    async fetch(tab: LeisureReadTabId, signal?: AbortSignal) {
      let token = await resolveJinrishiciToken(fetchFn, signal)
      let res = await fetchFn('https://v2.jinrishici.com/sentence', {
        signal,
        headers: { 'X-User-Token': token }
      })

      let row = (await res.json()) as JinrishiciSentenceResponse

      if (row.status === 'error' && row.errCode === 2002) {
        token = await resolveJinrishiciToken(fetchFn, signal, true)
        res = await fetchFn('https://v2.jinrishici.com/sentence', {
          signal,
          headers: { 'X-User-Token': token }
        })
        row = (await res.json()) as JinrishiciSentenceResponse
      }

      if (!res.ok || row.status === 'error') {
        throw new Error(row.errCode ? `jinrishici_${row.errCode}` : String(res.status))
      }

      if (row.token?.trim()) writeJinrishiciToken(row.token.trim())

      const mapped = mapSentence(row)
      const contentId = hashContentId(mapped.body + (mapped.footer ?? ''))
      return { tab, contentId, providerId: 'jinrishici-v2', ...mapped }
    }
  }
}
