import { createJsonProvider, createTextProvider } from '@modules/library/leisure-read/providers/httpProviderBase'
import { joinFooter, hashContentId, stripHtml } from '@modules/library/leisure-read/domain/types'
import type { FetchFn, ProviderFactory } from '@modules/library/leisure-read/providers/types'
import type { IContentProvider } from '@modules/library/leisure-read/providers/types'
import riddleSeed from '@modules/library/leisure-read/assets/riddle-seed.json'

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

const vvhanMiyu = createJsonProvider({
  id: 'vvhan-miyu',
  url: 'https://api.vvhan.com/api/miyu',
  tab: 'riddle',
  map: (data) => {
    const row = data as Record<string, unknown>
    const question =
      (row.question as string) ||
      (row.title as string) ||
      (row.miyu as string) ||
      (row.data as { question?: string; title?: string })?.question ||
      (row.data as { title?: string })?.title
    const answer =
      (row.answer as string) ||
      (row.result as string) ||
      (row.data as { answer?: string; result?: string })?.answer ||
      (row.data as { result?: string })?.result
    if (!question || !answer) throw new Error('missing riddle fields')
    return { body: question, answer }
  }
})

const xxapiMiyu = createJsonProvider({
  id: 'xxapi-miyu',
  url: 'https://v2.xxapi.cn/api/miyu',
  tab: 'riddle',
  map: (data) => {
    const row = data as { data?: { question?: string; answer?: string; title?: string; result?: string } }
    const item = row.data
    const question = item?.question || item?.title
    const answer = item?.answer || item?.result
    if (!question || !answer) throw new Error('missing riddle fields')
    return { body: question, answer }
  }
})

function localRiddleSeed(_fetchFn: FetchFn): IContentProvider {
  const items = riddleSeed as Array<{ question: string; answer: string }>
  return {
    id: 'local-riddle-seed',
    async fetch(tab) {
      const pick = items[Math.floor(Math.random() * items.length)]!
      return {
        tab,
        contentId: hashContentId(pick.question),
        providerId: 'local-riddle-seed',
        body: pick.question,
        answer: pick.answer
      }
    }
  }
}

function meiriyiwenProvider(id: 'meiriyiwen-random' | 'meiriyiwen-today', path: string): ProviderFactory {
  return createJsonProvider({
    id,
    url: `https://interface.meiriyiwen.com/article/${path}?dev=1`,
    tab: 'article',
    map: (data) => {
      const row = data as {
        title?: string
        author?: string
        digest?: string
        content?: string
      }
      if (!row.title && !row.content) throw new Error('missing article')
      const htmlBody = row.content ?? ''
      const plain = stripHtml(htmlBody) || row.digest || row.title || ''
      return {
        title: row.title,
        subtitle: row.author,
        body: plain,
        htmlBody: htmlBody || undefined,
        footer: row.digest && row.digest !== plain ? row.digest : undefined
      }
    }
  })
}

const PROVIDER_FACTORIES: Record<string, ProviderFactory> = {
  hitokoto,
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
  'vvhan-miyu': vvhanMiyu,
  'xxapi-miyu': xxapiMiyu,
  'local-riddle-seed': localRiddleSeed,
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
