import {
  createJsonProvider,
  createTextProvider,
  normalizeArticleText
} from '@modules/library/leisure-read/providers/httpProviderBase'
import { joinFooter, hashContentId, stripHtml } from '@modules/library/leisure-read/domain/types'
import type { LeisureReadTabId, LeisureReadContent } from '@modules/library/leisure-read/domain/types'
import { LeisureReadFetchError } from '@modules/library/leisure-read/domain/types'
import { resolveProviderList } from '@modules/library/leisure-read/domain/providerChains'
import type { LeisureReadModuleSettings } from '@modules/library/leisure-read/domain/settings'
import { LEISURE_READ_SLOW_FETCH_TIMEOUT_MS } from '@modules/library/leisure-read/main/httpFetch'
import type { FetchFn, IContentProvider, ProviderFactory } from '@modules/library/leisure-read/providers/types'
import { createJinrishiciV2Provider } from '@modules/library/leisure-read/providers/jinrishiciV2'

const hitokoto = createJsonProvider({
  id: 'hitokoto',
  url: 'https://v1.hitokoto.cn/?encode=json',
  tab: 'quote',
  map: (data) => {
    const row = data as { hitokoto?: string; from?: string; from_who?: string }
    if (!row.hitokoto) throw new Error('missing hitokoto')
    return { body: row.hitokoto, footer: joinFooter([row.from_who, row.from]) }
  }
})

const jinrishici = createJsonProvider({
  id: 'jinrishici',
  url: 'https://v1.jinrishici.com/all.json',
  tab: 'quote',
  map: (data) => {
    const row = data as { content?: string; author?: string; origin?: string }
    if (!row.content) throw new Error('missing content')
    return { body: row.content, footer: joinFooter([row.author, row.origin]) }
  }
})

function jinrishiciV2(fetchFn: FetchFn): IContentProvider {
  return createJinrishiciV2Provider(fetchFn)
}

const xxapiYiyan = createJsonProvider({
  id: 'xxapi-yiyan',
  url: 'https://v2.xxapi.cn/api/yiyan?type=hitokoto',
  tab: 'quote',
  map: (data) => {
    const row = data as { data?: string }
    if (!row.data?.trim()) throw new Error('missing data')
    return { body: row.data.trim() }
  }
})

const sainticSentence = createJsonProvider({
  id: 'saintic-sentence',
  url: 'https://hub.saintic.com/openservice/sentence/all.json',
  tab: 'quote',
  map: (data) => {
    const row = data as { data?: { content?: string; author?: string; origin?: string } }
    const item = row.data
    if (!item?.content) throw new Error('missing sentence')
    return { body: item.content, footer: joinFooter([item.author, item.origin]) }
  }
})

const vvhanJoke = createJsonProvider({
  id: 'vvhan-joke',
  url: 'https://api.vvhan.com/api/joke?type=json',
  tab: 'joke',
  map: (data) => {
    const row = data as { joke?: string; title?: string }
    if (!row.joke) throw new Error('missing joke')
    return { title: row.title, body: row.joke }
  }
})

const timelessqJoke = createJsonProvider({
  id: 'timelessq-joke',
  url: 'https://api.timelessq.com/joke',
  tab: 'joke',
  map: (data) => {
    const row = data as { data?: { content?: string } }
    if (!row.data?.content) throw new Error('missing content')
    return { body: row.data.content }
  }
})

const briskJoke = createTextProvider({
  id: 'brisk-joke',
  url: 'http://brisk.eu.org/api/joke.php',
  tab: 'joke'
})

const tminiJoke = createJsonProvider({
  id: 'tmini-joke',
  url: 'https://www.tmini.net/api/qm_xiaohua',
  tab: 'joke',
  map: (data) => {
    const row = data as { data?: { content?: string; title?: string } | string }
    const payload = row.data
    const body = typeof payload === 'string' ? payload : payload?.content
    if (!body?.trim()) throw new Error('missing joke')
    return {
      title: typeof payload === 'object' ? payload?.title : undefined,
      body: body.trim()
    }
  }
})

const jokeApiSafe = createJsonProvider({
  id: 'jokeapi-safe',
  url: 'https://v2.jokeapi.dev/joke/Any?lang=en&safe-mode&blacklistFlags=nsfw,religious,political,racist,sexist,explicit',
  tab: 'joke',
  map: (data) => {
    const row = data as { type?: string; joke?: string; setup?: string; delivery?: string }
    if (row.type === 'twopart') {
      if (!row.setup || !row.delivery) throw new Error('missing twopart')
      return { subtitle: row.setup, body: row.delivery }
    }
    if (!row.joke) throw new Error('missing joke')
    return { body: row.joke }
  }
})

const officialJoke = createJsonProvider({
  id: 'official-joke-api',
  url: 'https://official-joke-api.appspot.com/random_joke',
  tab: 'joke',
  map: (data) => {
    const row = data as { setup?: string; punchline?: string }
    if (!row.setup || !row.punchline) throw new Error('missing joke')
    return { subtitle: row.setup, body: row.punchline }
  }
})

const icanhazdadjoke = createJsonProvider({
  id: 'icanhazdadjoke',
  url: 'https://icanhazdadjoke.com/',
  tab: 'joke',
  headers: { Accept: 'application/json' },
  map: (data) => {
    const row = data as { joke?: string }
    if (!row.joke) throw new Error('missing joke')
    return { body: row.joke }
  }
})

const jokeapiRiddle = createJsonProvider({
  id: 'jokeapi-riddle',
  url: 'https://v2.jokeapi.dev/joke/Any?lang=en&safe-mode&blacklistFlags=nsfw,religious,political,racist,sexist,explicit&type=twopart',
  tab: 'riddle',
  map: (data) => {
    const row = data as { type?: string; setup?: string; delivery?: string }
    if (row.type !== 'twopart' || !row.setup || !row.delivery) throw new Error('missing twopart riddle')
    return { body: row.setup.trim(), answer: row.delivery.trim() }
  }
})

const tangdouzBrain = createJsonProvider({
  id: 'tangdouz-brain',
  url: 'https://api.tangdouz.com/a/brain.php?return=json',
  tab: 'riddle',
  map: (data) => {
    const row = data as { question?: string; answer?: string }
    if (!row.question || !row.answer) throw new Error('missing riddle fields')
    return { body: row.question.trim(), answer: row.answer.trim() }
  }
})

const tangdouzBrainText = createTextProvider({
  id: 'tangdouz-brain-text',
  url: 'https://api.tangdouz.com/a/brain.php',
  tab: 'riddle',
  map: (text) => {
    const match = text.match(/问题[：:]\s*(.+?)[\r\n]+答案[：:]\s*(.+)/s)
    if (!match?.[1] || !match[2]) throw new Error('missing riddle fields')
    return { body: match[1].trim(), answer: match[2].trim() }
  }
})

const qqsuuNaowan = createJsonProvider({
  id: 'qqsuu-naowan',
  url: 'https://api.qqsuu.cn/api/dm-naowan?num=3',
  tab: 'riddle',
  map: (data) => {
    const row = data as { data?: { list?: Array<{ quest?: string; result?: string }> } }
    const list = row.data?.list ?? []
    if (!list.length) throw new Error('missing riddle list')
    const pick = list[Math.floor(Math.random() * list.length)]!
    if (!pick.quest || !pick.result) throw new Error('missing riddle fields')
    return { body: pick.quest, answer: pick.result }
  }
})

const tangdouzWenzhang = createJsonProvider({
  id: 'tangdouz-wenzhang',
  url: 'https://api.tangdouz.com/wenzhang.php?return=json',
  tab: 'article',
  map: (data) => {
    const row = data as { title?: string; author?: string; content?: string }
    if (!row.title && !row.content) throw new Error('missing article')
    const body = normalizeArticleText(row.content ?? '')
    if (!body && !row.title) throw new Error('missing article body')
    return {
      title: row.title?.trim(),
      subtitle: row.author?.trim(),
      body: body || row.title || ''
    }
  }
})

const tangdouzWenzhangText = createTextProvider({
  id: 'tangdouz-wenzhang-text',
  url: 'https://api.tangdouz.com/wenzhang.php',
  tab: 'article',
  map: (text) => {
    let rest = text.trim()
    let title: string | undefined
    let author: string | undefined

    const titleMatch = rest.match(/^标题[：:]\s*(.+?)(?:\r|\n|$)/)
    if (titleMatch) {
      title = titleMatch[1].trim()
      rest = rest.slice(titleMatch[0].length).trimStart()
    }
    const authorMatch = rest.match(/^作者[：:]\s*(.+?)(?:\r|\n|$)/)
    if (authorMatch) {
      author = authorMatch[1].trim()
      rest = rest.slice(authorMatch[0].length).trimStart()
    }
    const body = normalizeArticleText(rest)
    if (!body && !title) throw new Error('missing article')
    return {
      title,
      subtitle: author,
      body: body || title || ''
    }
  }
})

const MEIRIYIWEN_HEADERS = {
  Referer: 'https://meiriyiwen.com/',
  Origin: 'https://meiriyiwen.com'
}

interface MeiriyiwenArticlePayload {
  date?: { curr?: string; prev?: string; next?: string }
  author?: string
  title?: string
  digest?: string
  content?: string
  wc?: number
}

function mapMeiriyiwenArticle(raw: unknown) {
  const row = (raw as { data?: MeiriyiwenArticlePayload }).data
  if (!row?.title && !row?.content) throw new Error('missing article')
  const htmlBody = row.content ?? ''
  const plain = stripHtml(htmlBody) || row.digest || row.title || ''
  const wcLabel = row.wc && row.wc > 0 ? `${row.wc} 字` : undefined
  return {
    title: row.title,
    subtitle: row.author,
    body: plain,
    htmlBody: htmlBody || undefined,
    footer: joinFooter([row.date?.curr, wcLabel])
  }
}

function meiriyiwenProvider(id: 'meiriyiwen-random' | 'meiriyiwen-today', path: string): ProviderFactory {
  return createJsonProvider({
    id,
    url: `https://interface.meiriyiwen.com/article/${path}?dev=1`,
    tab: 'article',
    headers: MEIRIYIWEN_HEADERS,
    timeoutMs: LEISURE_READ_SLOW_FETCH_TIMEOUT_MS,
    map: mapMeiriyiwenArticle
  })
}

const PROVIDER_FACTORIES: Record<string, ProviderFactory> = {
  hitokoto,
  'jinrishici-v2': jinrishiciV2,
  jinrishici,
  'xxapi-yiyan': xxapiYiyan,
  'saintic-sentence': sainticSentence,
  'vvhan-joke': vvhanJoke,
  'timelessq-joke': timelessqJoke,
  'brisk-joke': briskJoke,
  'tmini-joke': tminiJoke,
  'jokeapi-safe': jokeApiSafe,
  'official-joke-api': officialJoke,
  icanhazdadjoke,
  'jokeapi-riddle': jokeapiRiddle,
  'tangdouz-brain': tangdouzBrain,
  'tangdouz-brain-text': tangdouzBrainText,
  'qqsuu-naowan': qqsuuNaowan,
  'tangdouz-wenzhang': tangdouzWenzhang,
  'tangdouz-wenzhang-text': tangdouzWenzhangText,
  'meiriyiwen-random': meiriyiwenProvider('meiriyiwen-random', 'random'),
  'meiriyiwen-today': meiriyiwenProvider('meiriyiwen-today', 'today')
}

export function createProvider(id: string, fetchFn: FetchFn): IContentProvider {
  const factory = PROVIDER_FACTORIES[id]
  if (!factory) throw new Error(`unknown provider: ${id}`)
  return factory(fetchFn)
}

export function listProviderIds(): string[] {
  return Object.keys(PROVIDER_FACTORIES)
}

/** 按 Tab 配置链式尝试各 Provider，直至成功或全部失败 */
export async function fetchViaProviderChain(
  tab: LeisureReadTabId,
  settings: LeisureReadModuleSettings,
  fetchFn: FetchFn,
  signal?: AbortSignal
): Promise<LeisureReadContent> {
  const chain = resolveProviderList(tab, settings)
  const errors: string[] = []

  for (const providerId of chain) {
    try {
      const provider = createProvider(providerId, fetchFn)
      return await provider.fetch(tab, signal)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      errors.push(`${providerId}: ${msg}`)
      console.warn(`[leisure-read] provider failed: ${providerId}`, err)
    }
  }

  throw new LeisureReadFetchError(errors.join('; ') || 'all_providers_failed')
}
